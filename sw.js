/* Pathway service worker: keeps the app working offline. Change VERSION after every update so phones pick it up. */
var VERSION = 'pathway-v13';
var FILES = ['./', 'index.html', 'register.html', 'app.css', 'config.js', 'core.js', 'app.js', 'tracker.js', 'church.js', 'grid.js', 'admin.js', 'guide.html', 'register.js', 'forms.js', 'msg.js', 'answer.html', 'answer.js', 'calendar.js', 'events.html', 'events.js', 'shell.js', 'today.js', 'count.js', 'people2.js', 'gametpl.js', 'games.js', 'chat.js', 'play.html', 'play.js', 'host.html', 'host.js', 'lib/qrcode.js',
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

// Phone notifications: the push carries no text; we fetch the latest notice for this person and show it.
function kv(k) { return new Promise(function (res) { try { var r = indexedDB.open('pathway-kv', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { var g = r.result.transaction('kv').objectStore('kv').get(k); g.onsuccess = function () { res(g.result); }; g.onerror = function () { res(null); }; }; r.onerror = function () { res(null); }; } catch (e) { res(null); } }); }
self.addEventListener('push', function (e) {
  e.waitUntil(Promise.all([kv('token'), kv('api')]).then(function (a) {
    if (!a[0] || !a[1]) return { text: 'You have something new in Pathway', church: 'Pathway', link: '' };
    return fetch(a[1], { method: 'POST', body: JSON.stringify({ action: 'pushInbox', token: a[0] }) }).then(function (r) { return r.json(); }).catch(function () { return { text: 'You have something new in Pathway', church: 'Pathway' }; });
  }).then(function (j) {
    return self.registration.showNotification(j.church || 'Pathway', { body: j.text || 'You have something new', icon: 'img/icon-192.png', badge: 'img/icon-192.png', data: { link: j.link || '' }, tag: 'pathway', renotify: true });
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close(); var l = (e.notification.data || {}).link || '', v = l === 'chat' ? 'chat' : l === 'count' ? 'count' : /^R-/.test(l) ? 'requests' : /^A-/.test(l) ? 'away' : 'today';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (ws) { for (var i = 0; i < ws.length; i++) if ('focus' in ws[i]) { ws[i].navigate('index.html#' + v); return ws[i].focus(); } return clients.openWindow('index.html#' + v); }));
});
