Prerender Firebase Cache plugin
===========================
Prerender plugin to cache responses in Firebase

Run this from within your Prerender server directory:

```bash
$ npm install prerender-firebase-cache --save
```
##### server.js
```js
const prerender = require('prerender');
const firebaseCache = require('prerender-firebase-cache');
const serviceAccount = require('./serviceAccountKey.json');
const databaseURL = 'https://<yourDatabaseURL>.firebaseio.com';
const server = prerender();

server.use(firebaseCache(serviceAccount, databaseURL, '1d'));

server.start();
```
##### Test it:
```bash
curl http://localhost:3000/https://www.example.com/
```
A `GET` request will check Firebase for a cached copy. If a cached copy is found and is not expired yet, it will return that. Otherwise, it will make the request to your server and then persist the HTML to the Firebase database.

A `POST` request will skip the Firebase cache. It will make a request to your server and then persist the HTML to the Firebase database. The `POST` is meant to update the cache.

You'll need to sign up with Firebase Console and download the service account JSON file and get the database URL to pass as parameters for this plugin as example above.

Warning! Your service account JSON should be kept private and you'll be charged for all files uploaded to Firebase.

## Options

The 3rd parameter is a string represents when will the cache expire. It accepts day or hour as the unit. For example `1d` or `8h`.

## License

MIT License

Copyright (c) 2019 Johnny Bui

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
