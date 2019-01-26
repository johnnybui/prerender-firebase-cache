/**
 * Prerender Firebase Cache Plugin
 * @author Johnny Bui
 * @param {string} serviceAccount Firebase service account JSON
 * @param {string} databaseURL Firebase database URL
 * @param {string} cacheExp Cache expiration in hour or day. Example 8h or 1d.
 */
function firebaseCache(serviceAccount, databaseURL, cacheExp) {
  const admin = require('firebase-admin');
  let db;
  let errorMsg = '';

  // init firebase service
  if (serviceAccount && databaseURL) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: databaseURL
    });
    db = admin.database();
  } else {
    errorMsg += 'Missing service account or database URL. ';
  }

  // process cache expiration setting
  let cacheExpMS;
  if (cacheExp.endsWith('d')) {
    const days = parseInt(cacheExp);
    cacheExpMS = days * 24 * 60 * 60 * 1000;
  } else if (cacheExp.endsWith('h')) {
    const hours = parseInt(cacheExp);
    cacheExpMS = hours * 60 * 60 * 1000;
  } else {
    errorMsg += 'Invalid cache expiration. ';
  }

  // main plugin
  return {
    requestReceived: (req, res, next) => {
      if (errorMsg !== '' || req.method !== 'GET') {
        console.error(errorMsg);
        return next();
      }

      // replace invalid character for firebase key
      const reqUrl = encodeURIComponent(req.prerender.url).replace(/\./g, '_');
      db.ref(reqUrl).once(
        'value',
        snapshot => {
          if (snapshot.exists()) {
            // if cache is expired, next. Else, serve content from firebase
            const cachedAtDate = new Date(snapshot.val().cachedAt);
            const difference = new Date() - cachedAtDate;
            if (difference > cacheExpMS) {
              console.log('Cache is expired', reqUrl);
              return next();
            }

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

    pageLoaded: (req, res, next) => {
      if (errorMsg !== '' || req.prerender.statusCode !== 200) {
        console.error(errorMsg);
        return next();
      }

      // replace invalid character for firebase key and set loaded content to firebase
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
}

module.exports = firebaseCache;