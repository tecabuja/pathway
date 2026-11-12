/* Big screen for a live game: lobby with PIN + QR, questions with a timer, live answers, leaderboard and winners' podium. */
(function () {
  var P = window.Pathway, esc = P.esc, $ = function (id) { return document.getElementById(id); }, app = $('app');
  var COLS = ['#E5533D', '#2F6FDE', '#E3A82B', '#2E9E5B'], SHAPES = ['▲', '◆', '●', '■'];
  var G = { ws: null, st: null, pin: '', key: '', game: null, off: 0, tick: null, revealed: -1, saved: false };
  var qs = new URLSearchParams(location.search), playUrl = function () { return P.appBase() + 'play.html?pin=' + G.pin; };
  function wsUrl() { var o = new URL(P.API).origin.replace(/^http/, 'ws'); return o + '/ws/game/' + G.pin; }
  function send(o) { if (G.ws && G.ws.readyState === 1) G.ws.send(JSON.stringify(o)); }
  function start() {
    var body = qs.get('tpl') ? { template: P.get('hosttpl') } : { id: qs.get('id') };
    P.call('gameStart', Object.assign({ token: P.get('token') }, body)).then(function (j) { G.pin = j.pin; G.key = j.hostKey; G.game = j.game; connect(); })
      .catch(function (e) { app.innerHTML = '<div class="center"><div class="err">' + esc(e.message) + '</div><p>Sign in to Pathway on this computer first, then try again.</p><a class="btn" href="index.html">Open Pathway</a></div>'; });
  }
  function connect() {
    var ws = G.ws = new WebSocket(wsUrl());
    ws.onopen = function () { send({ t: 'host', key: G.key, pin: G.pin, game: G.game }); };
    ws.onmessage = function (e) { var m = JSON.parse(e.data); if (m.t === 'state') { G.off = m.now - Date.now(); G.st = m; draw(); } else if (m.t === 'err') app.innerHTML = '<div class="center"><div class="err">' + esc(m.m) + '</div></div>'; };
    ws.onclose = function () { if (G.st && G.st.phase !== 'end') setTimeout(connect, 1500); };
  }
  function top(extra) { return '<div class="top"><span>' + esc(G.st.title) + '</span><span class="sp"></span><span>PIN <b>' + G.pin + '</b></span><span>👥 ' + G.st.players.length + '</span>' + (extra || '') + '<button class="btn ghost" id="fs">⛶</button></div>'; }
  function left() { var q = G.st.q; return q ? Math.max(0, Math.ceil((G.st.qStart + q.time * 1000 - (Date.now() + G.off)) / 1000)) : 0; }
  function draw() {
    clearInterval(G.tick); var s = G.st, q = s.q;
    if (s.phase === 'lobby') {
      var qr = qrcode(0, 'M'); qr.addData(playUrl()); qr.make();
      app.innerHTML = top() + '<div class="center"><div class="join">Join at <b>' + esc(playUrl().replace(/^https?:\/\//, '').replace(/\?.*$/, '')) + '</b> or scan</div><div style="display:flex;gap:4vw;align-items:center;margin:2vh 0"><div class="qr">' + qr.createSvgTag({ cellSize: 6, margin: 1, scalable: true }) + '</div><div><div class="join">Game PIN</div><div class="pin">' + G.pin.slice(0, 3) + ' ' + G.pin.slice(3) + '</div></div></div>' +
        '<div class="chips">' + s.players.map(function (p) { return '<span>' + esc(p.name) + (p.team ? ' · ' + esc(p.team) : '') + '</span>'; }).join('') + '</div><div style="margin-top:3vh"><button class="btn" id="go"' + (s.players.length ? '' : ' disabled') + '>Start game ▶ (' + s.players.length + ' players)</button></div></div>';
      return;
    }
    if (s.phase === 'question') {
      var paint = function () {
        var l = left(), pct = q.time ? l / q.time * 100 : 0, waiting = Date.now() + G.off < s.qStart;
        app.innerHTML = top('<span>Question ' + (s.qi + 1) + ' of ' + s.total + '</span>') + '<div class="center"><div style="display:flex;align-items:center;gap:3vw"><div class="ring" style="--p:' + pct + '%"><span>' + (waiting ? '…' : l) + '</span></div><div style="font-size:3vh;opacity:.85">' + s.answered + ' / ' + s.players.length + '<br>answered</div></div>' +
          (q.img ? '<img class="qimg" src="' + P.imgUrl(q.img) + '" alt="">' : '') + '<div class="qtext">' + esc(q.text) + '</div>' + opts(q, s, false) + '<div style="margin-top:2vh"><button class="btn ghost" id="skip">Show answer now</button></div></div>';
        if (!waiting && (l <= 0 || (s.answered >= s.players.length && s.players.length))) { clearInterval(G.tick); send({ t: 'reveal' }); }
      };
      paint(); G.tick = setInterval(paint, 250); return;
    }
    if (s.phase === 'reveal') {
      app.innerHTML = top('<span>Question ' + (s.qi + 1) + ' of ' + s.total + '</span>') + '<div class="center">' + (q.img ? '<img class="qimg" src="' + P.imgUrl(q.img) + '" alt="">' : '') + '<div class="qtext">' + esc(q.text) + '</div>' + opts(q, s, true) +
        '<div style="margin-top:2.4vh"><button class="btn" id="board">Leaderboard ▶</button></div></div>'; return;
    }
    if (s.phase === 'board') {
      app.innerHTML = top() + '<div class="center"><div class="qtext">Leaderboard</div><div class="lb">' + s.players.slice(0, 5).map(function (p, i) { return '<div style="animation-delay:' + i * .08 + 's"><b>' + (i + 1) + '</b><span class="n">' + esc(p.name) + (p.streak > 1 ? ' 🔥' + p.streak : '') + '</span><b>' + p.score + '</b></div>'; }).join('') + '</div>' +
        (s.teams.length ? '<div class="chips">' + s.teams.map(function (t) { return '<span>' + esc(t.team) + ': ' + t.score + '</span>'; }).join('') + '</div>' : '') +
        '<div style="margin-top:2.4vh"><button class="btn" id="next">' + (s.qi < s.total - 1 ? 'Next question ▶' : 'Show winners 🏆') + '</button></div></div>'; return;
    }
    var w = s.players, conf = ''; for (var i = 0; i < 60; i++) conf += '<i style="position:fixed;left:' + (i * 37 % 100) + 'vw;top:-4vh;width:1vh;height:1.6vh;background:' + COLS[i % 4] + ';animation:conf ' + (3 + i % 3) + 's linear ' + (i % 9 * .25) + 's infinite"></i>';
    app.innerHTML = conf + top() + '<div class="center"><div class="qtext">🏆 Winners</div><div class="pod">' + [1, 0, 2].map(function (i) { var p = w[i]; if (!p) return '<div></div>'; var h = [34, 26, 20][i]; return '<div><div style="font-size:3vh;font-weight:800">' + esc(p.name) + '</div><div style="opacity:.8;font-size:2.2vh">' + p.score + '</div><div class="blk" style="height:' + h + 'vh;background:' + ['#E3A82B', '#B8C2CC', '#C77B48'][i] + ';margin-top:1vh">' + (i + 1) + '</div></div>'; }).join('') + '</div>' +
      (s.teams.length ? '<div class="chips">Winning team: <span>' + esc(s.teams[0].team) + '</span></div>' : '') + '<div style="margin-top:3vh;display:flex;gap:1vw"><button class="btn ghost" id="again">Play again</button><a class="btn ghost" href="index.html#games">Back to Pathway</a></div></div>';
    if (!G.saved) { G.saved = true; P.call('gameEnd', { token: P.get('token'), pin: G.pin, results: s.players.map(function (p) { return { name: p.name, score: p.score, team: p.team }; }), players: s.players.length }).catch(function () {}); }
  }
  function opts(q, s, rev) {
    if (q.kind === 'type') return rev ? '<div class="qtext" style="color:#2E9E5B">✔ ' + esc(q.answers.join(' / ')) + '</div>' : '<div class="join">Type your answer on your phone</div>';
    if (q.kind === 'order') return rev ? '<div class="ans" style="grid-template-columns:1fr">' + q.items.map(function (x, i) { return '<div style="background:' + COLS[i % 4] + '"><b>' + (i + 1) + '</b>' + esc(x) + '</div>'; }).join('') + '</div>' : '<div class="join">Put these in the right order on your phone</div><div class="chips">' + (s.order || []).map(function (i) { return '<span>' + esc(q.items[i]) + '</span>'; }).join('') + '</div>';
    var list = q.kind === 'tf' ? ['True', 'False'] : q.options, total = s.counts.reduce(function (a, b) { return a + b; }, 0) || 1;
    return '<div class="ans">' + list.map(function (o, i) { var idx = q.kind === 'tf' ? (i === 0 ? 1 : 0) : i, right = q.kind === 'poll' || (q.correct || []).indexOf(idx) >= 0, n = s.counts[idx] || 0;
      return '<div class="' + (rev && !right ? 'dim' : '') + '" style="background:' + COLS[i] + '"><b>' + SHAPES[i] + '</b>' + esc(o) + (rev ? '<span class="cnt">' + (q.kind !== 'poll' && right ? '✔ ' : '') + n + '</span><i style="position:absolute;left:0;bottom:0;height:6px;width:' + (n / total * 100) + '%;background:rgba(255,255,255,.6)"></i>' : '') + '</div>'; }).join('') + '</div>';
  }
  document.addEventListener('click', function (e) {
    var id = e.target.id;
    if (id === 'go') send({ t: 'start' }); if (id === 'skip') { clearInterval(G.tick); send({ t: 'reveal' }); } if (id === 'board') send({ t: 'board' }); if (id === 'next') send({ t: 'next' });
    if (id === 'again') { send({ t: 'close' }); G = { ws: null, st: null, pin: '', key: '', game: null, off: 0, tick: null, saved: false }; start(); }
    if (id === 'fs') { if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowRight') return; var b = $('go') || $('board') || $('next'); if (b) { e.preventDefault(); b.click(); } });
  start();
})();
