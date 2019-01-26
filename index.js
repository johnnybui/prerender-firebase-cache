module.exports = (serviceAccount, databaseURL) => {
  const admin = require('firebase-admin');
  let db;

  if (serviceAccount && databaseURL) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: databaseURL
    });
    db = admin.database();
  }

  return {
    requestReceived: function(req, res, next) {
      if (!db || req.method !== 'GET') {
        return next();
      }

      const reqUrl = encodeURIComponent(req.prerender.url).replace(/\./g, '_');
      db.ref(reqUrl).once(
        'value',
        snapshot => {
          if (snapshot.exists()) {
            console.log(
              'Load from firebase cache',
              reqUrl,
              snapshot.val().cachedAt
            );
            return res.send(200, snapshot.val().content);
          } else {
            console.log('Cache not found', reqUrl);
            next();
          }
        },
        err => {
          console.error('Error getting firebase cache', err);
          next();
        }
      );
    },

    pageLoaded: function(req, res, next) {
      if (!db || req.prerender.statusCode !== 200) {
        return next();
      }

      const reqUrl = encodeURIComponent(req.prerender.url).replace(/\./g, '_');
      db.ref(reqUrl).set(
        { content: req.prerender.content, cachedAt: new Date().toISOString() },
        err => {
          if (err) {
            console.error('Error setting firebase cache', err);
          } else {
            console.log('Set new firebase cache', reqUrl);
          }

          next();
        }
      );
    }
  };
};
