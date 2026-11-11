/* Pathway worker app – shell, sign-in, capture convert (works offline), QR codes, saved-on-this-phone list.
   Step 2 screens (follow-ups, converts, pathway board, members, small groups, stewards) live in tracker.js. */
(function () {
  var P = window.Pathway, $ = function (id) { return document.getElementById(id); }, esc = P.esc;
  var ic = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var I = {
    add: ic('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
    qr: ic('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
    sync: ic('<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>'),
    out: ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
    more: ic('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>')
  };
  P.views = P.views || {};
  var NAV = { capture: ['Capture convert', I.add], qr: ['QR codes', I.qr], queue: ['Saved on this phone', I.sync] };
  var STAFF_NAV = ['dash', 'tasks', 'people', 'path', 'capture', 'qr', 'queue', 'members', 'groups', 'stewards', 'grid', 'requests', 'away', 'home'];
  var BY_ROLE = { 'Admin': STAFF_NAV.concat(['admin']), 'Leader': STAFF_NAV.concat(['admin']), 'Follow-up worker': ['tasks', 'people', 'capture', 'queue', 'home', 'grid', 'requests', 'away'],
    'Counsellor': ['capture', 'qr', 'queue', 'home', 'grid', 'requests', 'away'], 'Member': ['home', 'grid', 'requests', 'away'] };
  var SECT = { dash: 'Overview', members: 'Church', groups: 'Church', stewards: 'Church', grid: 'Church', requests: 'Church', away: 'Church', home: 'Church', admin: 'System' };
  var SHORT = { dash: 'Dashboard', tasks: 'Follow-ups', people: 'Converts', path: 'Board', capture: 'Capture', qr: 'QR', members: 'Members', groups: 'Groups', stewards: 'Stewards', grid: 'Grids', requests: 'Requests', away: 'Away', home: 'My space', admin: 'Admin' };
  function item(k) { return k === 'more' ? ['More', I.more] : (P.views[k] ? [P.views[k].title, P.views[k].icon] : NAV[k] || ['Welcome', '']); }
  var VIEW = null, USER = P.get('user'), QN = 0;

  // ---------- Sign-in ----------
  function showLogin(msg) {
    $('app').hidden = true; $('mnav').hidden = true; $('login').hidden = false;
    $('noApi').hidden = !!P.API; $('lerr').textContent = msg || '';
    $('ln').value = P.get('lastName', '');
    pinBoxes().forEach(function (b) { b.value = ''; });
    setTimeout(function () { ($('ln').value ? pinBoxes()[0] : $('ln')).focus(); }, 50);
    $('firstSet').hidden = true;
    if (P.API && P.online()) P.call('config').then(function (c) { $('firstSet').hidden = !c.needsSetup; }).catch(function () {});
  }
  $('mvbtn').onclick = function () {
    var name = $('mvname').value.trim(), pin = $('mvpin').value.trim();
    if (!name || !/^\d{4}$/.test(pin)) { $('lerr').textContent = 'Enter your admin name and 4-digit PIN'; return; }
    $('mvbtn').disabled = true; $('mvbtn').textContent = 'Moving… please wait';
    P.call('migrateFromSheet', { name: name, pin: pin }).then(function (j) {
      P.set('token', j.token); P.set('user', j.user); P.set('lastName', name); USER = j.user;
      if (P.clearCache) P.clearCache();
      return P.refreshConfig();
    }).then(function () { start(); P.app.go('admin'); P.toast('All data moved ✓ Welcome to the faster Pathway.'); })
      .catch(function (e) { $('lerr').textContent = e.message; }).then(function () { $('mvbtn').disabled = false; $('mvbtn').textContent = 'Move our data'; });
  };
  $('fbtn').onclick = function () {
    var code = $('fcode').value.trim(), name = $('fname').value.trim(), pin = $('fpin').value.trim();
    if (!code || !name || !/^\d{4}$/.test(pin)) { $('lerr').textContent = 'Enter the setup code, your name and a 4-digit PIN'; return; }
    $('fbtn').disabled = true;
    P.call('firstAdmin', { code: code, name: name, pin: pin }).then(function (j) {
      P.set('token', j.token); P.set('user', j.user); P.set('lastName', name); USER = j.user;
      return P.refreshConfig();
    }).then(function () { start(); P.app.go('admin'); P.toast('Welcome! You are the first admin. Start by adding your workers.'); })
      .catch(function (e) { $('lerr').textContent = e.message; }).then(function () { $('fbtn').disabled = false; });
  };
  function pinBoxes() { return [].slice.call($('pin').querySelectorAll('input')); }
  pinBoxes().forEach(function (b, i, all) {
    b.addEventListener('input', function () { b.value = b.value.replace(/\D/g, '').slice(-1); if (b.value && all[i + 1]) all[i + 1].focus(); if (i === 3 && b.value) $('loginForm').requestSubmit ? $('loginForm').requestSubmit() : doLogin(); });
    b.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !b.value && all[i - 1]) all[i - 1].focus(); });
  });
  $('loginForm').addEventListener('submit', function (e) { e.preventDefault(); doLogin(); });
  function doLogin() {
    var name = $('ln').value.trim(), pin = pinBoxes().map(function (b) { return b.value; }).join('');
    if (!name || pin.length !== 4) { $('lerr').textContent = 'Enter your name and 4-digit PIN'; return; }
    if (!P.online()) { $('lerr').textContent = 'You need internet to sign in the first time.'; return; }
    $('lbtn').disabled = true; $('lerr').textContent = '';
    P.call('login', { name: name, pin: pin }).then(function (j) {
      P.set('token', j.token); P.set('user', j.user); P.set('lastName', name); USER = j.user;
      return P.refreshConfig();
    }).then(start).catch(function (e) {
      $('lerr').textContent = e.message; pinBoxes().forEach(function (b) { b.value = ''; }); pinBoxes()[0].focus();
    }).then(function () { $('lbtn').disabled = false; });
  }
  function signOut() {
    if (!confirmBox(QN ? QN + ' capture(s) are still waiting to send. They stay on this phone and will send after you sign in again. Sign out?' : 'Sign out of Pathway on this phone?')) return;
    var t = P.get('token'); if (t && P.online()) P.call('logout', { token: t }).catch(function () {});
    if (P.clearCache) P.clearCache(); if (P.closeDrawer) P.closeDrawer();
    P.set('token', null); P.set('user', null); USER = null; VIEW = null; showLogin();
  }
  function confirmBox(m) { return window.confirm(m); }

  // ---------- Shell ----------
  function start() {
    $('login').hidden = true; $('app').hidden = false;
    var cfg = P.config(); $('churchName').textContent = cfg.church || 'The Elevation Church';
    $('me').textContent = USER.name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    $('me').title = USER.name + ' · ' + USER.role + ' · tap to sign out';
    $('sidefoot').innerHTML = esc(USER.name) + '<br><span style="opacity:.7">' + esc(USER.role) + (USER.campus ? ' · ' + esc(USER.campus) : '') + '</span>';
    var nav = BY_ROLE[USER.role] || [];
    if (nav.indexOf(VIEW) < 0 && VIEW !== 'more') VIEW = nav[0] || 'none';
    netState(); render(); trySync(); if (P.refreshBadges) setTimeout(P.refreshBadges, 800);
  }
  function navHtml() {
    var B = P.badges || {}, nav = BY_ROLE[USER.role] || [], last = null, cnt = { queue: QN, tasks: P.taskCount || 0, requests: B.decide || 0, home: (B.unread || 0) + (B.duty || 0) };
    $('sidenav').innerHTML = nav.map(function (k) {
      var l = SECT[k] || 'Convert pathway', h = '', it = item(k);
      if (l !== last) { h = '<div class="navl">' + l + '</div>'; last = l; }
      return h + '<button class="nav' + (k === VIEW ? ' on' : '') + '" data-go="' + k + '">' + it[1] + it[0] + (cnt[k] ? '<span class="ct">' + cnt[k] + '</span>' : '') + '</button>';
    }).join('') + '<div class="navl">Account</div><button class="nav" data-out="1">' + I.out + 'Sign out</button>';
    var mob = nav.length > 5 ? nav.slice(0, 4).concat(['more']) : nav;
    if (mob.indexOf('more') >= 0) cnt.more = nav.slice(4).reduce(function (t, k) { return t + (k === 'queue' ? 0 : cnt[k] || 0); }, 0);
    $('mnav').hidden = nav.length < 2;
    $('mnav').innerHTML = mob.map(function (k) {
      var it = item(k), on = k === VIEW || (k === 'more' && mob.indexOf(VIEW) < 0);
      var lbl = k === 'queue' ? 'Saved' + (QN ? ' (' + QN + ')' : '') : (SHORT[k] || it[0].split(' ')[0]) + (cnt[k] && k !== 'queue' ? ' (' + cnt[k] + ')' : '');
      return '<button class="' + (on ? 'on' : '') + '" data-go="' + k + '">' + it[1] + lbl + '</button>';
    }).join('');
  }
  function vMore() {
    var nav = BY_ROLE[USER.role] || [];
    return '<div class="card">' + nav.map(function (k) {
      var it = item(k);
      var B = P.badges || {}, n = { tasks: P.taskCount, requests: B.decide, home: (B.unread || 0) + (B.duty || 0), queue: QN }[k];
      return '<div class="row click" data-go="' + k + '"><div class="av" style="background:var(--teal-l);color:var(--teal)">' + it[1].replace('<svg', '<svg width="18" height="18"') + '</div><div class="meta"><b>' + it[0] + '</b></div>' + (n ? '<span class="tag gold">' + n + '</span>' : '') + '<span class="muted">›</span></div>';
    }).join('') + '<div class="row click" data-out="1"><div class="av">' + I.out.replace('<svg', '<svg width="18" height="18"') + '</div><div class="meta"><b>Sign out</b><span>' + esc(USER.name) + ' · ' + esc(USER.role) + '</span></div></div></div>';
  }
  P.app = {
    user: function () { return USER; }, view: function () { return VIEW; },
    go: function (k) { VIEW = k; render(); window.scrollTo(0, 0); },
    render: function () { render(); }, nav: function () { if (USER) navHtml(); },
    showLogin: function (m) { showLogin(m); }
  };
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]'); if (g) { if (P.closeDrawer) P.closeDrawer(); VIEW = g.dataset.go; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-out]') || e.target.closest('#me')) signOut();
  });
  function render() {
    navHtml();
    $('title').textContent = item(VIEW)[0];
    var v = $('view'); v.onclick = v.oninput = v.onchange = null;
    if (VIEW === 'more') { v.innerHTML = vMore(); return; }
    if (P.views[VIEW]) { P.views[VIEW].render(v); return; }
    if (VIEW === 'capture') { v.innerHTML = vCapture(); bindCapture(); }
    else if (VIEW === 'qr') { v.innerHTML = vQR(); bindQR(); }
    else if (VIEW === 'queue') { v.innerHTML = '<div class="card muted">Loading…</div>'; vQueue(); }
    else v.innerHTML = '<div class="card"><h3>Welcome, ' + esc(USER.name) + '</h3><p class="muted">Member self-service (your profile, groups, requests and away log) is coming in the next update of Pathway.</p></div>';
  }

  // ---------- Online / offline ----------
  function netState() {
    var on = P.online(); $('net').classList.toggle('off', !on); $('netl').textContent = on ? 'Online' : 'Offline';
    P.queueCount().then(function (n) { QN = n; if (USER) navHtml(); var b = $('qbanner'); if (b) b.hidden = !n; var c = $('qcount'); if (c) c.textContent = n; }).catch(function () {});
  }
  window.addEventListener('online', function () { netState(); trySync(true); if (VIEW === 'capture') render(); });
  window.addEventListener('offline', function () { netState(); if (VIEW === 'capture') render(); });
  setInterval(function () { if (USER && P.online()) trySync(); }, 60000);
  function trySync(loud) {
    if (!P.get('token')) return;
    P.sync('capture').then(function (r) {
      if (r.sent) P.toast('Back online: ' + r.sent + ' saved capture(s) sent to the church ✓');
      netState(); if (VIEW === 'queue') render();
    }).catch(function (e) {
      if (e.auth) { P.toast('Please sign in again to send the saved captures'); showLogin(e.message); }
      else if (loud) P.toast(e.message);
    });
  }

  // ---------- Capture convert ----------
  function chips(group, list, multi) {
    return '<div class="chips" data-g="' + group + '"' + (multi ? ' data-multi="1"' : '') + '>' + list.map(function (x) { return '<span class="chip" role="button" tabindex="0">' + esc(x) + '</span>'; }).join('') + '</div>';
  }
  function ccOptions(def) {
    return P.COUNTRIES.map(function (c) { return '<option value="' + c[1] + '"' + (c[1] === def ? ' selected' : '') + '>' + c[2] + ' ' + c[1] + '</option>'; }).join('');
  }
  function vCapture() {
    var cfg = P.config(), on = P.online();
    var camps = cfg.campuses.length ? cfg.campuses : ['(campuses come from the Sheet)'];
    return (on ? '' : '<div class="banner red">📴 You\'re offline. Captures are saved on this phone and will send automatically when you are back online.</div>') +
      '<div class="banner" id="qbanner"' + (QN ? '' : ' hidden') + '>⟳ <b><span id="qcount">' + QN + '</span> capture(s)</b> saved on this phone will send when you reconnect. <button class="btn sm ghost" data-go="queue">View</button></div>' +
      '<div class="card"><form class="form" id="cform" autocomplete="off">' +
      '<div class="sec full">Personal details</div>' +
      '<div class="f"><label for="cf">First name *</label><input class="inp" id="cf" autocapitalize="words"></div>' +
      '<div class="f"><label for="cl">Last name *</label><input class="inp" id="cl" autocapitalize="words"></div>' +
      '<div class="f"><label for="cp">Phone *</label><div class="phone"><select class="inp" id="cc" aria-label="Country code">' + ccOptions(cfg.defaultCC) + '</select><input class="inp" id="cp" inputmode="tel" placeholder="803 000 0000"></div>' +
      '<label class="small" style="font-weight:500;margin-top:6px"><input type="checkbox" id="cwa" checked> This number is on WhatsApp</label></div>' +
      '<div class="f"><label for="ce">Email</label><input class="inp" id="ce" type="email" placeholder="name@email.com"></div>' +
      '<div class="full warn" id="dup" hidden></div>' +
      '<div class="f"><label>Gender</label>' + chips('gender', ['Female', 'Male']) + '</div>' +
      '<div class="f"><label>Age range</label>' + chips('age', ['Under 13', '13–17', '18–24', '25–34', '35–44', '45+']) + '</div>' +
      '<div class="f"><label for="ccamp">Campus</label><select class="inp" id="ccamp">' + camps.map(function (c) { return '<option' + (c === USER.campus ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
      '<div class="f"><label for="carea">Area / neighbourhood</label><input class="inp" id="carea" placeholder="e.g. Kubwa"></div>' +
      '<div class="f"><label>Preferred contact</label>' + chips('contact', ['WhatsApp', 'Call', 'SMS', 'Email', 'Visit']) + '</div>' +
      '<div class="f"><label for="clang">Preferred language</label><select class="inp" id="clang">' + P.LANGS.map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="sec full">Decision</div>' +
      '<div class="f"><label for="csrc">Where</label><select class="inp" id="csrc">' + cfg.events.map(function (e) { return '<option value="' + esc(e.code) + '"' + (e.code === P.get('lastEvent') ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="f"><label>Decision</label>' + chips('decision', ['Salvation', 'Rededication', 'First-time guest']) + '</div>' +
      '<div class="f full"><label>How can we help? (care needs)</label>' + chips('needs', P.NEEDS, true) + '</div>' +
      '<div class="f full"><label for="cpr">Prayer request / notes <span class="muted">(visible to pastoral team only)</span></label><textarea class="inp" id="cpr" rows="2"></textarea></div>' +
      '<div class="full small"><label><input type="checkbox" id="ccon"> They agree that the church may store these details and contact them (Nigeria Data Protection Act / UK GDPR). *</label></div>' +
      '<div class="full" style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" type="button" id="cclear">Clear</button><button class="btn" type="submit" id="csave">Save convert</button></div>' +
      '</form></div>';
  }
  function chipVal(g) {
    var on = [].slice.call(document.querySelectorAll('[data-g="' + g + '"] .chip.on')).map(function (c) { return c.textContent; });
    return document.querySelector('[data-g="' + g + '"]').dataset.multi ? on : (on[0] || '');
  }
  function bindChips(root) {
    root.querySelectorAll('.chips').forEach(function (g) {
      var pick = function (e) {
        var c = e.target.closest('.chip'); if (!c) return;
        if (!g.dataset.multi) g.querySelectorAll('.chip').forEach(function (x) { if (x !== c) x.classList.remove('on'); });
        c.classList.toggle('on');
      };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(e); } });
    });
  }
  var dupTimer;
  function bindCapture() {
    bindChips($('cform'));
    $('cclear').onclick = function () { render(); };
    var check = function () {
      clearTimeout(dupTimer);
      var ph = $('cp').value.replace(/\D/g, '').replace(/^0+/, ''), w = $('dup');
      if (ph.length < 7 || !P.online() || !P.API) { w.hidden = true; return; }
      dupTimer = setTimeout(function () {
        P.call('checkPhone', { token: P.get('token'), cc: $('cc').value, phone: ph }).then(function (j) {
          if (!j.matches.length) { w.hidden = true; return; }
          w.hidden = false;
          w.innerHTML = '⚠ Possible duplicate: ' + j.matches.map(function (m) { return '<b>' + esc(m.name) + '</b> (' + esc(m.id) + (m.campus ? ', ' + esc(m.campus) : '') + ', ' + esc(m.stage) + ')'; }).join('; ') +
            ' already uses this number. You can still save; the record will be marked for checking.';
        }).catch(function () { w.hidden = true; });
      }, 600);
    };
    $('cp').addEventListener('input', check); $('cc').addEventListener('change', check);
    $('cform').addEventListener('submit', function (e) { e.preventDefault(); saveCapture(); });
  }
  function saveCapture() {
    var first = $('cf').value.trim(), last = $('cl').value.trim(), phone = $('cp').value.replace(/\D/g, '');
    if (!first || !last || phone.replace(/^0+/, '').length < 7) { P.toast('Please enter first name, last name and phone'); return; }
    if (!$('ccon').checked) { P.toast('Consent is required before saving'); return; }
    var cfg = P.config(), code = $('csrc').value, ev = cfg.events.filter(function (x) { return x.code === code; })[0] || {};
    var needs = chipVal('needs');
    var rec = {
      clientId: P.uid(), capturedAt: new Date().toISOString(), first: first, last: last, cc: $('cc').value, phone: phone,
      whatsapp: $('cwa').checked, email: $('ce').value.trim(), gender: chipVal('gender'), age: chipVal('age'),
      campus: cfg.campuses.length ? $('ccamp').value : '', area: $('carea').value.trim(), contact: chipVal('contact'), lang: $('clang').value,
      eventCode: code, source: ev.name || '', decision: chipVal('decision') || 'Salvation', needs: needs.indexOf('None') >= 0 ? [] : needs,
      prayer: $('cpr').value.trim(), consent: true
    };
    P.set('lastEvent', code);
    var btn = $('csave'); btn.disabled = true;
    var queueIt = function (why) {
      return P.queueAdd({ clientId: rec.clientId, kind: 'capture', record: rec, savedAt: rec.capturedAt, by: USER.name }).then(function () {
        P.toast(why || 'Saved on this phone. It will send when you are back online.'); netState(); render();
      });
    };
    if (!P.online() || !P.API) { queueIt(); return; }
    P.call('capture', { token: P.get('token'), records: [rec] }).then(function (j) {
      var r = j.results[0] || {};
      if (!r.ok) { P.toast(r.error || 'Not saved'); btn.disabled = false; return; }
      P.toast('Saved ✓ ' + r.id + ' · ' + (r.owner && r.owner !== 'Unassigned' ? 'assigned to ' + r.owner : 'waiting for a follow-up worker') + (r.duplicateOf ? ' · marked as possible duplicate' : ''));
      render();
    }).catch(function (e) {
      if (e.auth) { queueIt('Saved on this phone. Please sign in again to send it.').then(function () { showLogin(e.message); }); }
      else if (e.network) queueIt('Weak connection: saved on this phone and will send automatically.');
      else { P.toast(e.message); btn.disabled = false; }
    });
  }

  // ---------- QR codes ----------
  function regUrl(code) {
    var base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    return base + 'register.html?e=' + encodeURIComponent(code);
  }
  function qrSvg(text) {
    var q = qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }
  function vQR() {
    var cfg = P.config();
    return '<div class="grid g2"><div class="card" style="text-align:center"><h3 style="justify-content:center">Self-registration QR code</h3>' +
      '<p class="small muted" style="margin-top:-6px">Show it on screen at the altar call, or print it on cards for missions. Each event has its own code, so the church knows where each person came from.</p>' +
      '<select class="inp noprint" id="qev" style="max-width:320px;margin:6px auto 14px">' + cfg.events.map(function (e) { return '<option value="' + esc(e.code) + '">' + esc(e.name) + (e.campus ? ' · ' + esc(e.campus) : '') + '</option>'; }).join('') + '</select>' +
      '<div id="poster"><img src="img/logo-full.png" alt="" style="width:180px;margin:0 auto 8px;display:block"><div class="qrbox" id="qimg"></div>' +
      '<p style="font-weight:700;margin:12px 0 2px">Scan to say: “I made a decision today”</p><p class="small muted" id="qtxt" style="word-break:break-all;margin:0"></p></div>' +
      '<div class="noprint" style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn gold" id="qprint">Print poster</button><button class="btn ghost" id="qcopy">Copy link</button><a class="btn ghost" id="qopen" target="_blank" rel="noopener">Open form</a></div></div>' +
      '<div class="card noprint"><h3>How to add an event</h3><p class="small">1. In the church Sheet, open the <b>Events</b> tab.<br>2. Add a row: a short code (for example <b>KUBWA-MISSION-DEC</b>), the event name, and the campus if it belongs to one.<br>3. Set Active to <b>Yes</b>.<br>4. Sign out and back in on this phone; the event appears in the list above.</p><p class="small muted">The form works offline too: if the person\'s phone has no data, it saves and sends later.</p></div></div>';
  }
  function bindQR() {
    var draw = function () {
      var code = $('qev').value, url = regUrl(code);
      $('qimg').innerHTML = qrSvg(url); $('qtxt').textContent = url; $('qopen').href = url;
    };
    $('qev').onchange = draw; draw();
    $('qprint').onclick = function () { window.print(); };
    $('qcopy').onclick = function () {
      var t = $('qtxt').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { P.toast('Link copied'); }, function () { P.toast(t); });
    };
  }

  // ---------- Saved on this phone ----------
  function vQueue() {
    P.queueAll().then(function (all) {
      var mine = all.filter(function (x) { return x.kind === 'capture'; });
      $('view').innerHTML = '<div class="card"><h3>Saved on this phone<span class="sp"></span>' + (mine.length ? '<button class="btn sm" id="qsync">' + I.sync.replace('<svg', '<svg width="14" height="14"') + ' Send now</button>' : '') + '</h3>' +
        (mine.length ? mine.map(function (x) {
          var r = x.record;
          return '<div class="row"><div class="av">' + esc((r.first[0] || '') + (r.last[0] || '')).toUpperCase() + '</div><div class="meta"><b>' + esc(r.first + ' ' + r.last) + '</b><span>' + esc(r.cc + ' ' + r.phone) + ' · ' + esc(r.source) + ' · saved ' + new Date(x.savedAt).toLocaleString() + '</span></div><span class="tag amber">Waiting</span></div>';
        }).join('') : '<p class="muted" style="margin:0">Nothing waiting. Every capture has been sent to the church. ✓</p>') + '</div>';
      var b = $('qsync'); if (b) b.onclick = function () { if (!P.online()) { P.toast('Still offline. They will send automatically.'); return; } trySync(true); };
    });
  }

  // ---------- Start ----------
  if (USER && P.get('token')) { start(); P.refreshConfig().then(function () { if (VIEW === 'capture' && $('cf') && !$('cf').value && !$('cp').value) render(); }); }
  else showLogin();
})();
