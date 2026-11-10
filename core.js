/* Pathway core: talking to the church Sheet, the offline queue and shared helpers. */
(function () {
  var P = window.Pathway = {};
  P.API = window.PATHWAY_API || '';
  P.COUNTRIES = [['Nigeria', '+234', '🇳🇬'], ['United Kingdom', '+44', '🇬🇧'], ['United States', '+1', '🇺🇸'], ['Canada', '+1', '🇨🇦'],
    ['Ghana', '+233', '🇬🇭'], ['South Africa', '+27', '🇿🇦'], ['Kenya', '+254', '🇰🇪'], ['Ireland', '+353', '🇮🇪'], ['Other', '+', '🌍']];
  P.NEEDS = ['Prayer', 'Counselling', 'Welfare / food', 'Job support', 'Accommodation', 'Hospital visit', 'None'];
  P.LANGS = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Twi'];
  P.DEFAULT_CONFIG = {
    church: 'The Elevation Church', defaultCC: '+234', campuses: [],
    events: [{ code: 'ALTAR', name: 'Sunday altar call', campus: '' }, { code: 'MISSION', name: 'Outreach / Mission', campus: '' },
      { code: 'PRAISE', name: 'Praise Party', campus: '' }, { code: 'ONLINE', name: 'Online service', campus: 'Online' },
      { code: 'CRUSADE', name: 'Crusade', campus: '' }, { code: 'REFER', name: 'Referral', campus: '' }],
    stages: [{ n: 1, name: 'Missions / Altar Call' }]
  };

  P.get = function (k, d) { try { var v = localStorage.getItem('pw_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  P.set = function (k, v) { try { if (v == null) localStorage.removeItem('pw_' + k); else localStorage.setItem('pw_' + k, JSON.stringify(v)); } catch (e) {} };
  P.uid = function () { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  P.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  P.online = function () { return navigator.onLine !== false; };

  P.toast = function (m) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = m; t.classList.add('show'); clearTimeout(P._tt); P._tt = setTimeout(function () { t.classList.remove('show'); }, 3200);
  };

  /** Sends one request to the Apps Script web app. Plain-text body avoids browser pre-checks. */
  P.call = function (action, data) {
    if (!P.API) return Promise.reject(new Error('The app is not connected to the church Sheet yet (config.js).'));
    var body = Object.assign({ action: action }, data || {});
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
    return fetch(P.API, { method: 'POST', body: JSON.stringify(body), redirect: 'follow', signal: ctl && ctl.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); if (!j.ok) { var e = new Error(j.error || 'Something went wrong'); e.auth = j.auth; throw e; } return j; },
        function (e) { clearTimeout(timer); var x = new Error('No connection to the church server'); x.network = true; throw x; });
  };

  P.config = function () { return P.get('config', P.DEFAULT_CONFIG); };
  P.refreshConfig = function () {
    if (!P.API || !P.online()) return Promise.resolve(P.config());
    return P.call('config').then(function (c) { P.set('config', c); return c; }).catch(function () { return P.config(); });
  };

  // ---------- Offline queue (IndexedDB) ----------
  var dbp;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      var r = indexedDB.open('pathway', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('queue', { keyPath: 'clientId' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('queue', mode), s = t.objectStore('queue'), out = fn(s);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  P.queueAdd = function (item) { return tx('readwrite', function (s) { s.put(item); }); };
  P.queueAll = function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (r) { return r || []; }); };
  P.queueRemove = function (ids) { return tx('readwrite', function (s) { ids.forEach(function (id) { s.delete(id); }); }); };
  P.queueCount = function () { return P.queueAll().then(function (a) { return a.length; }); };

  /** Sends anything saved on this device. kind = 'capture' (signed-in workers) or 'register' (QR form). */
  P.sync = function (kind) {
    if (P._syncing || !P.online() || !P.API) return Promise.resolve({ sent: 0 });
    P._syncing = true;
    return P.queueAll().then(function (all) {
      var items = all.filter(function (x) { return x.kind === kind; }).slice(0, 20);
      if (!items.length) return { sent: 0 };
      var data = { records: items.map(function (x) { return x.record; }) };
      if (kind === 'capture') data.token = P.get('token');
      return P.call(kind, data).then(function (j) {
        var done = j.results.filter(function (r) { return r.ok || r.error; }).map(function (r) { return r.clientId; });
        return P.queueRemove(done).then(function () { return { sent: j.results.filter(function (r) { return r.ok; }).length, results: j.results }; });
      });
    }).then(function (r) { P._syncing = false; return r; }, function (e) { P._syncing = false; throw e; });
  };

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
