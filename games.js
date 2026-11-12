/* Pathway: live games. Make a quiz (or start from a template), host it on the big screen, and people join with a PIN. */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="6"/><path d="M6 12h4M8 10v4"/><circle cx="15.5" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg>';
  var KINDS = [['choice', 'Multiple choice'], ['tf', 'True or false'], ['type', 'Type the answer'], ['order', 'Put in order'], ['poll', 'Poll (no score)']];
  var TAB = 'play', DATA = null, ED = null;
  function canHost() { var u = T.user(); return u.role === 'Admin' || u.role === 'Leader' || (u.ticks || []).indexOf('Can host games') >= 0; }
  P.imgUrl = function (id) { try { return new URL(P.API).origin + '/img/' + encodeURIComponent(id); } catch (e) { return ''; } };
  /** Shrinks a photo on the phone before upload (max 900px, JPEG). */
  P.shrinkImage = function (file, max) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onerror = rej; r.onload = function () { var im = new Image(); im.onerror = rej; im.onload = function () {
        var s = Math.min(1, (max || 900) / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.75)); }; im.src = r.result; }; r.readAsDataURL(file);
    });
  };
  P.views.games = { title: 'Games', icon: ICON, render: function (v) {
    var host = canHost(), live = ((T.saved('today') || {}).games || []);
    var join = '<div class="card" style="text-align:center;background:linear-gradient(135deg,#5B3C88,#E0607E);color:#fff;border:0"><div style="font-size:30px">🎮</div><b style="font-size:18px">Join a game</b><div class="small" style="opacity:.9;margin:4px 0 10px">Type the PIN shown on the big screen</div>' +
      '<div style="display:flex;gap:8px;max-width:320px;margin:0 auto"><input class="inp" id="gpin" inputmode="numeric" maxlength="6" placeholder="PIN" style="text-align:center;font-size:20px;letter-spacing:.2em"><button class="btn gold" data-gjoin="1">Join</button></div>' +
      (live.length ? '<div style="margin-top:12px">' + live.map(function (g) { return '<a class="btn sm" style="background:rgba(255,255,255,.2);margin:4px" href="play.html?pin=' + esc(g.pin) + '">Live: ' + esc(g.title) + ' · ' + esc(g.pin) + '</a>'; }).join('') + '</div>' : '') + '</div>';
    if (!host) { v.innerHTML = join + '<p class="small muted" style="text-align:center">Games are hosted by the media or youth team. Ask an admin to tick “Can host games” for you to make your own.</p>'; return; }
    v.innerHTML = '<div class="seg" style="margin-bottom:12px">' + [['play', 'Play'], ['mine', 'My games'], ['tpl', 'Templates'], ['res', 'Results']].map(function (t) { return '<button class="' + (TAB === t[0] ? 'on' : '') + '" data-gtab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div id="gbox"></div>';
    var box = $('gbox');
    if (TAB === 'play') { box.innerHTML = join + '<div class="card"><b>Host a game</b><p class="small muted">Open Pathway on the laptop connected to the projector, choose a game and tap <b>Host on big screen</b>. People scan the QR code or type the PIN; no sign-in needed.</p><button class="btn" data-gtab="tpl">Pick a game</button></div>'; return; }
    if (TAB === 'tpl') { box.innerHTML = '<div class="grid g2">' + (window.PATHWAY_GAME_TEMPLATES || []).map(function (t, i) { return '<div class="card"><div style="font-size:28px">' + t.icon + '</div><b>' + esc(t.title) + '</b><div class="small muted">' + t.questions.length + ' questions</div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm" data-ghosttpl="' + i + '">Host on big screen</button><button class="btn ghost sm" data-gcopy="' + i + '">Copy and edit</button></div></div>'; }).join('') + '</div>'; return; }
    box.innerHTML = '<div class="card muted">Loading…</div>';
    T.api('gamesList').then(function (d) {
      DATA = d;
      if (TAB === 'mine') box.innerHTML = '<div class="tools"><span class="sp" style="flex:1"></span><button class="btn" data-gnew="1">+ New game</button></div>' + (d.games.length ? '<div class="grid g2">' + d.games.map(function (g) { return '<div class="card"><b>' + esc(g.title) + '</b><div class="small muted">' + g.questions.length + ' questions · by ' + esc(g.owner) + ' · played ' + g.plays + '×</div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm" data-ghost="' + esc(g.id) + '">Host on big screen</button><button class="btn ghost sm" data-gedit="' + esc(g.id) + '">Edit</button></div></div>'; }).join('') + '</div>' : '<div class="card muted">No games yet. Start from a template or make a new one.</div>');
      else box.innerHTML = d.history.map(function (h) { return '<div class="card"><b>' + esc(h.title) + '</b><div class="small muted">' + T.fmt(h.started) + ' · ' + h.players + ' players · hosted by ' + esc(h.host) + '</div>' + h.results.slice(0, 3).map(function (r, i) { return '<div class="small">' + ['🥇', '🥈', '🥉'][i] + ' ' + esc(r.name) + ' · ' + r.score + '</div>'; }).join('') + '</div>'; }).join('') || '<div class="card muted">No games played yet.</div>';
    }).catch(function (e) { T.fail(box, e); });
  } };
  // ---------- editor ----------
  function openEditor(g) {
    ED = JSON.parse(JSON.stringify(g || { title: '', questions: [{ kind: 'choice', text: '', options: ['', '', '', ''], correct: [0], time: 20 }], settings: {} }));
    ED.settings = ED.settings || {}; drawEditor(true);
  }
  function qCard(q, i) {
    var opt = function (o, j) { return '<div style="display:flex;gap:6px;align-items:center;margin:4px 0"><label title="Right answer" style="display:flex;align-items:center"><input type="checkbox" data-gc="' + i + ',' + j + '"' + ((q.correct || []).indexOf(j) >= 0 ? ' checked' : '') + (q.kind === 'poll' ? ' disabled' : '') + '></label><input class="inp" data-go2="' + i + ',' + j + '" value="' + esc(o) + '" placeholder="Answer ' + (j + 1) + '" style="border-left:6px solid ' + ['#E5533D', '#2F6FDE', '#E3A82B', '#2E9E5B'][j] + '"></div>'; };
    var body = '';
    if (q.kind === 'choice' || q.kind === 'poll') body = (q.options || []).map(opt).join('') + '<div class="small muted">' + (q.kind === 'poll' ? 'A poll has no right answer and gives no points.' : 'Tick the right answer (you can tick more than one).') + '</div>';
    if (q.kind === 'tf') body = '<select class="inp" data-gtf="' + i + '">' + T.opts([{ v: '1', l: 'The answer is TRUE' }, { v: '0', l: 'The answer is FALSE' }], String((q.correct || [1])[0])) + '</select>';
    if (q.kind === 'type') body = '<input class="inp" data-gans="' + i + '" value="' + esc((q.answers || []).join(', ')) + '" placeholder="Accepted answers, separated by commas"><div class="small muted">Spelling must match; capitals and punctuation don’t matter.</div>';
    if (q.kind === 'order') body = '<textarea class="inp" rows="4" data-gitems="' + i + '" placeholder="One per line, in the RIGHT order">' + esc((q.items || []).join('\n')) + '</textarea><div class="small muted">Players see them shuffled and put them back in order.</div>';
    return '<div class="card"><div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><b class="small muted">Question ' + (i + 1) + '</b><span class="sp" style="flex:1"></span>' + (i ? '<button class="btn ghost sm" data-gup="' + i + '" aria-label="Move up">↑</button>' : '') + '<button class="btn ghost sm" data-gdup="' + i + '" aria-label="Duplicate">⧉</button><button class="btn ghost sm" data-gdel="' + i + '" style="color:var(--red)" aria-label="Remove">✕</button></div>' +
      '<input class="inp" data-gtext="' + i + '" value="' + esc(q.text) + '" placeholder="Type the question" style="font-weight:700">' +
      '<div style="display:flex;gap:6px;margin:8px 0;flex-wrap:wrap"><select class="inp" data-gkind="' + i + '" style="width:auto">' + T.opts(KINDS.map(function (k) { return { v: k[0], l: k[1] }; }), q.kind) + '</select><select class="inp" data-gtime="' + i + '" style="width:auto">' + T.opts([5, 10, 15, 20, 30, 45, 60, 90].map(function (s) { return { v: String(s), l: s + ' seconds' }; }), String(q.time || 20)) + '</select>' +
      '<select class="inp" data-gpts="' + i + '" style="width:auto">' + T.opts([{ v: 'standard', l: 'Normal points' }, { v: 'double', l: 'Double points' }, { v: 'none', l: 'No points' }], q.points || 'standard') + '</select>' +
      '<label class="btn ghost sm" style="cursor:pointer">📷 ' + (q.img ? 'Change picture' : 'Add picture') + '<input type="file" accept="image/*" data-gimg="' + i + '" hidden></label>' + (q.img ? '<button class="btn ghost sm" data-gimgx="' + i + '">Remove picture</button>' : '') + '</div>' +
      (q.img ? '<img src="' + P.imgUrl(q.img) + '" alt="" style="max-height:120px;border-radius:10px;margin-bottom:8px">' : '') + body + '</div>';
  }
  function drawEditor(first) {
    var h = T.dhead(ED.id ? 'Edit game' : 'New game', 'Questions, timers, pictures and teams') + '<div class="db"><div class="card"><div class="form"><div class="f full"><label for="gtitle">Game name *</label><input class="inp" id="gtitle" value="' + esc(ED.title) + '" placeholder="e.g. Youth Night quiz"></div>' +
      '<div class="f full"><label for="gteams">Teams (optional)</label><input class="inp" id="gteams" value="' + esc((ED.settings.teams || []).join(', ')) + '" placeholder="e.g. Men, Women   or   Kubwa GC, Dawaki GC"></div></div></div>' +
      ED.questions.map(qCard).join('') + '<button class="btn ghost" data-gaddq="1" style="width:100%;margin-bottom:12px">＋ Add question</button>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-bottom:20px">' + (ED.id ? '<button class="btn ghost" data-gremove="' + esc(ED.id) + '" style="color:var(--red)">Delete</button><span class="sp" style="flex:1"></span>' : '') + '<button class="btn ghost" data-close="1">Cancel</button><button class="btn" id="gsave">Save game</button></div></div>';
    var dr = $('drawer'), top = dr.scrollTop; if (first) T.openDrawer(h); else { dr.innerHTML = h; dr.scrollTop = top; }
  }
  function syncEd() {
    if (!ED || !$('gtitle')) return; var dr = $('drawer');
    ED.title = $('gtitle').value; ED.settings.teams = $('gteams').value.split(',').map(function (x) { return x.trim(); }).filter(String);
    ED.questions.forEach(function (q, i) {
      var g = function (a) { return dr.querySelector('[' + a + '="' + i + '"]'); };
      if (g('data-gtext')) q.text = g('data-gtext').value; if (g('data-gtime')) q.time = +g('data-gtime').value; if (g('data-gpts')) q.points = g('data-gpts').value;
      if (g('data-gtf')) q.correct = [+g('data-gtf').value]; if (g('data-gans')) q.answers = g('data-gans').value.split(',').map(function (x) { return x.trim(); }).filter(String);
      if (g('data-gitems')) q.items = g('data-gitems').value.split('\n').map(function (x) { return x.trim(); }).filter(String);
      if (q.options) { q.options = q.options.map(function (o, j) { var e = dr.querySelector('[data-go2="' + i + ',' + j + '"]'); return e ? e.value : o; }); q.correct = q.options.map(function (o, j) { var c = dr.querySelector('[data-gc="' + i + ',' + j + '"]'); return c && c.checked ? j : -1; }).filter(function (j) { return j >= 0; }); }
    });
  }
  function save(btn) {
    syncEd(); var g = JSON.parse(JSON.stringify(ED));
    g.questions.forEach(function (q) { if (q.options) { var keep = q.options.map(function (o, j) { return [o.trim(), j]; }).filter(function (x) { return x[0]; }); q.correct = (q.correct || []).map(function (c) { return keep.map(function (x) { return x[1]; }).indexOf(c); }).filter(function (c) { return c >= 0; }); q.options = keep.map(function (x) { return x[0]; }); } });
    T.busy(btn, true);
    T.api('gameSave', { game: g }).then(function (j) { ED = null; P.toast('Saved ✓'); TAB = 'mine'; T.S._dirty = true; P.closeDrawer(); }).catch(function (e) { T.busy(btn, false); P.toast(e.message); });
  }
  function hostWindow(q) { var w = window.open('host.html?' + q, '_blank'); if (!w) location.href = 'host.html?' + q; }
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-gtab]'))) { TAB = x.dataset.gtab; if (P.app.view() !== 'games') P.app.go('games'); else P.app.render(); return; }
    if (t.closest('[data-gjoin]')) { var pin = ($('gpin').value || '').replace(/\D/g, ''); if (pin.length !== 6) { P.toast('Type the 6-digit PIN'); return; } location.href = 'play.html?pin=' + pin; return; }
    if ((x = t.closest('[data-ghosttpl]'))) { P.set('hosttpl', window.PATHWAY_GAME_TEMPLATES[+x.dataset.ghosttpl]); hostWindow('tpl=1'); return; }
    if ((x = t.closest('[data-gcopy]'))) { var tp = JSON.parse(JSON.stringify(window.PATHWAY_GAME_TEMPLATES[+x.dataset.gcopy])); delete tp.icon; tp.title += ' (copy)'; tp.questions.forEach(function (q) { if (q.kind === 'tf') q.correct = [q.correct]; }); openEditor(tp); return; }
    if ((x = t.closest('[data-ghost]'))) { hostWindow('id=' + encodeURIComponent(x.dataset.ghost)); return; }
    if ((x = t.closest('[data-gedit]'))) { var g = DATA.games.filter(function (y) { return y.id === x.dataset.gedit; })[0]; if (g) openEditor(g); return; }
    if (t.closest('[data-gnew]')) { openEditor(null); return; }
    if (!ED || !t.closest('#drawer')) return;
    if (t.closest('[data-gaddq]')) { syncEd(); ED.questions.push({ kind: 'choice', text: '', options: ['', '', '', ''], correct: [0], time: 20 }); drawEditor(); return; }
    if ((x = t.closest('[data-gdel]'))) { syncEd(); ED.questions.splice(+x.dataset.gdel, 1); drawEditor(); return; }
    if ((x = t.closest('[data-gdup]'))) { syncEd(); var i = +x.dataset.gdup; ED.questions.splice(i + 1, 0, JSON.parse(JSON.stringify(ED.questions[i]))); drawEditor(); return; }
    if ((x = t.closest('[data-gup]'))) { syncEd(); var k = +x.dataset.gup, q2 = ED.questions; var tmp = q2[k - 1]; q2[k - 1] = q2[k]; q2[k] = tmp; drawEditor(); return; }
    if ((x = t.closest('[data-gimgx]'))) { syncEd(); ED.questions[+x.dataset.gimgx].img = ''; drawEditor(); return; }
    if ((x = t.closest('[data-gremove]'))) { if (!window.confirm('Delete this game?')) return; T.api('gameRemove', { id: x.dataset.gremove }).then(function () { ED = null; T.S._dirty = true; P.closeDrawer(); }).catch(function (e2) { P.toast(e2.message); }); return; }
    if (t.id === 'gsave') save(t);
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!ED || !t.closest || !t.closest('#drawer')) return;
    if (t.dataset.gkind != null) { syncEd(); var q = ED.questions[+t.dataset.gkind]; q.kind = t.value; if ((q.kind === 'choice' || q.kind === 'poll') && !q.options) q.options = ['', '', '', '']; if (q.kind === 'tf') q.correct = [1]; if (q.kind === 'choice' && !(q.correct || []).length) q.correct = [0]; drawEditor(); return; }
    if (t.dataset.gimg != null && t.files && t.files[0]) {
      syncEd(); var i = +t.dataset.gimg; P.toast('Uploading picture…');
      P.shrinkImage(t.files[0], 900).then(function (data) { return T.api('imgPut', { data: data }); }).then(function (j) { ED.questions[i].img = j.id; drawEditor(); }).catch(function (e2) { P.toast(e2.message || 'Could not add the picture'); });
    }
  });
})();
