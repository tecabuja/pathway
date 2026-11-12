/* Pathway chat: one-to-one messages with anyone in the church, automatic group chats (small group, unit, leaders, ushers)
   and announcements. Live while the app is open; phone notifications when it is closed. Messages are kept 12 months. */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 21 12z"/></svg>';
  var C = { ws: null, chats: [], online: [], conv: null, msgs: [], seen: 0, more: false, reply: null, typing: {}, wait: {}, rid: 0, retry: 0, q: '' };
  function origin() { try { return new URL(P.API).origin; } catch (e) { return ''; } }
  function req(m) { // over the live connection when open, otherwise a normal request
    if (C.ws && C.ws.readyState === 1) return new Promise(function (res) { m.rid = ++C.rid; C.wait[m.rid] = res; C.ws.send(JSON.stringify(m)); setTimeout(function () { if (C.wait[m.rid]) { delete C.wait[m.rid]; res({ t: 'err', m: 'No answer. Check your internet.' }); } }, 12000); });
    return fetch(origin() + '/chat', { method: 'POST', body: JSON.stringify(Object.assign({ token: P.get('token') }, m)) }).then(function (r) { return r.json(); });
  }
  function connect() {
    if (!P.app.user() || !P.online() || (C.ws && C.ws.readyState <= 1)) return;
    try { C.ws = new WebSocket(origin().replace(/^http/, 'ws') + '/ws/chat?token=' + encodeURIComponent(P.get('token') || '')); } catch (e) { return; }
    C.ws.onopen = function () { C.retry = 0; refresh(); };
    C.ws.onclose = function () { C.ws = null; if (P.app.user()) setTimeout(connect, Math.min(30000, 2000 * (++C.retry))); };
    C.ws.onmessage = function (e) {
      var m = JSON.parse(e.data);
      if (m.rid && C.wait[m.rid]) { C.wait[m.rid](m); delete C.wait[m.rid]; if (m.t !== 'msg') return; }
      if (m.t === 'online') { C.online = m.names; return; }
      if (m.t === 'typing' && m.conv === C.conv) { C.typing[m.name] = Date.now(); showTyping(); return; }
      if (m.t === 'deleted' && m.conv === C.conv) { C.msgs.forEach(function (x) { if (x.id === m.id) { x.text = '(message deleted)'; x.img = ''; } }); drawConv(); return; }
      if (m.t === 'msg') {
        if (m.conv === C.conv && $('chatlog')) { if (!C.msgs.some(function (x) { return x.id === m.msg.id; })) C.msgs.push(m.msg); drawConv(true); req({ t: 'read', conv: C.conv, id: m.msg.id }); }
        else if (m.msg.sender !== P.app.user().name) { if (navigator.vibrate) try { navigator.vibrate(20); } catch (x) {} P.toast('💬 ' + m.msg.sender + ': ' + String(m.msg.text || 'Photo').slice(0, 60)); }
        refresh();
      }
    };
  }
  function refresh() { return req({ t: 'list' }).then(function (j) { if (j.t !== 'list') return; C.chats = j.chats; C.online = j.online || C.online; P.badges = P.badges || {}; P.badges.chat = C.chats.reduce(function (t, c) { return t + c.unread; }, 0); P.app.nav(); if (P.app.view() === 'chat' && !document.querySelector('.drawer.open')) drawList(); }); }
  setInterval(function () { if (P.app.user()) { if (!C.ws) connect(); else if (C.ws.readyState !== 1) refresh(); } }, 20000);
  P.chatStart = function () { setTimeout(connect, 2000); };
  function when(t) { var d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function av(c) { return '<div class="av" style="position:relative;background:var(--teal-l);color:var(--teal)">' + (c.kind === 'dm' ? esc(T.ini(c.name)) : esc((c.name.match(/^\S+/) || ['💬'])[0])) + (c.kind === 'dm' && c.online ? '<span class="odot" style="position:absolute;right:-2px;bottom:-2px;border:2px solid var(--card)"></span>' : '') + '</div>'; }
  // ---------- list ----------
  var ROOT = null;
  P.views.chat = { title: 'Chat', icon: ICON, render: function (v) { ROOT = v; connect(); drawList(); if (!C.chats.length) refresh().catch(function (e) { v.innerHTML = '<div class="card">' + esc(e.message || 'Could not load chats') + '</div>'; }); } };
  function drawList() {
    var v = ROOT; if (!v || P.app.view() !== 'chat') return;
    var list = C.chats.filter(function (c) { return !C.q || c.name.toLowerCase().indexOf(C.q) >= 0; });
    v.innerHTML = '<div class="tools"><input class="inp" id="chq" placeholder="🔍 Search chats" value="' + esc(C.q) + '" style="flex:1"><button class="btn" data-chnew="1">＋ New chat</button></div>' +
      '<div class="card" style="padding:4px 12px">' + (list.map(function (c) {
        var l = c.last;
        return '<div class="row click" data-chopen="' + esc(c.id) + '">' + av(c) + '<div class="meta"><b>' + esc(c.name) + '</b><span>' + (l ? esc((l.sender === P.app.user().name ? 'You' : P.firstName(l.sender)) + ': ' + (l.text || '📷 Photo')).slice(0, 70) : (c.kind === 'channel' ? 'Church announcements' : 'No messages yet')) + '</span></div>' +
          '<div style="text-align:right">' + (l ? '<div class="small muted">' + when(l.t) + '</div>' : '') + (c.unread ? '<span class="tag gold">' + c.unread + '</span>' : '') + '</div></div>';
      }).join('') || '<div class="muted small" style="padding:12px">Loading chats…</div>') + '</div>' +
      '<p class="small muted">Group chats for your small group, unit, ushers and leaders are made automatically. Private chats are private: admins cannot read them. Messages are kept for 12 months. Press and hold (or right-click) a message to reply or report it.</p>';
  }
  function newChat() {
    T.openDrawer(T.dhead('New chat', 'Message anyone in the church who uses Pathway') + '<div class="db"><input class="inp" id="chpq" placeholder="🔍 Type a name"><div class="card" id="chpl" style="margin-top:10px;padding:4px 12px"><div class="muted small" style="padding:10px">Loading…</div></div></div>');
    T.api('chatPeople').then(function (j) {
      var draw = function (q) { $('chpl').innerHTML = j.people.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 80).map(function (p) { return '<div class="row click" data-chwith="' + esc(p.name) + '"><div class="av" style="position:relative">' + esc(T.ini(p.name)) + (C.online.indexOf(p.name) >= 0 ? '<span class="odot" style="position:absolute;right:-2px;bottom:-2px"></span>' : '') + '</div><div class="meta"><b>' + esc(p.name) + '</b><span>' + esc([p.title, p.unit].filter(String).join(' · ')) + '</span></div></div>'; }).join('') || '<div class="muted small" style="padding:10px">Nobody found</div>'; };
      draw(''); $('chpq').oninput = function () { draw(this.value.toLowerCase().trim()); }; $('chpq').focus();
    }).catch(function (e) { P.toast(e.message); });
  }
  // ---------- conversation ----------
  function openConv(m, title) {
    C.conv = null; C.msgs = []; C.reply = null;
    var c = m.conv ? C.chats.filter(function (x) { return x.id === m.conv; })[0] : null, name = title || (c && c.name) || m.with || 'Chat';
    var sub = c && c.kind === 'channel' ? 'Announcements' : c && c.kind === 'group' ? 'Group chat' : (C.online.indexOf(m.with || (c && c.other)) >= 0 ? '🟢 Online now' : 'Private chat');
    T.openDrawer(T.dhead(name, esc(sub)) + '<div class="db" style="display:flex;flex-direction:column;min-height:calc(100vh - 110px);padding-bottom:0"><div id="chatlog" style="flex:1"><div class="muted small" style="text-align:center;padding:20px">Loading…</div></div><div id="chtyping" class="small muted" style="height:18px"></div>' +
      (c && !c.canPost ? '<div class="small muted" style="text-align:center;padding:10px">Only leaders can post here.</div>' : '<div id="chreply"></div><div class="stickybar" style="display:flex;gap:8px;align-items:center;bottom:0"><label class="iconbtn" style="cursor:pointer" title="Send a photo">📷<input type="file" accept="image/*" id="chimg" hidden></label><input class="inp" id="chmsg" placeholder="Message" autocomplete="off" style="flex:1"><button class="btn" id="chsend" aria-label="Send">➤</button></div>') + '</div>');
    req(Object.assign({ t: 'open' }, m)).then(function (j) {
      if (j.t !== 'msgs') { $('chatlog').innerHTML = '<div class="card">' + esc(j.m || 'Could not open this chat') + '</div>'; return; }
      C.conv = j.conv; C.msgs = j.msgs; C.seen = j.seen; C.more = j.more; drawConv(true); refresh();
    });
  }
  P.openChatWith = function (name) { if (P.app.view() !== 'chat') P.app.go('chat'); openConv({ with: name }, name); };
  function drawConv(bottom) {
    var log = $('chatlog'); if (!log) return; var me = P.app.user().name, dm = /^dm:/.test(C.conv || ''), day = '', h = C.more ? '<div style="text-align:center"><button class="btn ghost sm" id="chmore">Earlier messages</button></div>' : '';
    C.msgs.forEach(function (x) {
      var d = new Date(x.t).toDateString(); if (d !== day) { day = d; h += '<div class="small muted" style="text-align:center;margin:10px 0">' + new Date(x.t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + '</div>'; }
      var mine = x.sender === me, rep = x.reply ? C.msgs.filter(function (y) { return y.id === x.reply; })[0] : null;
      h += '<div class="bub ' + (mine ? 'me' : 'them') + '" data-mid="' + x.id + '">' + (!mine && !dm ? '<b class="small" style="color:var(--teal)">' + esc(x.sender) + '</b><br>' : '') +
        (rep ? '<div class="small" style="border-left:3px solid currentColor;padding-left:6px;opacity:.75;margin-bottom:4px">' + esc(P.firstName(rep.sender)) + ': ' + esc(String(rep.text || '📷').slice(0, 60)) + '</div>' : '') +
        (x.img ? '<img src="' + P.imgUrl(x.img) + '" alt="Photo" style="max-width:100%;border-radius:10px;display:block;margin-bottom:4px">' : '') + esc(x.text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') +
        '<small>' + new Date(x.t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + (mine && dm ? (x.id <= C.seen ? ' ✓✓' : ' ✓') : '') + '</small></div>';
    });
    log.innerHTML = h || '<div class="muted small" style="text-align:center;padding:20px">Say hello 👋</div>';
    if (bottom) { var d0 = $('drawer'); d0.scrollTop = d0.scrollHeight; }
  }
  function showTyping() { var e = $('chtyping'); if (!e) return; var n = Object.keys(C.typing).filter(function (k) { return Date.now() - C.typing[k] < 4000; }); e.textContent = n.length ? n.map(P.firstName).join(', ') + ' typing…' : ''; setTimeout(showTyping, 4100); }
  function send(text, img) {
    if (!C.conv || (!text && !img)) return;
    var m = { t: 'send', conv: C.conv, text: text, img: img || '', reply: C.reply ? C.reply.id : null };
    C.reply = null; if ($('chreply')) $('chreply').innerHTML = '';
    req(m).then(function (j) { if (j.t === 'err') { P.toast(j.m); return; } if (j.msg && !C.msgs.some(function (x) { return x.id === j.msg.id; })) { C.msgs.push(j.msg); drawConv(true); } });
  }
  function menu(id) {
    var x = C.msgs.filter(function (y) { return y.id === id; })[0]; if (!x) return; var mine = x.sender === P.app.user().name;
    var c = window.prompt('Type a number:\n1 = Reply\n2 = Copy text' + (mine ? '\n3 = Delete' : '\n3 = Report to the church admins'), '1'); if (!c) return;
    if (c === '1') { C.reply = x; $('chreply').innerHTML = '<div class="small" style="background:var(--teal-l);border-radius:10px;padding:6px 10px;margin-bottom:6px">Replying to ' + esc(P.firstName(x.sender)) + ': ' + esc(String(x.text || '📷').slice(0, 60)) + ' <a href="#" data-chnoreply="1">✕</a></div>'; $('chmsg').focus(); }
    if (c === '2' && navigator.clipboard) navigator.clipboard.writeText(x.text || '').then(function () { P.toast('Copied ✓'); });
    if (c === '3' && mine) req({ t: 'delete', id: id });
    if (c === '3' && !mine && window.confirm('Report this message to the church admins?')) req({ t: 'report', id: id }).then(function () { P.toast('Reported. Thank you.'); });
  }
  var lastTyping = 0, pressT = null;
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-chopen]'))) { openConv({ conv: x.dataset.chopen }); return; }
    if (t.closest('[data-chnew]')) { newChat(); return; }
    if ((x = t.closest('[data-chwith]'))) { P.closeDrawer(true); openConv({ with: x.dataset.chwith }, x.dataset.chwith); return; }
    if (t.id === 'chsend') { var i = $('chmsg'); send(i.value.trim()); i.value = ''; i.focus(); return; }
    if (t.closest('[data-chnoreply]')) { e.preventDefault(); C.reply = null; $('chreply').innerHTML = ''; return; }
    if (t.id === 'chmore') { var first = C.msgs[0]; req({ t: 'open', conv: C.conv, before: first && first.id }).then(function (j) { if (j.t === 'msgs') { C.msgs = j.msgs.concat(C.msgs); C.more = j.more; drawConv(); } }); }
  });
  document.addEventListener('contextmenu', function (e) { var b = e.target.closest && e.target.closest('[data-mid]'); if (b) { e.preventDefault(); menu(+b.dataset.mid); } });
  document.addEventListener('pointerdown', function (e) { var b = e.target.closest && e.target.closest('[data-mid]'); if (b) pressT = setTimeout(function () { menu(+b.dataset.mid); }, 600); });
  ['pointerup', 'pointerleave', 'pointercancel', 'pointermove'].forEach(function (ev) { document.addEventListener(ev, function () { clearTimeout(pressT); }); });
  document.addEventListener('keydown', function (e) { if (e.target.id === 'chmsg') { if (e.key === 'Enter') { e.preventDefault(); $('chsend').click(); } else if (Date.now() - lastTyping > 3000 && C.ws && C.ws.readyState === 1) { lastTyping = Date.now(); C.ws.send(JSON.stringify({ t: 'typing', conv: C.conv })); } } });
  document.addEventListener('input', function (e) { if (e.target.id === 'chq') { C.q = e.target.value.toLowerCase().trim(); var y = e.target.selectionStart; drawList(); var q = $('chq'); q.focus(); q.selectionStart = q.selectionEnd = y; } });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'chimg' || !e.target.files || !e.target.files[0]) return; P.toast('Sending photo…');
    P.shrinkImage(e.target.files[0], 1200).then(function (d) { return T.api('imgPut', { data: d }); }).then(function (j) { send($('chmsg').value.trim(), j.id); $('chmsg').value = ''; }).catch(function (e2) { P.toast(e2.message || 'Could not send the photo'); });
  });
  // ---------- phone notifications ----------
  P.pushOn = function () {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { P.toast(/iPhone|iPad/.test(navigator.userAgent) ? 'On iPhone: Share › Add to Home Screen, open Pathway from there, then try again.' : 'This browser cannot show notifications.'); return; }
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { P.toast('Notifications are blocked. Allow them in your browser settings.'); return; }
      return Promise.all([navigator.serviceWorker.ready, P.call('pushKey')]).then(function (r) {
        var key = r[1].key.replace(/-/g, '+').replace(/_/g, '/'), raw = atob(key + '==='.slice((key.length + 3) % 4)), arr = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        return r[0].pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr });
      }).then(function (sub) { return T.api('pushSub', { sub: sub.toJSON() }); }).then(function () { P.set('pushOn', true); P.toast('🔔 Notifications are on for this phone'); });
    }).catch(function (e) { P.toast(e.message || 'Could not turn on notifications'); });
  };
})();
