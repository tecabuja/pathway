/* Pathway service worker: keeps the app working offline. Change VERSION after every update so phones pick it up. */
var VERSION = 'pathway-v6';
var FILES = ['./', 'index.html', 'register.html', 'app.css', 'config.js', 'core.js', 'app.js', 'tracker.js', 'church.js', 'grid.js', 'admin.js', 'guide.html', 'register.js', 'lib/qrcode.js',
  'manifest.webmanifest', 'img/logo-full.png', 'img/logo-mark.png', 'img/icon-192.png', 'img/icon-512.png', 'img/apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname.indexOf('script.google') >= 0 || u.hostname.indexOf('googleusercontent') >= 0) return; // live church data, never cached
  if (u.origin === location.origin) {
    // App files: answer from the phone first, refresh in the background.
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(e.request).then(function (r) { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  } else if (u.hostname.indexOf('fonts.g') >= 0) {
    e.respondWith(caches.open(VERSION + '-fonts').then(function (c) {
      return c.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (r) { c.put(e.request, r.clone()); return r; });
      });
    }));
  }
});
