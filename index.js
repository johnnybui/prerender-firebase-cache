/**
 * Prerender Firebase Cache Plugin
 * @author Johnny Bui
 * @param {string} serviceAccount Firebase service account JSON
 * @param {string} databaseURL Firebase database URL
 * @param {string} [cacheExp] Cache expiration in hour or day. Example 8h or 1d. Not set for never expire
 */
function firebaseCache(serviceAccount, databaseURL, cacheExp) {
  const admin = require('firebase-admin');
  const TimeElapsed = require('time-elapsed');
  const timer = new TimeElapsed();
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
  if (!cacheExp) {
    cacheExpMS = -1;
  } else if (cacheExp.endsWith('d')) {
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

      timer.start();
      // replace invalid character for firebase key
      const reqUrl = encodeURIComponent(req.prerender.url).replace(/\./g, '_');
      db.ref(`cache/${reqUrl}`).once(
        'value',
        snapshot => {
          if (snapshot.exists()) {
            // if cache is expired, next. Else, serve content from firebase
            const cachedAtDate = new Date(snapshot.val().cachedAt);
            const difference = new Date() - cachedAtDate;
            if (cacheExpMS !== -1 && difference > cacheExpMS) {
              console.log('Cache is expired', reqUrl);
              return next();
            }

            console.log(
              'Load from firebase cache',
              reqUrl,
              snapshot.val().cachedAt
            );
            // push crawl stats (history) to firebase
            db.ref(`crawlStats`).push({
              url: req.prerender.url,
              requestedAt: new Date().toISOString(),
              status: 200,
              cacheHit: 'Hit',
              responseTime: timer.timeElapsed()
            });
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
        if (errorMsg === '') {
          // push crawl stats (history) to firebase
          db.ref(`crawlStats`).push({
            url: req.prerender.url,
            requestedAt: new Date().toISOString(),
            status: req.prerender.statusCode || 504,
            cacheHit: 'Miss',
            responseTime: timer.timeElapsed()
          });
        }
        return next();
      }

      // replace invalid character for firebase key and set loaded content to firebase
      const reqUrl = encodeURIComponent(req.prerender.url).replace(/\./g, '_');
      db.ref(`cache/${reqUrl}`).set(
        {
          content: req.prerender.content,
          cachedAt: new Date().toISOString(),
          url: req.prerender.url
        },
        err => {
          if (err) {
            console.error('Error setting firebase cache', err);
          } else {
            console.log('Set new firebase cache', reqUrl);
          }
        }
      );
      // push crawl stats (history) to firebase
      db.ref(`crawlStats`).push({
        url: req.prerender.url,
        requestedAt: new Date().toISOString(),
        status: req.prerender.statusCode,
        cacheHit: 'Miss',
        responseTime: timer.timeElapsed()
      });
      next();
    }
  };
}

module.exports = firebaseCache;
