/* Pathway: Ushering count. Ushers count their section on their phone (works offline); several rounds per service;
   automatic checks suggest the official round; the head usher confirms and locks; insights for leaders. */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h8"/></svg>';
  var HELP = { hall: 'Sitting with their parents in the hall', kids: 'In children’s church', guests: 'First-time visitors', nb: 'Gave their life to Christ today', workers: 'Ushers, choir, media and other workers on duty', access: 'People who may need help' };
  var PEOPLE = ['male', 'female', 'hall', 'kids', 'teens'], COL = { male: '#2E7770', female: '#C9A24A', hall: '#9C7BD0', kids: '#E07A5F', teens: '#5B8DEF' };
  var S = { mode: 'board', date: null, svc: 0, round: null, sec: null, D: null, draft: {}, weeks: 12, isvc: 'All' }, TIMER = null, SAVE_T = null;
  var today = function () { return new Date(Date.now() + 3600000).toISOString().slice(0, 10); };
  function q() { return P.get('countq', []); }
  function flush() {
    var list = q(); if (!list.length || !P.online()) return Promise.resolve();
    var x = list[0];
    return T.api('countSave', x).then(function () { P.set('countq', q().slice(1)); return flush(); }, function (e) { if (!e.network) { P.set('countq', q().slice(1)); P.toast(e.message); } });
  }
  window.addEventListener('online', function () { flush().then(function () { if (P.app.view() === 'count') P.app.render(); }); });
  function load() {
    return T.api('countDay', { date: S.date }).then(function (d) { S.D = d; T.cache('count_' + S.date, d); return d; }, function (e) { var c = T.saved('count_' + S.date); if (e.network && c) { S.D = c; return c; } throw e; });
  }
  function svc() { return S.D && S.D.services[S.svc]; }
  function roundOf(s) { var want = S.round || (s.locked && s.official) || s.rounds[s.rounds.length - 1].round; return s.rounds.filter(function (r) { return r.round === want; })[0] || s.rounds[s.rounds.length - 1]; }
  function tot(c) { var a = (c.male || 0) + (c.female || 0); return { adults: a, total: a + (c.hall || 0) + (c.kids || 0) + (c.teens || 0) + (S.D && S.D.workersInTotal ? (c.workers || 0) : 0) }; }
  function people(d) { return PEOPLE.reduce(function (t, k) { return t + ((d && d[k]) || 0); }, 0); }
  function stack(c, T0) { return '<div class="stack" style="margin:10px 0 4px">' + PEOPLE.map(function (k) { return '<i style="width:' + (T0 ? (c[k] || 0) / T0 * 100 : 0) + '%;background:' + COL[k] + '"></i>'; }).join('') + '</div><div class="legend">' + PEOPLE.map(function (k) { return '<span><b style="background:' + COL[k] + '"></b>' + esc(S.D.cats[k].replace(' (children’s church)', '')) + ' ' + (c[k] || 0) + '</span>'; }).join('') + '</div>'; }
  function waText() {
    var nth = ['1st', '2nd', '3rd', '4th', '5th'], p = S.date.split('-'), ds = p[2] + '/' + p[1] + '/' + p[0], out = [], day = 0;
    S.D.services.forEach(function (s) {
      var best = s.rounds.slice().sort(function (a, b) { return b.score.total - a.score.total; })[0], r = s.rounds.filter(function (x) { return x.round === (s.official || s.suggested || best.round); })[0], c = r.totals, t = tot(c); day += t.total;
      out.push(ds + '\n' + esc2(s.name) + ' Count\n\nMale - ' + c.male + '\nFemale - ' + c.female + '\nChildren in Attendance - ' + c.hall + '\nChildren - ' + c.kids + '\nTeenagers - ' + c.teens +
        '\n\n Total Adult - ' + t.adults + ' \n\n Total Attendance - ' + t.total + '\n\nCar Count - ' + c.cars + '\nGuests - ' + c.guests + '\nNew Believers - ' + c.nb + (c.workers ? '\nWorkers on Duty - ' + c.workers : '') + (s.online ? '\nOnline Viewers - ' + s.online : ''));
    });
    return out.join('\n\n*************\n\n') + (S.D.services.length > 1 ? '\n\nAggregate Total (' + S.D.services.map(function (s, i) { return nth[i] || (i + 1) + 'th'; }).join(' + ') + ' Services) = ' + day : '');
  }
  function esc2(s) { return /sunday|service/i.test(s) ? (/^sunday/i.test(s) ? s : 'Sunday ' + s) : s; }
  // ---------- board ----------
  function board(v) {
    var d = S.D, s = svc(), pend = q().filter(function (x) { return x.date === S.date; }).length;
    var h = '<div class="tools"><input class="inp" type="date" id="cdate" value="' + S.date + '" style="width:auto"><div class="seg" style="flex:1;overflow-x:auto">' + d.services.map(function (x, i) { return '<button class="' + (i === S.svc ? 'on' : '') + '" data-csvc="' + i + '">' + esc(x.name) + (x.locked ? ' 🔒' : '') + '</button>'; }).join('') +
      ((d.canHead || d.canCount) ? '<button data-cadd="1">＋ Service</button>' : '') + '</div>' + (d.canHead ? '<button class="btn ghost sm" data-cmode="sections">Sections</button>' : '') + '<button class="btn ghost sm" data-cmode="insights">Insights</button></div>' +
      (pend ? '<div class="lockbar">📴 ' + pend + ' count(s) saved on this phone, not sent yet. They send when you are back online.</div>' : '');
    if (!s) { v.innerHTML = h + '<div class="card" style="text-align:center;padding:30px"><div style="font-size:36px">🔢</div><b>No count for this day yet</b><p class="small muted">Add the service you are counting, e.g. First Service.</p>' + ((d.canHead || d.canCount) ? '<button class="btn" data-cadd="1">＋ Add a service</button>' : '<p class="small muted">Ushers and the head usher start the count.</p>') + '</div>'; return; }
    var r = roundOf(s), c = r.totals, T0 = tot(c), sug = s.suggested, done = d.sections.filter(function (x) { return r.sections[x.name] && r.sections[x.name].done; }).length;
    h += (s.locked ? '<div class="lockbar">🔒 Locked by ' + esc(s.lockedBy || 'the head usher') + '. These numbers are final.' + (d.canHead ? ' <a href="#" data-cunlock="1">Unlock</a>' : '') + '</div>' : '');
    h += '<div class="card"><h3>Counting rounds<span class="sp"></span>' + (d.canHead && !s.locked ? '<button class="btn sm" data-cround="1">＋ New round</button>' : '') + '</h3>' + s.rounds.map(function (x) {
      var sc = x.score; return '<div class="secrow" data-cr="' + x.round + '" style="' + (x.round === r.round ? 'background:var(--teal-l);border-radius:12px;padding-left:8px' : '') + '"><div style="flex:1;min-width:0"><b>Round ' + x.round + (x.time ? ' · ' + esc(x.time) : '') + '</b>' + (s.official === x.round ? ' <span class="tag green">Official</span>' : sug === x.round && !s.official ? ' <span class="tag gold">Suggested</span>' : '') +
        '<div class="small muted">' + (sc.why.length ? '⚠ ' + esc(sc.why[0]) + (sc.why.length > 1 ? ' (+' + (sc.why.length - 1) + ' more)' : '') : '✔ All checks passed') + '</div></div><b style="font-size:18px;margin:0 6px">' + sc.total + '</b><span class="score" style="background:' + (sc.pass ? 'var(--green-l);color:var(--green)' : 'var(--red-l);color:var(--red)') + '">' + sc.pts + '</span></div>';
    }).join('') + '<div class="small muted" style="margin-top:6px">Score out of 100 from automatic checks. Tap a round to see it.</div></div>';
    if (!s.official) h += '<div class="card" style="border:2px solid var(--gold)"><h3>📌 Official count</h3>' + (sug ? '<div>Suggested: <b>Round ' + sug + ' (' + s.rounds.filter(function (x) { return x.round === sug; })[0].score.total + ')</b>, the highest round that passed every check.' + (s.rounds.length > 1 ? ' Late arrivals since Round 1: <b>+' + (s.rounds.filter(function (x) { return x.round === sug; })[0].score.total - s.rounds[0].score.total) + '</b>.' : '') + '</div>' +
      s.rounds.filter(function (x) { return !x.score.pass; }).map(function (x) { return '<div class="small" style="color:var(--red);margin-top:4px">Round ' + x.round + ' not used: ' + esc(x.score.why.join('; ')) + '</div>'; }).join('') +
      (d.canHead ? '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-cofficial="' + sug + '">Confirm Round ' + sug + '</button><button class="btn ghost" data-cother="1">Choose another</button></div>' : '<div class="small muted" style="margin-top:6px">The head usher confirms it.</div>')
      : '<div>No round has passed every check yet. Finish the sections, or start a new round.</div>') + '</div>';
    else h += '<div class="card"><b>📌 Official count: Round ' + s.official + ' · ' + s.rounds.filter(function (x) { return x.round === s.official; })[0].score.total + '</b>' + (s.reason ? '<div class="small muted">Reason: ' + esc(s.reason) + '</div>' : '') + '</div>';
    h += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="small muted" style="font-weight:700">TOTAL ATTENDANCE · ROUND ' + r.round + '</div><div style="font-size:40px;font-weight:800;color:var(--teal);line-height:1.1">' + T0.total + '</div></div><span class="tag ' + (done === d.sections.length ? 'green' : 'gold') + '">' + done + '/' + d.sections.length + ' sections</span></div>' + stack(c, T0.total) +
      '<div class="kpis" style="margin-top:12px">' + [['Total adults', T0.adults], ['Cars', c.cars], ['Guests', c.guests], ['New believers', c.nb], ['Workers on duty', c.workers], ['Special needs', c.access], ['Online viewers', s.online]].filter(function (k, i) { return i < 4 || k[1]; }).map(function (k) { return '<div class="card" style="margin:0;padding:10px"><div class="small muted">' + k[0] + '</div><b style="font-size:20px">' + (k[1] || 0) + '</b></div>'; }).join('') + '</div>' +
      (c.guests || c.nb ? '<div style="margin-top:10px"><button class="btn sm gold" data-go="capture">Capture guests / new believers for follow-up</button></div>' : '') + '</div>';
    h += '<div class="card"><h3>Sections<span class="sp"></span>' + (d.canCount && !s.locked ? '<span class="small muted">Tap your section to count</span>' : '') + '</h3>' + d.sections.map(function (x) {
      var e = r.sections[x.name], ok = e && e.done, n = e ? (x.counts.length === 1 && x.counts[0] === 'cars' ? (e.data.cars || 0) + ' 🚗' : people(e.data)) : '–';
      return '<div class="secrow" data-csec="' + esc(x.name) + '"><span class="sdot" style="background:' + (ok ? 'var(--green)' : e ? 'var(--amber)' : '#bbb') + '"></span><div style="flex:1;min-width:0"><b>' + esc(x.name) + '</b><div class="small muted">' +
        (e && e.verified ? '<span class="tag green">✔ checked by ' + esc(e.verified) + '</span> ' : '') + (ok ? 'Done · ' + esc(e.by) : e ? 'Counting… ' + esc(e.by) : 'Not started') + (e && e.history && e.history.length ? ' · ' + e.history.length + ' change(s)' : '') + '</div></div><b style="font-size:18px">' + n + '</b><span class="muted" style="font-size:20px">›</span></div>';
    }).join('') + '</div>';
    if (s.preacher || s.special || s.weather || s.notes) h += '<div class="card small"><b>Service details</b><div class="muted">' + esc([s.preacher && 'Preacher: ' + s.preacher, s.special, s.weather && 'Weather: ' + s.weather].filter(Boolean).join(' · ')) + '</div>' + (s.notes ? '<div style="white-space:pre-wrap;margin-top:4px">' + esc(s.notes) + '</div>' : '') + '</div>';
    h += '<div style="display:grid;gap:10px;margin-bottom:20px"><button class="btn wa" data-cwa="1">Share WhatsApp summary</button>' + (d.canHead ? '<button class="btn ghost" data-cdetails="1">Service details (preacher, weather, online viewers)</button>' + (!s.locked ? '<button class="btn gold" data-clock="1">Lock ' + esc(s.name) + '</button>' : '') : '') + '</div>';
    v.innerHTML = h;
  }
  // ---------- counting one section ----------
  function tally(v) {
    var d = S.D, s = svc(), r = roundOf(s), x = d.sections.filter(function (y) { return y.name === S.sec; })[0];
    if (!x) { S.mode = 'board'; return board(v); }
    var e = r.sections[x.name], key = S.date + '|' + s.name + '|' + r.round + '|' + x.name, data = S.draft[key] = S.draft[key] || Object.assign({}, e ? e.data : {}), mine = !e || !e.by || e.by === T.user().name;
    var lock = s.locked || !d.canCount, n = people(data);
    v.innerHTML = '<div class="tools"><button class="btn ghost sm" data-cmode="board">‹ Back to board</button><span class="sp" style="flex:1"></span><span class="tag gold">' + esc(s.name) + ' · Round ' + r.round + '</span></div>' +
      '<div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:18px">' + esc(x.name) + '</b><div class="small muted">' + (e && e.by ? 'Counted by ' + esc(e.by) : 'You are counting this section') + '</div></div>' +
      (x.counts.some(function (k) { return PEOPLE.indexOf(k) >= 0; }) ? '<div style="text-align:right"><div class="small muted" style="font-weight:700">PEOPLE HERE</div><div id="csecn" style="font-size:30px;font-weight:800;color:var(--teal)">' + n + '</div></div>' : '') + '</div>' +
      (s.locked ? '<div class="lockbar">🔒 This service is locked.</div>' : !d.canCount ? '<div class="lockbar">Only ushers can count. Ask the head usher to tick Usher for you.</div>' : !mine && e.done && !d.canHead ? '<div class="lockbar">Already counted by ' + esc(e.by) + '. You can do a spot-check below instead.</div>' : '') +
      x.counts.map(function (k) {
        return '<div class="ctr"><div class="lb">' + esc(d.cats[k]) + (HELP[k] ? '<small>' + HELP[k] + '</small>' : '') + '</div><button class="pm minus" data-pm="-1" data-k="' + k + '"' + (lock ? ' disabled' : '') + ' aria-label="One less">−</button>' +
          '<input class="num" inputmode="numeric" data-num="' + k + '" value="' + (data[k] || 0) + '"' + (lock ? ' disabled' : '') + ' aria-label="' + esc(d.cats[k]) + '"><button class="pm plus" data-pm="1" data-k="' + k + '"' + (lock ? ' disabled' : '') + ' aria-label="One more">+</button></div>';
      }).join('') +
      '<div class="small muted" style="margin:2px 4px 0">Hold + to count fast, or tap a number to type it. Saved on this phone even without internet.</div>' +
      (e && e.history && e.history.length ? '<details style="margin-top:10px"><summary class="small muted" style="cursor:pointer">Changes to this section (' + e.history.length + ')</summary><div class="log" style="margin-top:6px">' + e.history.map(function (h) { return '<div class="e small">' + esc(h) + '</div>'; }).join('') + '</div></details>' : '') +
      (!lock && (mine || !e.done || d.canHead) ? '<div class="stickybar"><button class="btn" style="width:100%;padding:15px;font-size:15px" data-cdone="1">✓ Done with this section</button></div>' : '') +
      (!s.locked && d.canCount && e && e.by && e.by !== T.user().name ? '<button class="btn ghost" style="width:100%;margin-top:8px" data-cspot="1">👀 Spot-check (second usher)</button>' : '');
    if (!P.get('countGuide')) setTimeout(guide, 300);
  }
  function setNum(k, val) {
    var s = svc(), r = roundOf(s), key = S.date + '|' + s.name + '|' + r.round + '|' + S.sec, d = S.draft[key] = S.draft[key] || {};
    d[k] = Math.max(0, Math.min(5000, val | 0)); var inp = document.querySelector('[data-num="' + k + '"]'); if (inp) inp.value = d[k];
    var n = $('csecn'); if (n) n.textContent = people(d);
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
    clearTimeout(SAVE_T); SAVE_T = setTimeout(function () { send(false); }, 2500); // progress shows on the head usher's board
  }
  function send(done) {
    var s = svc(), r = roundOf(s), key = S.date + '|' + s.name + '|' + r.round + '|' + S.sec, body = { date: S.date, service: s.name, round: r.round, section: S.sec, data: S.draft[key] || {}, done: !!done };
    clearTimeout(SAVE_T);
    if (!P.online()) { P.set('countq', q().filter(function (x) { return !(x.date === body.date && x.service === body.service && x.round === body.round && x.section === body.section); }).concat([body])); if (done) { P.toast('Saved on this phone. It sends when you are back online.'); S.mode = 'board'; P.app.render(); } return; }
    T.api('countSave', body).then(function (j) {
      if (j.warn) { P.toast('⚠ ' + j.warn); if (done) return; }
      if (done) { P.toast('✓ ' + S.sec + ' sent to the head usher'); delete S.draft[key]; S.mode = 'board'; S.sec = null; P.app.render(); }
    }).catch(function (e) { if (e.network) { P.set('countq', q().concat([body])); if (done) { S.mode = 'board'; P.app.render(); } } else P.toast(e.message); });
  }
  function guide() {
    if ($('cguide')) return;
    T.openDrawer(T.dhead('How to count your section', '3 quick steps') + '<div class="db" id="cguide"><div class="card"><b>1. Count only your section</b><div class="small muted">Stand where you can see everyone in it. Count once, calmly.</div></div><div class="card"><b>2. Tap + for each person</b><div class="small muted">Hold + to go fast, or tap the number to type it. Guests and new believers have their own buttons.</div></div><div class="card"><b>3. Tap “Done with this section”</b><div class="small muted">The head usher sees it straight away. If there is no internet, it sends later by itself.</div></div><button class="btn" data-close="1" style="width:100%">Got it</button></div>');
    P.set('countGuide', 1);
  }
  // ---------- sections editor ----------
  var EDIT = null;
  function sections(v) {
    EDIT = EDIT || JSON.parse(JSON.stringify(S.D.sections));
    v.innerHTML = '<div class="tools"><button class="btn ghost sm" data-cmode="board">‹ Back</button><span class="sp" style="flex:1"></span><button class="btn sm" data-csecsave="1">Save sections</button></div><p class="small muted">The sections ushers count, and what each one counts. Changes apply from the next count.</p>' +
      EDIT.map(function (x, i) {
        return '<div class="card"><div style="display:flex;gap:8px;margin-bottom:10px"><input class="inp" data-sname="' + i + '" value="' + esc(x.name) + '" aria-label="Section name"><button class="btn ghost sm" data-smove="' + i + '" data-dir="-1" aria-label="Move up">↑</button><button class="btn ghost sm" data-sdel="' + i + '" style="color:var(--red)" aria-label="Remove">✕</button></div>' +
          '<div class="small muted" style="font-weight:700;margin-bottom:6px">THIS SECTION COUNTS</div><div class="chips">' + Object.keys(S.D.cats).map(function (k) { return '<span class="chip' + (x.counts.indexOf(k) >= 0 ? ' on' : '') + '" role="button" tabindex="0" data-scat="' + i + '" data-k="' + k + '">' + esc(S.D.cats[k]) + '</span>'; }).join('') + '</div></div>';
      }).join('') + '<button class="btn ghost" style="width:100%" data-sadd="1">＋ Add a section</button>';
  }
  // ---------- insights ----------
  function line(rows, ly) {
    if (rows.length < 2) return '<div class="small muted">Insights appear after two Sundays with a confirmed count.</div>';
    var W = 640, H = 200, L = 34, B = 24, vals = rows.map(function (r) { return r.total; }).concat(ly.filter(function (x) { return x; })), max = Math.max.apply(null, vals.concat([10])) * 1.1, n = rows.length;
    var x = function (i) { return L + i * (W - L - 10) / (n - 1); }, y = function (v) { return H - B - v / max * (H - B - 10); };
    var pl = function (get, col, w, dash) { var pts = rows.map(function (r, i) { var v = get(r, i); return v == null ? null : x(i) + ',' + y(v); }).filter(Boolean); return pts.length > 1 ? '<polyline fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round" points="' + pts.join(' ') + '"/>' : ''; };
    var names = {}; rows.forEach(function (r) { Object.keys(r.per).forEach(function (k) { names[k] = 1; }); }), cols = ['#9CC8C2', '#E5CF94', '#C9B4E8', '#F2A99A'];
    var grid = [0, .5, 1].map(function (f) { var v = Math.round(max * f / 1.1); return '<line x1="' + L + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)"/><text x="0" y="' + (y(v) + 4) + '" font-size="10" fill="var(--muted)">' + v + '</text>'; }).join('');
    var lab = rows.map(function (r, i) { return n < 14 || i % Math.ceil(n / 10) === 0 || i === n - 1 ? '<text x="' + x(i) + '" y="' + (H - 6) + '" font-size="10" fill="var(--muted)" text-anchor="middle">' + r.date.slice(8) + '/' + r.date.slice(5, 7) + '</text>' : ''; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Attendance by Sunday">' + grid + lab + Object.keys(names).map(function (k, i) { return pl(function (r) { return r.per[k] ? r.per[k].total : null; }, cols[i % 4], 2); }).join('') +
      pl(function (r, i) { return ly[i]; }, 'var(--muted)', 1.5, 1) + pl(function (r) { return r.total; }, 'var(--teal)', 3) + rows.map(function (r, i) { return '<circle cx="' + x(i) + '" cy="' + y(r.total) + '" r="3" fill="var(--teal)"><title>' + r.date + ': ' + r.total + '</title></circle>'; }).join('') + '</svg>' +
      '<div class="legend"><span><b style="background:var(--teal)"></b>Whole day</span>' + Object.keys(names).map(function (k, i) { return '<span><b style="background:' + cols[i % 4] + '"></b>' + esc(k) + '</span>'; }).join('') + (ly.some(function (z) { return z; }) ? '<span><b style="background:var(--muted)"></b>Same Sunday last year</span>' : '') + '</div>';
  }
  function insights(v) {
    T.loading(v); var gone = T.guard();
    T.api('countInsights', { weeks: S.weeks }).then(function (d) {
      if (gone()) return;
      var rows = d.rows, n = rows.length, sum = function (k) { return rows.reduce(function (t, r) { return t + (r.c[k] || 0); }, 0); };
      var head = '<div class="tools"><button class="btn ghost sm" data-cmode="board">‹ Back</button><div class="seg">' + [8, 12, 26, 52].map(function (w) { return '<button class="' + (S.weeks === w ? 'on' : '') + '" data-cweeks="' + w + '">' + (w < 52 ? w + ' wks' : '1 year') + '</button>'; }).join('') + '</div><span class="sp" style="flex:1"></span><button class="btn ghost sm" data-ccsv="1">Download (Excel)</button><button class="btn ghost sm" onclick="window.print()">Print report</button></div>';
      if (!n) { v.innerHTML = head + '<div class="card" style="text-align:center;padding:30px"><b>No confirmed counts in this period yet</b><p class="small muted">Insights use only counts the head usher has confirmed, so half-finished counts never mislead.</p></div>'; return; }
      var last = rows[n - 1], prev = rows[n - 2], avg = Math.round(rows.reduce(function (t, r) { return t + r.total; }, 0) / n), adults = rows.reduce(function (t, r) { return t + r.adults; }, 0);
      var dl = function (a, b) { if (b == null) return ''; var x = a - b, p = b ? Math.round(x / b * 100) : 0; return '<div class="small" style="font-weight:700;color:' + (x >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (x >= 0 ? '▲ ' : '▼ ') + Math.abs(x) + ' (' + Math.abs(p) + '%)</div>'; };
      var sorted = rows.slice().sort(function (a, b) { return b.total - a.total; }), mix = PEOPLE.map(function (k) { return [k, sum(k)]; }), all = mix.reduce(function (t, m) { return t + m[1]; }, 0) || 1;
      var gap = rows.filter(function (r) { return r.c.nb > r.captured; }), secs = {}; rows.forEach(function (r) { Object.keys(r.sections).forEach(function (k) { (secs[k] = secs[k] || []).push(r.sections[k]); }); });
      var svcs = {}; rows.forEach(function (r) { Object.keys(r.per).forEach(function (k) { (svcs[k] = svcs[k] || []).push(r.per[k].total); }); });
      var months = {}; rows.forEach(function (r) { var k = r.date.slice(0, 7); (months[k] = months[k] || []).push(r.total); });
      var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      S._csv = [['Date', 'Total', 'Adults', 'Male', 'Female', 'Children in hall', 'Children', 'Teenagers', 'Guests', 'New believers', 'Captured in Pathway', 'Cars', 'Workers on duty', 'Online viewers']].concat(rows.map(function (r) { return [r.date, r.total, r.adults, r.c.male, r.c.female, r.c.hall, r.c.kids, r.c.teens, r.c.guests, r.c.nb, r.captured, r.c.cars, r.c.workers, r.online]; }));
      v.innerHTML = head + '<div class="kpis"><div class="card" style="margin:0"><div class="small muted">Last Sunday</div><b style="font-size:26px">' + last.total + '</b>' + dl(last.total, prev && prev.total) + '</div>' +
        '<div class="card" style="margin:0"><div class="small muted">Weekly average</div><b style="font-size:26px">' + avg + '</b>' + dl(last.total, avg) + '</div>' +
        '<div class="card" style="margin:0"><div class="small muted">Same Sunday last year</div><b style="font-size:26px">' + (d.lastYear[n - 1] || '—') + '</b>' + (d.lastYear[n - 1] ? dl(last.total, d.lastYear[n - 1]) : '') + '</div>' +
        '<div class="card" style="margin:0"><div class="small muted">Attendance vs members</div><b style="font-size:26px">' + (d.members ? Math.round(avg / d.members * 100) + '%' : '—') + '</b><div class="small muted">' + d.members + ' members</div></div>' +
        '<div class="card" style="margin:0"><div class="small muted">Guests</div><b style="font-size:26px">' + sum('guests') + '</b><div class="small muted">≈ ' + (sum('guests') / n).toFixed(1) + ' a week</div></div>' +
        '<div class="card" style="margin:0"><div class="small muted">New believers</div><b style="font-size:26px">' + sum('nb') + '</b><div class="small muted">' + rows.reduce(function (t, r) { return t + r.captured; }, 0) + ' captured in Pathway</div></div></div>' +
        '<div class="card" style="margin-top:12px"><h3>Attendance by Sunday</h3>' + line(rows, d.lastYear) + '</div>' +
        (gap.length ? '<div class="card" style="border-left:4px solid var(--red)"><h3>⚠ New believers not yet captured</h3>' + gap.slice(-5).reverse().map(function (r) { return '<div class="secrow" style="cursor:default"><div style="flex:1"><b>' + r.date + '</b><div class="small muted">' + r.c.nb + ' counted · ' + r.captured + ' captured</div></div><span class="tag red">' + (r.c.nb - r.captured) + ' missing</span></div>'; }).join('') + '<button class="btn sm" data-go="capture" style="margin-top:8px">Capture them now</button></div>' : '') +
        '<div class="grid g2"><div class="card"><h3>Who comes</h3>' + '<div class="stack" style="height:16px">' + mix.map(function (m) { return '<i style="width:' + m[1] / all * 100 + '%;background:' + COL[m[0]] + '"></i>'; }).join('') + '</div><div class="legend">' + mix.map(function (m) { return '<span><b style="background:' + COL[m[0]] + '"></b>' + esc(d.cats[m[0]].replace(' (children’s church)', '')) + ' ' + Math.round(m[1] / all * 100) + '%</span>'; }).join('') + '</div>' +
        '<div class="small" style="margin-top:10px">🚗 <b>' + (sum('cars') / Math.max(1, adults) * 100).toFixed(1) + '</b> cars per 100 adults · ' + Math.round(sum('cars') / n) + ' cars a Sunday' + (sum('workers') ? ' · 🧑‍🤝‍🧑 ' + Math.round(sum('workers') / n) + ' workers on duty' : '') + (rows.some(function (r) { return r.online; }) ? ' · 📺 ' + Math.round(rows.reduce(function (t, r) { return t + r.online; }, 0) / n) + ' online viewers' : '') + '</div></div>' +
        '<div class="card"><h3>Share of each service</h3>' + Object.keys(svcs).map(function (k) { var a = Math.round(svcs[k].reduce(function (t, x) { return t + x; }, 0) / svcs[k].length); return '<div class="hb w"><span>' + esc(k) + '</span><div class="bar"><i style="width:' + Math.round(a / Math.max(1, avg) * 100) + '%"></i></div><b>' + a + ' · ' + Math.round(a / Math.max(1, avg) * 100) + '%</b></div>'; }).join('') + '</div>' +
        '<div class="card"><h3>Sections (average people)</h3>' + Object.keys(secs).map(function (k) { var a = Math.round(secs[k].reduce(function (t, x) { return t + x; }, 0) / secs[k].length), lst = secs[k][secs[k].length - 1]; return '<div class="secrow" style="cursor:default"><div style="flex:1">' + esc(k) + '</div><span class="small muted" style="margin-right:8px">last ' + lst + '</span><b>' + a + '</b></div>'; }).join('') + '</div>' +
        '<div class="card"><h3>Highest and lowest</h3><div class="secrow" style="cursor:default">🏆<div style="flex:1">' + sorted[0].date + (Object.keys(sorted[0].per).map(function (k) { return sorted[0].per[k].special; }).filter(String).join(', ') ? ' · ' + esc(Object.keys(sorted[0].per).map(function (k) { return sorted[0].per[k].special; }).filter(String).join(', ')) : '') + '</div><b>' + sorted[0].total + '</b></div><div class="secrow" style="cursor:default">📉<div style="flex:1">' + sorted[n - 1].date + '</div><b>' + sorted[n - 1].total + '</b></div></div>' +
        '<div class="card"><h3>Monthly average</h3>' + Object.keys(months).map(function (m) { var a = months[m]; return '<div class="secrow" style="cursor:default"><div style="flex:1">' + MN[+m.slice(5) - 1] + ' ' + m.slice(0, 4) + '</div><span class="small muted" style="margin-right:8px">' + a.length + ' Sundays</span><b>' + Math.round(a.reduce(function (t, x) { return t + x; }, 0) / a.length) + '</b></div>'; }).join('') + '</div>' +
        (d.seasonal.length > 2 ? '<div class="card"><h3>Seasons (all years)</h3>' + d.seasonal.sort(function (a, b) { return a.month - b.month; }).map(function (s) { return '<div class="hb w"><span>' + MN[s.month - 1] + '</span><div class="bar"><i style="width:' + Math.round(s.avg / Math.max.apply(null, d.seasonal.map(function (x) { return x.avg; })) * 100) + '%"></i></div><b>' + s.avg + '</b></div>'; }).join('') + '</div>' : '') + '</div>';
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  }
  // ---------- screen ----------
  P.views.count = { title: 'Ushering count', icon: ICON, render: function (v) {
    clearInterval(TIMER); S.date = S.date || today();
    if (S.mode === 'insights') return insights(v);
    var gone = T.guard(), cached = T.saved('count_' + S.date);
    var draw = function () { if (gone()) return; if (S.svc >= S.D.services.length) S.svc = 0; if (S.mode === 'tally') tally(v); else if (S.mode === 'sections') sections(v); else board(v); };
    if (cached && !S.D) { S.D = cached; draw(); } else if (!S.D) T.loading(v); else draw();
    flush().then(load).then(function () { if (S.mode !== 'tally' && S.mode !== 'sections') draw(); else if (!$('csecn') && S.mode === 'tally') draw(); }).catch(function (e) { if (!gone() && !S.D) T.fail(v, e); });
    TIMER = setInterval(function () { if (P.app.view() !== 'count' || S.mode !== 'board' || document.hidden || document.querySelector('.drawer.open')) return; load().then(function () { if (P.app.view() === 'count' && S.mode === 'board') { var y = window.scrollY; board(v); window.scrollTo(0, y); } }).catch(function () {}); }, 12000);
  } };
  function act(name, body, msg) { return T.api(name, Object.assign({ date: S.date, service: svc() && svc().name }, body)).then(function (j) { if (msg) P.toast(msg); return load(); }).then(function () { P.app.render(); }).catch(function (e) { P.toast(e.message); }); }
  var holdT = null, holdI = null;
  function stopHold() { clearTimeout(holdT); clearInterval(holdI); holdT = holdI = null; }
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('[data-pm]'); if (!b || b.disabled || P.app.view() !== 'count') return;
    e.preventDefault(); var k = b.dataset.k, step = +b.dataset.pm, cur = function () { var inp = document.querySelector('[data-num="' + k + '"]'); return parseInt(inp && inp.value, 10) || 0; };
    setNum(k, cur() + step); holdT = setTimeout(function () { holdI = setInterval(function () { setNum(k, cur() + step); }, 90); }, 450);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { document.addEventListener(ev, stopHold); });
  document.addEventListener('change', function (e) {
    var t = e.target; if (P.app.view() !== 'count') return;
    if (t.matches('[data-num]')) { setNum(t.dataset.num, parseInt(t.value, 10) || 0); return; }
    if (t.id === 'cdate') { S.date = t.value || today(); S.svc = 0; S.round = null; S.D = null; P.app.render(); return; }
    if (t.matches('[data-sname]')) EDIT[+t.dataset.sname].name = t.value.trim();
  });
  document.addEventListener('click', function (e) {
    var t = e.target, x; if (P.app.view() !== 'count' && !t.closest('#drawer')) return;
    if (t.closest('[data-pm]')) return;
    if ((x = t.closest('[data-cmode]'))) { S.mode = x.dataset.cmode; EDIT = null; P.app.render(); window.scrollTo(0, 0); return; }
    if ((x = t.closest('[data-csvc]'))) { S.svc = +x.dataset.csvc; S.round = null; P.app.render(); return; }
    if ((x = t.closest('[data-cr]'))) { S.round = +x.dataset.cr; P.app.render(); return; }
    if ((x = t.closest('[data-csec]'))) { S.sec = x.dataset.csec; S.mode = 'tally'; P.app.render(); window.scrollTo(0, 0); return; }
    if (t.closest('[data-cdone]')) { send(true); return; }
    if ((x = t.closest('[data-cweeks]'))) { S.weeks = +x.dataset.cweeks; P.app.render(); return; }
    if (t.closest('[data-ccsv]') && S._csv) { T.csv('Attendance', S._csv); return; }
    if (t.closest('[data-cadd]')) {
      var have = S.D.services.map(function (s) { return s.name; });
      T.openDrawer(T.dhead('Add a service', 'Which service are you counting?') + '<div class="db">' + ['First Service', 'Second Service', 'Third Service', 'Midweek Service', 'Youth Service', 'Special Service'].filter(function (n) { return have.indexOf(n) < 0; }).map(function (n) { return '<button class="btn ghost" style="width:100%;margin-bottom:8px" data-cnewsvc="' + n + '">' + n + '</button>'; }).join('') +
        '<input class="inp" id="csvcname" placeholder="Or type a name"><button class="btn" style="width:100%;margin-top:8px" data-cnewsvc="_">Add</button></div>'); return;
    }
    if ((x = t.closest('[data-cnewsvc]'))) { var nm = x.dataset.cnewsvc === '_' ? $('csvcname').value.trim() : x.dataset.cnewsvc; if (!nm) return; T.api('countService', { date: S.date, service: nm }).then(load).then(function () { S.svc = S.D.services.length - 1; S.round = null; P.closeDrawer(); P.app.render(); }).catch(function (e2) { P.toast(e2.message); }); return; }
    if (t.closest('[data-cround]')) { if (!window.confirm('Start a new round? Ushers will be asked to count their sections again (for late arrivals).')) return; S.round = null; act('countRound', {}, 'New round started: ushers have been told'); return; }
    if ((x = t.closest('[data-cofficial]'))) { act('countOfficial', { round: +x.dataset.cofficial }, '📌 Official count confirmed'); return; }
    if (t.closest('[data-cother]')) {
      var s0 = svc(); T.openDrawer(T.dhead('Choose the official round', 'Give a reason so others understand') + '<div class="db"><div class="card">' + s0.rounds.map(function (r) { return '<label class="chk"><input type="radio" name="cpick" value="' + r.round + '"> Round ' + r.round + ' · ' + r.score.total + ' (score ' + r.score.pts + ')</label>'; }).join('') +
        '<input class="inp" id="creason" placeholder="Reason, e.g. Round 2 missed the overflow" style="margin-top:12px"><button class="btn" style="width:100%;margin-top:10px" data-cpick="1">Confirm</button></div></div>'); return;
    }
    if (t.closest('[data-cpick]')) { var ch = document.querySelector('[name=cpick]:checked'); if (!ch) { P.toast('Choose a round'); return; } T.api('countOfficial', { date: S.date, service: svc().name, round: +ch.value, reason: $('creason').value }).then(load).then(function () { P.closeDrawer(); P.app.render(); }).catch(function (e2) { P.toast(e2.message); }); return; }
    if (t.closest('[data-clock]')) { if (!svc().official) { P.toast('Confirm the official count first'); return; } act('countLock', { lock: true }, '🔒 Locked'); return; }
    if (t.closest('[data-cunlock]')) { e.preventDefault(); var why = window.prompt('Why are you unlocking this count?'); if (why) act('countLock', { lock: false, reason: why }, 'Unlocked'); return; }
    if (t.closest('[data-cdetails]')) {
      var s1 = svc(); T.openDrawer(T.dhead('Service details', esc(s1.name)) + '<div class="db"><div class="card"><div class="form">' + [['cpre', 'Preacher', s1.preacher], ['cspec', 'Special (e.g. baptism, guest minister)', s1.special], ['cwea', 'Weather', s1.weather], ['conl', 'Online viewers (peak)', s1.online || '']].map(function (f) { return '<div class="f"><label for="' + f[0] + '">' + f[1] + '</label><input class="inp" id="' + f[0] + '" value="' + esc(f[2] || '') + '"></div>'; }).join('') +
        '<div class="f full"><label for="cnotes">Notes</label><textarea class="inp" id="cnotes" rows="3">' + esc(s1.notes || '') + '</textarea></div></div><button class="btn" style="width:100%;margin-top:12px" data-cdetsave="1">Save</button></div></div>'); return;
    }
    if (t.closest('[data-cdetsave]')) { T.api('countService', { date: S.date, service: svc().name, preacher: $('cpre').value, special: $('cspec').value, weather: $('cwea').value, online: $('conl').value, notes: $('cnotes').value }).then(load).then(function () { P.closeDrawer(); P.app.render(); P.toast('Saved ✓'); }).catch(function (e2) { P.toast(e2.message); }); return; }
    if (t.closest('[data-cwa]')) { var tx = waText(); T.openDrawer(T.dhead('WhatsApp summary', 'Official count for each service') + '<div class="db"><pre class="wa">' + esc(tx) + '</pre><a class="btn wa" style="width:100%;text-align:center" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(tx) + '">Send on WhatsApp</a><button class="btn ghost" style="width:100%;margin-top:8px" data-ccopy="1">Copy text</button></div>'); return; }
    if (t.closest('[data-ccopy]')) { (navigator.clipboard ? navigator.clipboard.writeText(waText()) : Promise.reject()).then(function () { P.toast('Copied ✓'); }, function () { P.toast('Select the text to copy'); }); return; }
    if (t.closest('[data-cspot]')) { var n0 = window.prompt('Count the people in ' + S.sec + ' without looking at the first count. How many?'); if (n0 == null) return; T.api('countSpot', { date: S.date, service: svc().name, round: roundOf(svc()).round, section: S.sec, n: n0 }).then(function (j) { P.toast(j.match ? '✔ Within 5% (' + j.first + ' vs ' + j.second + '): section checked' : '⚠ ' + j.first + ' vs ' + j.second + ': more than 5% apart. Please recount together.'); return load(); }).then(function () { P.app.render(); }).catch(function (e2) { P.toast(e2.message); }); return; }
    if ((x = t.closest('[data-scat]'))) { var sc = EDIT[+x.dataset.scat], k = x.dataset.k, at = sc.counts.indexOf(k); if (at >= 0) sc.counts.splice(at, 1); else sc.counts.push(k); x.classList.toggle('on'); return; }
    if ((x = t.closest('[data-sdel]'))) { if (window.confirm('Remove "' + EDIT[+x.dataset.sdel].name + '"? Past counts are kept.')) { EDIT.splice(+x.dataset.sdel, 1); P.app.render(); } return; }
    if ((x = t.closest('[data-smove]'))) { var i = +x.dataset.smove; if (i > 0) { var tmp = EDIT[i - 1]; EDIT[i - 1] = EDIT[i]; EDIT[i] = tmp; P.app.render(); } return; }
    if (t.closest('[data-sadd]')) { EDIT.push({ name: 'New section', counts: ['male', 'female'] }); P.app.render(); return; }
    if (t.closest('[data-csecsave]')) { T.api('countSections', { sections: EDIT }).then(function () { P.toast('Sections saved ✓'); EDIT = null; S.mode = 'board'; return load(); }).then(function () { P.app.render(); }).catch(function (e2) { P.toast(e2.message); }); }
  });
})();
