/* Pathway shell (step 9): phone back button, notification bell, quick-action (+) button, appearance (theme), online presence,
   and the "Forgot PIN / First time" flow on the sign-in screen. */
(function () {
  var P = window.Pathway, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var T = function () { return P.T; };
  // ---------- appearance ----------
  var THEMES = { 'Teal & Gold': ['#2E7770', '#1F5A54', '#C9A24A'], Royal: ['#2F4FA2', '#1E3578', '#E0A526'], Wine: ['#7A2E4A', '#561F33', '#D9A441'], Forest: ['#2F6B3B', '#1F4D29', '#C98B2B'], Midnight: ['#3A4A7A', '#232E52', '#9FB4FF'] };
  function th() { return P.get('theme', { mode: 'Auto', col: 'Teal & Gold', big: false, motion: true }); }
  P.applyTheme = function () {
    var t = th(), c = THEMES[t.col] || THEMES['Teal & Gold'], r = document.documentElement;
    var dark = t.mode === 'Dark' || (t.mode === 'Auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    r.style.setProperty('--teal', c[0]); r.style.setProperty('--teal-d', c[1]); r.style.setProperty('--gold', c[2]);
    r.classList.toggle('dark', dark); r.classList.toggle('bigtext', !!t.big); r.classList.toggle('still', t.motion === false);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', dark ? '#121816' : c[1]);
  };
  P.applyTheme();
  if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', P.applyTheme); } catch (e) {}
  function acctSheet() {
    var t = th(), u = P.app.user() || {};
    T().openDrawer(T().dhead(u.name || 'Account', esc((u.ltype || u.title || u.role || '') + (u.campus ? ' · ' + u.campus : ''))) + '<div class="db">' +
      '<div class="card"><h3>Appearance</h3><div class="small muted" style="margin-bottom:6px">Light or dark</div><div class="seg" style="margin-bottom:12px">' + ['Light', 'Dark', 'Auto'].map(function (m) { return '<button class="' + (t.mode === m ? 'on' : '') + '" data-thm="' + m + '">' + m + '</button>'; }).join('') + '</div>' +
      '<div class="small muted" style="margin-bottom:6px">Colour style</div><div>' + Object.keys(THEMES).map(function (k) { return '<button class="swatch' + (t.col === k ? ' on' : '') + '" title="' + k + '" aria-label="' + k + '" data-thc="' + k + '" style="background:linear-gradient(135deg,' + THEMES[k][0] + ' 60%,' + THEMES[k][2] + ' 60%)"></button>'; }).join('') + '</div>' +
      '<label class="chk"><input type="checkbox" id="thbig"' + (t.big ? ' checked' : '') + '> Larger text</label><label class="chk"><input type="checkbox" id="thmot"' + (t.motion !== false ? ' checked' : '') + '> Animations (greeting scene)</label></div>' +
      '<div class="card"><h3>Privacy</h3><label class="chk"><input type="checkbox" id="hideon"' + (P.get('hideOnline') ? ' checked' : '') + '> Hide my online status (Super Admins can still see it)</label></div>' +
      '<div class="card"><h3>Phone notifications</h3><p class="small muted" style="margin-top:-4px">Get notices even when Pathway is closed. On iPhone, first add Pathway to your Home Screen (Share › Add to Home Screen).</p><button class="btn sm" id="pushon">Turn on notifications</button></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-chpin="1">Change my PIN</button><span class="sp" style="flex:1"></span><button class="btn ghost" data-out="1" style="color:var(--red)">Sign out</button></div></div>');
  }
  // ---------- bell ----------
  function linkTo(l) {
    l = String(l || '');
    if (/^https?:/.test(l)) return { href: l };
    if (/^R-/.test(l)) return { go: 'requests' }; if (/^A-/.test(l)) return { go: 'away' };
    if (l === 'pins') return { admin: 'pins' };
    var m = { count: 'count', insights: 'count', messages: 'messages', chat: 'chat', games: 'games', calendar: 'calendar' }[l];
    return { go: m || 'home' };
  }
  function bell() {
    T().openDrawer(T().dhead('Notifications', 'Tap one to open it') + '<div class="db" id="bellbox"><div class="card muted">Loading…</div></div>');
    T().api('notes').then(function (j) {
      $('bellbox').innerHTML = (j.notes.map(function (n) { var L = linkTo(n.link); return '<div class="card click act" ' + (L.href ? 'data-href="' + esc(L.href) + '"' : L.admin ? 'data-admin="' + L.admin + '"' : 'data-go="' + L.go + '"') + ' style="' + (n.read ? '' : 'border-left:4px solid var(--gold)') + '"><div><b style="font-size:14px;font-weight:' + (n.read ? 500 : 700) + '">' + esc(n.text) + '</b><span class="small muted">' + T().fmt(n.time) + '</span></div></div>'; }).join('') || '<div class="card muted">Nothing new</div>');
      P.badges.unread = 0; setBell(); if (P.app.nav) P.app.nav();
    }).catch(function (e) { $('bellbox').innerHTML = '<div class="card">' + esc(e.message) + '</div>'; });
  }
  function setBell() { var n = (P.badges && P.badges.unread) || 0, b = $('bellct'); if (!b) return; b.hidden = !n; b.textContent = n > 9 ? '9+' : n; }
  setInterval(setBell, 3000);
  // ---------- quick actions (+) ----------
  function fab() {
    var u = P.app.user() || {}, tk = u.ticks || [], A = [];
    if (['Admin', 'Leader', 'Follow-up worker', 'Counsellor'].indexOf(u.role) >= 0) A.push(['➕', 'Capture convert', 'capture']);
    if (tk.indexOf('Usher') >= 0 || tk.indexOf('Head usher') >= 0 || u.role === 'Admin') A.push(['🔢', 'Count', 'count']);
    if (u.role === 'Admin' || u.role === 'Leader') A.push(['💬', 'New message', 'messages'], ['🗳️', 'New poll', 'forms'], ['🗓️', 'Add event', 'calendar']);
    A.push(['✈️', 'Log away', 'away'], ['✅', 'Ask permission', 'requests'], ['💭', 'Chat', 'chat']);
    T().openDrawer(T().dhead('Quick actions', 'What would you like to do?') + '<div class="db"><div class="tiles">' + A.map(function (a) { return '<button class="tile" data-go="' + a[2] + '"><span style="font-size:26px">' + a[0] + '</span><span>' + a[1] + '</span></button>'; }).join('') + '</div></div>');
  }
  // ---------- back button and history ----------
  window.addEventListener('popstate', function (e) {
    var d = $('drawer'); if (d && d.classList.contains('open')) { P.closeDrawer(true); return; }
    var v = (location.hash || '').slice(1).split('/')[0]; if (v && P.app && P.app.user()) P.app.show(v);
  });
  function backVis() { var b = $('backbtn'), f = $('fab'); if (b && P.app && P.app.user()) { b.hidden = P.app.view() === P.app.home(); if (f) f.hidden = ['count', 'chat', 'games'].indexOf(P.app.view()) >= 0; } }
  setInterval(backVis, 500);
  // ---------- presence (who's online) ----------
  function ping() {
    if (!P.app || !P.app.user() || !P.online() || document.hidden) return;
    var dev = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'App' : 'Web';
    P.call('ping', { token: P.get('token'), dev: dev }).catch(function () {});
  }
  setInterval(ping, 150000); document.addEventListener('visibilitychange', function () { if (!document.hidden) ping(); });
  P.shellStart = function () {
    $('fab').hidden = false; setTimeout(ping, 1500); if (P.refreshBadges) setTimeout(P.refreshBadges, 900); if (P.chatStart) P.chatStart();
    try { var r = indexedDB.open('pathway-kv', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; // lets phone notifications find the latest notice
      r.onsuccess = function () { var tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(P.get('token'), 'token'); tx.objectStore('kv').put(P.API, 'api'); }; } catch (e) {}
  };
  // ---------- taps ----------
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if (t.closest('#me') || t.closest('[data-acct]')) { e.preventDefault(); acctSheet(); return; }
    if (t.closest('#bell')) { bell(); return; }
    if (t.closest('#fab')) { fab(); return; }
    if (t.closest('#backbtn')) { history.back(); return; }
    if ((x = t.closest('[data-href]'))) { window.open(x.dataset.href, '_blank'); return; }
    if ((x = t.closest('[data-thm]')) || (x = t.closest('[data-thc]'))) {
      var v = th(); if (x.dataset.thm) v.mode = x.dataset.thm; else v.col = x.dataset.thc; P.set('theme', v); P.applyTheme();
      [].forEach.call(document.querySelectorAll(x.dataset.thm ? '[data-thm]' : '[data-thc]'), function (b) { b.classList.toggle('on', b === x); }); return;
    }
    if (t.id === 'pushon') { if (P.pushOn) P.pushOn(); else P.toast('Phone notifications arrive with the next update'); return; }
    if (t.id === 'forgot' || t.id === 'firsttime') { e.preventDefault(); pinFlow('start'); return; }
    if ((x = t.closest('[data-pf]'))) { e.preventDefault(); pinFlow(x.dataset.pf); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'thbig' || t.id === 'thmot') { var v = th(); if (t.id === 'thbig') v.big = t.checked; else v.motion = t.checked; P.set('theme', v); P.applyTheme(); }
    if (t.id === 'hideon') { P.set('hideOnline', t.checked); T().api('privacy', { hide: t.checked }).then(function () { P.toast(t.checked ? 'Your online status is hidden' : 'Your online status is visible'); }).catch(function (e2) { P.toast(e2.message); }); }
  });
  // ---------- Forgot PIN / first time (on the sign-in screen) ----------
  var PF = P.get('pinreq', null), PFT = null;
  function pinFlow(step) {
    var box = $('pinflow'), form = $('loginForm'); if (!box) return;
    box.hidden = false; [].forEach.call(form.children, function (c) { if (c !== box) c.style.display = step === 'close' ? '' : 'none'; });
    clearInterval(PFT);
    if (step === 'close') { box.hidden = true; box.innerHTML = ''; return; }
    var back = '<div style="text-align:center;margin-top:12px"><a href="#" data-pf="close">Back to sign in</a></div>';
    if (step === 'start') {
      box.innerHTML = '<b style="font-size:17px">Let’s check it’s you</b><p class="small muted" style="margin:4px 0 12px">Type your name and phone number as the church has them. Then we email you a code, or your leader approves you.</p>' +
        '<input class="inp" id="pfname" placeholder="Your full name" autocomplete="name"><input class="inp" id="pfphone" placeholder="Phone number" inputmode="tel" autocomplete="tel" style="margin-top:8px"><div class="err" id="pferr"></div>' +
        '<button class="btn" type="button" data-pf="send" style="width:100%;margin-top:10px">Continue</button>' + (PF ? '<div style="text-align:center;margin-top:10px"><a href="#" data-pf="' + (PF.via === 'email' ? 'code' : 'wait') + '">Continue my earlier request</a></div>' : '') + back;
      setTimeout(function () { $('pfname').focus(); }, 50); return;
    }
    if (step === 'send') {
      var n = $('pfname').value.trim(), ph = $('pfphone').value.trim(); if (!n || ph.replace(/\D/g, '').length < 7) { $('pferr').textContent = 'Enter your name and phone number'; return; }
      P.call('pinHelp', { name: n, phone: ph }).then(function (j) { PF = { id: j.id, secret: j.secret, via: j.via, to: j.to || '' }; P.set('pinreq', PF); pinFlow(j.via === 'email' ? 'code' : 'wait'); })
        .catch(function (e) { $('pferr').textContent = e.message; }); return;
    }
    if (step === 'code') {
      box.innerHTML = '<div style="text-align:center"><div style="font-size:34px">📧</div><b>We emailed a 6-digit code to ' + esc(PF.to || 'your email') + '</b><input class="inp" id="pfcode" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="margin-top:12px;text-align:center;font-size:22px;letter-spacing:.2em"><div class="err" id="pferr"></div>' +
        '<button class="btn" type="button" data-pf="check" style="width:100%;margin-top:10px">Check code</button><p class="small muted">No email? <a href="#" data-pf="start">Start again</a> and ask your leader instead.</p></div>' + back; return;
    }
    if (step === 'check') { P.call('pinCode', { id: PF.id, secret: PF.secret, code: $('pfcode').value.trim() }).then(function () { pinFlow('newpin'); }).catch(function (e) { $('pferr').textContent = e.message; }); return; }
    if (step === 'wait') {
      box.innerHTML = '<div style="text-align:center"><div style="font-size:34px">⏳</div><b>Request sent to your leader and the Super Admins</b><p class="small muted">They may call you to confirm it’s really you. Keep this page open, or come back later: it continues by itself.</p><div class="small" id="pfst">Waiting…</div></div>' + back;
      var poll = function () { P.call('pinStatus', { id: PF.id, secret: PF.secret }).then(function (j) { if (j.status === 'Approved') pinFlow('newpin'); else if (j.status === 'Declined') { $('pfst').textContent = 'Your request was declined. Please speak to your leader.'; P.set('pinreq', null); clearInterval(PFT); } }).catch(function () {}); };
      poll(); PFT = setInterval(poll, 15000); return;
    }
    if (step === 'newpin') {
      box.innerHTML = '<div style="text-align:center"><div style="font-size:34px">🔑</div><b>Choose your 4-digit PIN</b><p class="small muted">Only you should know it.</p><input class="inp" id="pfpin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" style="text-align:center;font-size:24px;letter-spacing:.4em">' +
        '<input class="inp" id="pfpin2" type="password" inputmode="numeric" maxlength="4" placeholder="Type it again" style="text-align:center;margin-top:8px"><div class="err" id="pferr"></div><button class="btn" type="button" data-pf="save" style="width:100%;margin-top:10px">Save and sign in</button></div>'; return;
    }
    if (step === 'save') {
      var a = $('pfpin').value.trim(), b2 = $('pfpin2').value.trim(); if (!/^\d{4}$/.test(a)) { $('pferr').textContent = 'Use 4 digits'; return; } if (a !== b2) { $('pferr').textContent = 'The two PINs are different'; return; }
      P.call('pinSet', { id: PF.id, secret: PF.secret, pin: a }).then(function (j) { P.set('pinreq', null); P.set('token', j.token); P.set('user', j.user); P.set('lastName', j.user.name); location.hash = ''; location.reload(); })
        .catch(function (e) { $('pferr').textContent = e.message; });
    }
  }
})();
