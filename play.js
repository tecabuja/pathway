/* Phone view for a live game: join with the PIN and a nickname, answer, see points and your place. No sign-in needed. */
(function () {
  var P = window.Pathway, esc = P.esc, app = document.getElementById('app');
  var COLS = ['#E5533D', '#2F6FDE', '#E3A82B', '#2E9E5B'], SHAPES = ['▲', '◆', '●', '■'];
  var pin = (new URLSearchParams(location.search).get('pin') || '').replace(/\D/g, ''), G = { ws: null, st: null, pid: '', off: 0, ord: null, sent: -1, tick: null, err: '' };
  function key() { return 'game_' + pin; }
  function send(o) { if (G.ws && G.ws.readyState === 1) G.ws.send(JSON.stringify(o)); }
  function joinForm(msg) {
    var u = P.get('user'), nick = P.get('nick') || (u ? P.firstName(u.name) : '');
    app.innerHTML = '<div style="text-align:center;margin:20px 0"><div style="font-size:46px">🎮</div><div class="mid">Join the game</div></div><div class="card">' + (msg ? '<div style="color:#C0392B;font-weight:700;text-align:center;margin-bottom:10px">' + esc(msg) + '</div>' : '') +
      '<input class="inp" id="pin" inputmode="numeric" maxlength="6" placeholder="Game PIN" value="' + esc(pin) + '" style="letter-spacing:.2em;font-weight:800">' +
      '<input class="inp" id="nick" maxlength="20" placeholder="Your nickname" value="' + esc(nick) + '" style="margin-top:10px"><button class="btn" id="go">Let’s go!</button><div style="font-size:12px;color:#888;text-align:center;margin-top:10px">Keep it friendly: nicknames are checked.</div></div>';
    document.getElementById('go').onclick = function () {
      pin = document.getElementById('pin').value.replace(/\D/g, ''); var n = document.getElementById('nick').value.trim();
      if (pin.length !== 6) return joinForm('Type the 6-digit PIN'); if (!n) return joinForm('Type a nickname');
      P.set('nick', n); P.call('gamePin', { pin: pin }).then(function () { history.replaceState(null, '', '?pin=' + pin); connect(n); }).catch(function (e) { joinForm(e.message); });
    };
  }
  function connect(nick) {
    G.pid = sessionStorage.getItem(key()) || '';
    var ws = G.ws = new WebSocket(new URL(P.API).origin.replace(/^http/, 'ws') + '/ws/game/' + pin);
    ws.onopen = function () { send({ t: 'join', name: nick || P.get('nick'), pid: G.pid }); };
    ws.onmessage = function (e) {
      var m = JSON.parse(e.data);
      if (m.t === 'joined') { G.pid = m.pid; sessionStorage.setItem(key(), m.pid); return; }
      if (m.t === 'err') { G.err = m.m; sessionStorage.removeItem(key()); try { ws.close(); } catch (x) {} return joinForm(m.m); }
      if (m.t === 'closed') { app.innerHTML = '<div class="card" style="text-align:center"><b>The game has ended.</b><p>Thanks for playing!</p></div>'; return; }
      if (m.t === 'late') { app.insertAdjacentHTML('afterbegin', '<div class="card" style="text-align:center">⏱ Too late for that one</div>'); return; }
      if (m.t === 'state') { G.off = m.now - Date.now(); if (!G.st || G.st.qi !== m.qi) G.ord = null; G.st = m; draw(); }
    };
    ws.onclose = function () { if (!G.err && G.st && G.st.phase !== 'end') setTimeout(function () { connect(nick); }, 1500); };
  }
  function head() { var me = G.st.me || {}; return '<div class="top"><span>' + esc(me.name || '') + (me.team ? ' · ' + esc(me.team) : '') + '</span><span>' + (me.score || 0) + ' pts</span></div>'; }
  function draw() {
    clearInterval(G.tick); var s = G.st, q = s.q, me = s.me || {};
    if (s.teamsOn && !me.team && s.phase === 'lobby') { app.innerHTML = head() + '<div class="mid" style="margin:20px 0">Choose your team</div>' + s.teamNames.map(function (t, i) { return '<button class="btn" data-team="' + esc(t) + '" style="background:' + COLS[i % 4] + ';color:#fff">' + esc(t) + '</button>'; }).join(''); return; }
    if (s.phase === 'lobby') { app.innerHTML = head() + '<div class="res" style="margin-top:30px"><div class="big">✅</div><div class="mid">You’re in!</div><p class="small">Look at the big screen. The game starts soon.</p></div>'; return; }
    if (s.phase === 'question' && q) {
      if (s.answered) { app.innerHTML = head() + '<div class="res" style="margin-top:30px"><div class="big">⏳</div><div class="mid">Answer locked in!</div><p class="small">Waiting for everyone else…</p></div>'; return; }
      var wait = Date.now() + G.off < s.qStart;
      if (wait) { app.innerHTML = head() + '<div class="res" style="margin-top:30px"><div class="mid">Question ' + (s.qi + 1) + ' of ' + s.total + '</div><p class="small">Get ready…</p></div>'; G.tick = setTimeout(draw, Math.max(100, s.qStart - Date.now() - G.off)); return; }
      var body = '';
      if (q.kind === 'choice' || q.kind === 'poll') body = '<div class="ans">' + q.options.map(function (o, i) { return '<button style="background:' + COLS[i] + '" data-a="' + i + '"><b>' + SHAPES[i] + '</b>' + esc(o) + '</button>'; }).join('') + '</div>';
      if (q.kind === 'tf') body = '<div class="ans"><button style="background:' + COLS[0] + '" data-a="1"><b>' + SHAPES[0] + '</b>True</button><button style="background:' + COLS[1] + '" data-a="0"><b>' + SHAPES[1] + '</b>False</button></div>';
      if (q.kind === 'type') body = '<div class="card"><input class="inp" id="typed" maxlength="60" placeholder="Type your answer" autocomplete="off"><button class="btn" id="sendtyped">Send</button></div>';
      if (q.kind === 'order') { G.ord = G.ord || q.items.map(function (x, i) { return i; }); body = '<div class="ord">' + G.ord.map(function (i, k) { return '<div><b>' + (k + 1) + '</b><span>' + esc(q.items[i]) + '</span><button data-up="' + k + '" aria-label="Move up">↑</button><button data-dn="' + k + '" aria-label="Move down">↓</button></div>'; }).join('') + '</div><button class="btn" id="sendord">Send my order</button>'; }
      app.innerHTML = head() + '<div class="small" style="margin-bottom:6px">Question ' + (s.qi + 1) + ' of ' + s.total + ' · <span id="tl"></span></div>' + (q.img ? '<img src="' + P.imgUrl(q.img) + '" alt="" style="width:100%;max-height:200px;object-fit:contain;border-radius:14px;margin-bottom:8px">' : '') + '<div class="card mid" style="font-size:18px">' + esc(q.text) + '</div>' + body;
      var tl = function () { var l = Math.max(0, Math.ceil((s.qStart + q.time * 1000 - Date.now() - G.off) / 1000)), e = document.getElementById('tl'); if (e) e.textContent = l + 's left'; };
      tl(); G.tick = setInterval(tl, 250); return;
    }
    if (s.phase === 'reveal') {
      var r = s.result || {};
      if (r.poll) app.innerHTML = head() + '<div class="res" style="background:rgba(255,255,255,.15);margin-top:30px"><div class="big">🙌</div><div class="mid">Thanks for voting!</div></div>';
      else app.innerHTML = head() + '<div class="res" style="background:' + (r.correct ? '#2E9E5B' : '#E5533D') + ';margin-top:30px"><div class="big">' + (r.missed ? '⏱' : r.correct ? '✅' : '❌') + '</div><div class="mid">' + (r.missed ? 'Time’s up!' : r.correct ? 'Correct! +' + r.pts : 'Not this time') + '</div>' +
        (s.answerText && !r.correct ? '<p class="small">Answer: ' + esc(s.answerText) + '</p>' : '') + (me.streak > 1 ? '<p class="small">🔥 ' + me.streak + ' in a row</p>' : '') + '<p class="small">You are ' + ord(me.rank) + ' of ' + me.of + '</p></div>';
      return;
    }
    if (s.phase === 'board') { app.innerHTML = head() + '<div class="res" style="margin-top:30px"><div class="big">' + (me.rank <= 3 ? ['🥇', '🥈', '🥉'][me.rank - 1] : '📊') + '</div><div class="mid">You are ' + ord(me.rank) + '</div><p class="small">' + (me.score || 0) + ' points · look at the big screen</p></div>'; return; }
    app.innerHTML = head() + '<div class="res" style="margin-top:20px"><div class="big">' + (me.rank <= 3 ? ['🥇', '🥈', '🥉'][me.rank - 1] : '🎉') + '</div><div class="mid">You finished ' + ord(me.rank) + '!</div><p class="small">' + (me.score || 0) + ' points</p></div>' +
      '<div class="card">' + (s.top || []).map(function (p, i) { return '<div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700"><span>' + (i + 1) + '. ' + esc(p.name) + '</span><span>' + p.score + '</span></div>'; }).join('') + '</div><a class="btn" style="display:block;text-align:center;text-decoration:none" href="index.html">Open Pathway</a>';
  }
  function ord(n) { n = n || 0; return n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.team) { send({ t: 'team', team: t.dataset.team }); return; }
    if (t.dataset.a != null) { if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) {} send({ t: 'ans', a: +t.dataset.a }); return; }
    if (t.id === 'sendtyped') { var v = document.getElementById('typed').value.trim(); if (v) send({ t: 'ans', a: v }); return; }
    if (t.dataset.up != null || t.dataset.dn != null) { var k = +(t.dataset.up != null ? t.dataset.up : t.dataset.dn), j = t.dataset.up != null ? k - 1 : k + 1; if (j >= 0 && j < G.ord.length) { var x = G.ord[k]; G.ord[k] = G.ord[j]; G.ord[j] = x; draw(); } return; }
    if (t.id === 'sendord') send({ t: 'ans', a: G.ord });
  });
  if (pin.length === 6 && P.get('nick')) P.call('gamePin', { pin: pin }).then(function () { connect(P.get('nick')); }).catch(function (e) { joinForm(e.message); }); else joinForm();
})();
