/* Pathway step 3: dashboard, permissions, away & activity log, Sunday rota, My space, admin. Uses helpers from tracker.js (P.T). */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ic = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var I = {
    dash: ic('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
    ok: ic('<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
    plane: ic('<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'),
    home: ic('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
    set: ic('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>')
  };
  var MON = function (d) { return d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'; };
  var D10 = function (d) { var x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  var reqTag = function (s) { return '<span class="tag ' + ({ Approved: 'green', Declined: 'red', Question: 'gold', Pending: 'amber' }[s] || 'grey') + '">' + esc(s) + '</span>'; };
  var dutyTag = function (s) { return '<span class="tag ' + ({ Confirmed: 'green', Scheduled: 'grey', Away: 'amber', Gap: 'red', "Can't make it": 'red' }[s] || 'grey') + '">' + esc(s === 'Gap' ? 'Gap – nobody free' : s) + '</span>'; };

  /** Shows the last saved copy straight away and refreshes it in the background (re-drawing if anything changed).
      After a change has been made, it waits for fresh data instead. Works offline from the saved copy. */
  function get(key, action, data) {
    var have = T.saved(key), view = P.app.view();
    if (have && T.S['_f' + key]) { T.S['_f' + key] = false; return Promise.resolve(have); }
    if (!P.online()) return have ? Promise.resolve(have) : Promise.reject(new Error('You are offline and this page has not been opened on this phone yet.'));
    var net = T.api(action, data).then(function (j) { var changed = JSON.stringify(j) !== JSON.stringify(have); T.cache(key, j); return { j: j, changed: changed }; });
    if (have && !P._force) {
      net.then(function (r) { if (r.changed && P.app.view() === view && !document.querySelector('.drawer.open')) { T.S['_f' + key] = true; P.app.render(); } }).catch(function () {});
      return Promise.resolve(have);
    }
    P._force = false;
    return net.then(function (r) { return r.j; }).catch(function (e) { if (e.network && have) { P.toast('Weak connection: showing the last saved copy'); return have; } throw e; });
  }
  function hb(name, n, max, color, suffix) {
    return '<div class="hb"><span title="' + esc(name) + '">' + esc(name) + '</span><div class="bar"><i style="width:' + (max ? Math.min(100, n / max * 100) : 0) + '%' + (color ? ';background:' + color : '') + '"></i></div><b>' + (n == null ? '—' : n + (suffix || '')) + '</b></div>';
  }

  // ---------- badges (menu counters) ----------
  P.badges = P.badges || {};
  function refreshBadges() {
    if (!P.app || !P.app.user() || !P.online() || !P.API) return;
    T.api('badges').then(function (j) { P.badges = j; P.app.nav(); }).catch(function () {});
  }
  P.refreshBadges = refreshBadges;
  setTimeout(refreshBadges, 1500); setInterval(refreshBadges, 300000);
  window.addEventListener('online', refreshBadges);

  // ---------- Dashboard ----------
  var DC = '';
  P.views.dash = { title: 'Dashboard', icon: I.dash, render: function (v) {
    T.loading(v); var gone = T.guard();
    get('dash' + DC, 'dashboard', { campus: DC }).then(function (d) {
      if (gone()) return;
      var c = d.church, k = d.converts, r = d.rules, chg = k.prev30 ? Math.round((k.new30 - k.prev30) / k.prev30 * 100) : null;
      var maxS = Math.max.apply(null, d.sources.map(function (x) { return x.count; }).concat([1]));
      var maxD = Math.max.apply(null, d.stageDays.map(function (x) { return x.days || 0; }).concat([30]));
      var maxC = Math.max.apply(null, d.campusSplit.map(function (x) { return x.count; }).concat([1]));
      var f = d.funnel;
      v.innerHTML = (d.campuses.length ? '<div class="tools noprint"><select class="inp" id="dcamp"><option value="">All campuses</option>' + T.opts(d.campuses, DC) + '</select><span class="sp" style="flex:1"></span><button class="btn ghost sm" data-reload="1">Refresh</button><button class="btn sm" onclick="window.print()">Print report</button></div>' : '<div class="tools noprint"><span class="sp" style="flex:1"></span><button class="btn sm" onclick="window.print()">Print report</button></div>') +
        '<div class="printonly"><h2 style="margin:0">' + esc(P.config().church || 'The Elevation Church') + ' · Pathway report</h2><p class="small">' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + (d.campus ? ' · ' + esc(d.campus) : ' · all campuses') + '</p></div>' +
        '<div class="sec" style="margin:0 0 10px">Whole church' + (d.campus ? ' · ' + esc(d.campus) : '') + '</div><div class="grid g4" style="margin-bottom:22px">' +
        '<div class="card kpi click" data-go="members"><div class="l">Members</div><div class="n">' + c.members + '</div><div class="d">' + c.groups + ' small group' + (c.groups === 1 ? '' : 's') + '</div></div>' +
        '<div class="card kpi click" data-go="stewards"><div class="l">Stewards serving</div><div class="n">' + c.stewards + '</div><div class="d">' + c.departments + ' departments</div></div>' +
        '<div class="card kpi click" data-go="away"><div class="l">Away now</div><div class="n">' + c.away + '</div><div class="d' + (c.noCover ? ' bad' : '') + '">' + c.noCover + ' without duty cover</div></div>' +
        '<div class="card kpi click" data-go="requests"><div class="l">Pending approvals</div><div class="n">' + c.pending + '</div><div class="d' + (c.pending ? ' bad' : '') + '">' + (c.pending ? 'Awaiting decision' : 'All decided') + '</div></div></div>' +
        '<div class="sec" style="margin:0 0 10px">Convert pathway</div><div class="grid g4">' +
        '<div class="card kpi"><div class="l">New souls · last 30 days</div><div class="n">' + k.new30 + '</div><div class="d' + (chg != null && chg < 0 ? ' bad' : '') + '">' + (chg == null ? k.prev30 + ' in the 30 days before' : (chg >= 0 ? '▲ ' : '▼ ') + Math.abs(chg) + '% vs previous 30') + '</div></div>' +
        '<div class="card kpi"><div class="l">Contacted within ' + r.deadline + 'h</div><div class="n">' + (k.contacted == null ? '—' : k.contacted + '%') + '</div><div class="d' + (k.contacted != null && k.contacted < d.target ? ' bad' : '') + '">Target ' + d.target + '%</div></div>' +
        '<div class="card kpi click" data-go="people"><div class="l">Active on the pathway</div><div class="n">' + k.active + '</div><div class="d">' + k.total + ' captured in all</div></div>' +
        '<div class="card kpi click" data-go="tasks"><div class="l">Stalled / unassigned</div><div class="n">' + k.stalled + ' <span class="muted" style="font-size:16px">/ ' + k.unassigned + '</span></div><div class="d' + (k.stalled + k.unassigned ? ' bad' : '') + '">' + (k.stalled + k.unassigned ? 'Needs attention' : 'All on track') + '</div></div></div>' +
        '<div class="card" style="margin-top:16px"><h3>Convert lifecycle <span class="tag gold">tap a stage</span><span class="sp"></span><span class="small muted hide-m">% = moved on to the next stage</span></h3><div class="path">' + f.map(function (s, i) {
          return '<div class="st" data-stagefilter="' + s.n + '">' + (i < f.length - 1 ? '<span class="conv">' + (s.reached ? Math.round(f[i + 1].reached / s.reached * 100) : 0) + '%</span>' : '') + '<div class="c">' + s.now + '</div><div class="nm">' + esc(s.name) + '</div><div class="cv">' + s.reached + ' reached</div></div>';
        }).join('') + '</div></div>' +
        '<div class="grid g2" style="margin-top:16px"><div class="card"><h3>Needs attention<span class="sp"></span><button class="btn ghost sm" data-go="tasks">See all</button></h3>' + (d.attention.map(function (p) {
          return '<div class="row click" data-person="' + esc(p.id) + '"><div class="av">' + esc(T.ini(p.first + ' ' + p.last)) + '</div><div class="meta"><b>' + esc(p.first + ' ' + p.last) + '</b><span>' + esc(p.stageName.split(' / ')[0]) + ' · ' + esc(p.campus || 'campus not set') + ' · ' + esc(p.owner) + '</span></div>' + T.actTag(p, 'hide-m') + '</div>';
        }).join('') || '<div class="muted small">Nobody needs attention right now 🙌</div>') + '</div>' +
        '<div class="card"><h3>Where people come from</h3>' + (d.sources.map(function (x) { return hb(x.name, x.count, maxS, 'var(--gold)'); }).join('') || '<div class="muted small">No converts yet</div>') +
        '<h3 style="margin-top:18px">Average days in each stage</h3>' + d.stageDays.map(function (x) { return hb(x.name.split(' / ')[0], x.days, maxD, null, 'd'); }).join('') + '</div></div>' +
        '<div class="grid g3" style="margin-top:16px"><div class="card"><h3>Follow-up workload</h3>' + (d.load.map(function (w) { return hb(w.name, w.count, Math.max(r.load * 1.5, 1), w.count > r.load ? 'var(--red)' : null); }).join('') || '<div class="muted small">No follow-up workers yet</div>') + '<div class="small muted">Red = more than ' + r.load + ' people (Worker load limit)</div></div>' +
        '<div class="card"><h3>By campus</h3>' + (d.campusSplit.length ? d.campusSplit.map(function (x) { return hb(x.name, x.count, maxC); }).join('') : '<div class="muted small">' + (d.campus ? 'Showing ' + esc(d.campus) + ' only' : 'No converts yet') + '</div>') + '</div>' +
        '<div class="card"><h3>Celebrate 🎉</h3><div class="row"><div class="av" style="background:var(--green-l);color:var(--green)">✓</div><div class="meta"><b>' + d.celebrate.baptisms + ' water baptism' + (d.celebrate.baptisms === 1 ? '' : 's') + '</b><span>recorded on profiles</span></div></div>' +
        '<div class="row"><div class="av" style="background:var(--teal-l);color:var(--teal)">★</div><div class="meta"><b>' + d.celebrate.membership + ' completed Membership Class</b><span>ready to serve</span></div></div>' +
        '<div class="row"><div class="av">🎂</div><div class="meta"><b>' + d.celebrate.birthdays.length + ' spiritual birthday' + (d.celebrate.birthdays.length === 1 ? '' : 's') + ' this week</b><span>' + esc(d.celebrate.birthdays.slice(0, 4).join(', ') || 'one year or more since their decision') + '</span></div></div></div></div>';
      if ($('dcamp')) $('dcamp').onchange = function () { DC = this.value; P.app.render(); };
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };

  // ---------- Permissions ----------
  var RF = null;
  function reqCard(r, me) {
    var mine = r.by === me, waitMe = r.status === 'Pending' && r.waiting.indexOf(me) >= 0, admin = T.user().role === 'Admin';
    var chain = r.steps.map(function (s, i) {
      var n = i + 1, done = r.status === 'Approved' || n < r.step, cur = n === r.step && ['Pending', 'Question'].indexOf(r.status) >= 0;
      return '<span class="tag ' + (done ? 'green' : cur ? 'amber' : 'grey') + '">' + (done ? '✓ ' : '') + esc(s) + '</span>';
    }).join(' → ');
    var act = '';
    if (waitMe || (admin && r.status === 'Pending' && !mine)) act = '<div class="mini" style="margin-top:12px"><input class="inp" data-note="' + esc(r.id) + '" placeholder="Note or question (optional for approve)"></div><div class="mini" style="margin-top:8px">' +
      '<button class="btn sm" data-decide="approve" data-id="' + esc(r.id) + '">Approve</button><button class="btn ghost sm" data-decide="ask" data-id="' + esc(r.id) + '">Ask a question</button><button class="btn ghost sm" style="color:var(--red)" data-decide="decline" data-id="' + esc(r.id) + '">Decline</button></div>';
    if (mine && r.status === 'Question') act += '<div class="mini" style="margin-top:12px"><input class="inp" data-note="' + esc(r.id) + '" placeholder="Your answer"><button class="btn sm" data-reply="' + esc(r.id) + '">Send answer</button></div>';
    if (mine && ['Pending', 'Question'].indexOf(r.status) >= 0) act += '<div style="margin-top:8px"><button class="btn ghost sm" data-withdraw="' + esc(r.id) + '">Withdraw request</button></div>';
    return '<div class="card"><h3>' + esc(r.type) + '<span class="sp"></span>' + reqTag(r.status) + '</h3><div class="small muted" style="margin-top:-6px">' + esc(r.id) + ' · ' + esc(r.by) + ' · ' + MON(r.created) +
      (r.from ? ' · for ' + MON(r.from) + (r.to && r.to !== r.from ? ' – ' + MON(r.to) : '') : '') + '</div><p style="margin:10px 0">' + esc(r.details) + '</p><div class="small" style="line-height:2">' + chain + '</div>' +
      (r.status === 'Pending' && r.waiting.length ? '<div class="small muted">Waiting on: ' + esc(r.waiting.join(' / ')) + '</div>' : '') +
      '<details style="margin-top:8px"><summary class="small muted" style="cursor:pointer">History (' + r.history.length + ')</summary><div class="small muted" style="margin-top:6px">' + r.history.map(esc).join('<br>') + '</div></details>' + act + '</div>';
  }
  P.views.requests = { title: 'Permissions', icon: I.ok, render: function (v) {
    T.loading(v); var gone = T.guard();
    get('requests', 'listRequests', null).then(function (d) {
      if (gone()) return;
      var me = T.user().name, past = T.pastoral(), tabs = [['decide', 'Waiting for me (' + d.toDecide.length + ')'], ['mine', 'My requests']].concat(past ? [['all', 'All requests']] : []);
      if (!RF) RF = d.toDecide.length ? 'decide' : 'mine';
      var list = RF === 'decide' ? d.toDecide : RF === 'mine' ? d.mine : d.all;
      P.badges.decide = d.toDecide.length; P.app.nav();
      v.innerHTML = '<div class="tools"><div class="seg" id="rseg">' + tabs.map(function (t) { return '<button class="' + (RF === t[0] ? 'on' : '') + '" data-rf="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><span class="sp" style="flex:1"></span><button class="btn" id="rnew">+ New request</button></div>' +
        '<div class="grid g2" style="align-items:start"><div style="display:grid;gap:14px">' + (list.map(function (r) { return reqCard(r, me); }).join('') || '<div class="card empty">' + (RF === 'decide' ? 'Nothing is waiting for your decision. 🙌' : 'No requests yet.') + '</div>') + '</div>' +
        '<div class="card"><h3>How approvals work</h3><p class="small">Each request goes through the steps set for its type in the <b>Approval Routes</b> tab of the church Sheet. The person at each step is told, and can approve, decline or ask a question. You are told at every step.</p>' +
        d.types.map(function (t) { return '<div class="small" style="margin:6px 0"><b>' + esc(t.type) + '</b><br><span class="muted">' + t.steps.map(esc).join(' → ') + '</span></div>'; }).join('') + '</div></div>';
      $('rseg').onclick = function (e) { var b = e.target.closest('[data-rf]'); if (b) { RF = b.dataset.rf; P.app.render(); } };
      $('rnew').onclick = function () { newRequest(d.types); };
      v.onclick = function (e) {
        var b = e.target.closest('[data-decide],[data-reply],[data-withdraw]'); if (!b) return;
        var id = b.dataset.id || b.dataset.reply || b.dataset.withdraw, n = v.querySelector('[data-note="' + id + '"]'), note = n ? n.value.trim() : '', call;
        if (b.dataset.decide) { if (b.dataset.decide !== 'approve' && !note) { P.toast(b.dataset.decide === 'ask' ? 'Type your question first' : 'Please give a short reason'); return; } call = T.api('decideRequest', { id: id, decision: b.dataset.decide, note: note }); }
        else if (b.dataset.reply) call = T.api('replyRequest', { id: id, note: note });
        else { if (!window.confirm('Withdraw this request?')) return; call = T.api('replyRequest', { id: id, withdraw: true }); }
        T.busy(b, true);
        call.then(function () { P.toast('Saved ✓ Everyone involved has been told.'); refreshBadges(); P.app.render(); }).catch(function (e2) { T.busy(b, false); P.toast(e2.message); });
      };
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };
  function newRequest(types) {
    var t0 = types[0] || { steps: [] };
    T.openDrawer(T.dhead('New request', 'Choose the type; it goes to the right people automatically') + '<div class="db"><div class="card"><div class="form">' +
      '<div class="f full"><label for="qt">Type of request</label><select class="inp" id="qt">' + T.opts(types.map(function (t) { return t.type; }), t0.type) + '</select><div class="small muted" id="qroute" style="margin-top:6px"></div></div>' +
      '<div class="f full"><label for="qd">Details</label><textarea class="inp" id="qd" rows="4" placeholder="What do you need, and why? Include amounts, places or items where relevant."></textarea></div>' +
      '<div class="f"><label for="qf">From (if it has dates)</label><input class="inp" id="qf" type="date"></div><div class="f"><label for="qto">To</label><input class="inp" id="qto" type="date"></div>' +
      '<div class="full" style="display:flex;justify-content:flex-end"><button class="btn" id="qsend">Send request</button></div></div></div></div>');
    var route = function () { var t = types.filter(function (x) { return x.type === $('qt').value; })[0]; $('qroute').textContent = t ? 'Goes to: ' + t.steps.join(' → ') : ''; };
    $('qt').onchange = route; route();
    $('qsend').onclick = function () {
      var b = this; if (!$('qd').value.trim()) { P.toast('Please describe the request'); return; }
      T.busy(b, true);
      T.api('newRequest', { type: $('qt').value, details: $('qd').value.trim(), from: $('qf').value, to: $('qto').value }).then(function (j) {
        P.toast(j.status === 'Approved' ? 'Approved straight away ✓' : 'Sent ✓ Now with ' + j.waiting); RF = 'mine'; P.closeDrawer(); P.app.go('requests');
      }).catch(function (e) { T.busy(b, false); P.toast(e.message); });
    };
  }
  P.newRequest = function () { get('requests', 'listRequests', null).then(function (d) { newRequest(d.types); }).catch(function (e) { P.toast(e.message); }); };

  // ---------- Away & activity log ----------
  function tripRow(a, canBack) {
    return '<div class="row"><div class="av" style="background:var(--amber-l);color:#8d5f0f">✈</div><div class="meta"><b>' + esc(a.name) + ' · ' + esc(a.type) + (a.dest ? ', ' + esc(a.dest) : '') + '</b><span>' + MON(a.from) + ' – ' + MON(a.to) +
      ' · cover: ' + esc(a.cover || 'not arranged') + (a.status === 'Back' ? ' · back ' + MON(a.back) : '') + '</span></div>' +
      (a.status === 'Back' ? '<span class="tag green">Back</span>' : canBack ? '<button class="btn ghost sm" data-back="' + esc(a.id) + '">Mark back</button>' : (a.now ? '<span class="tag amber">Away</span>' : '<span class="tag grey">Planned</span>')) + '</div>';
  }
  P.views.away = { title: 'Away & activity log', icon: I.plane, render: function (v) {
    T.loading(v); var gone = T.guard();
    get('away', 'listAway', null).then(function (d) {
      if (gone()) return;
      var past = T.pastoral(), today = D10(new Date());
      v.innerHTML = '<div class="grid g2" style="align-items:start"><div style="display:grid;gap:16px">' +
        '<div class="card"><h3>Log a trip</h3><div class="form">' +
        '<div class="f"><label for="wt">Type</label><select class="inp" id="wt">' + T.opts(d.types, 'Travel') + '</select></div><div class="f"><label for="wd">Destination</label><input class="inp" id="wd" placeholder="e.g. Lagos"></div>' +
        '<div class="f"><label for="wf">Leaving</label><input class="inp" id="wf" type="date" value="' + today + '"></div><div class="f"><label for="wb">Back</label><input class="inp" id="wb" type="date"></div>' +
        '<div class="f full"><label for="wc">Who covers your duty?</label><input class="inp" id="wc" placeholder="Name, or leave blank if you have no duty"></div>' +
        '<div class="full small muted">Your group leader and department head are told. If you are on the Sunday rota while away, you are taken off and your department head is asked to find cover.</div>' +
        '<div class="full" style="display:flex;justify-content:flex-end"><button class="btn" id="wsave">Save trip</button></div></div></div>' +
        '<div class="card"><h3>My trips</h3>' + (d.mine.map(function (a) { return tripRow(a, true); }).join('') || '<div class="muted small">No trips logged</div>') + '</div></div>' +
        '<div style="display:grid;gap:16px"><div class="card"><h3>Who\'s away now <span class="tag amber">' + d.now.length + '</span></h3>' + (d.now.map(function (a) { return tripRow(a, past); }).join('') || '<div class="muted small">Everyone is home 🙌</div>') + '</div>' +
        (past ? '<div class="card"><h3>Coming up</h3>' + (d.upcoming.map(function (a) { return tripRow(a, true); }).join('') || '<div class="muted small">No planned trips</div>') + '</div>' +
          '<div class="card"><h3>Church activity feed</h3><div class="mini" style="margin-bottom:12px"><input class="inp" id="actx" placeholder="Log an activity, e.g. Hospital visit to Sister Ada"><button class="btn sm" id="actb">Post</button></div><div class="log">' +
          (d.feed.map(function (f) { return '<div class="e">' + esc(f.text) + '<div class="small muted">' + T.fmt(f.time) + '</div></div>'; }).join('') || '<div class="muted small">Nothing yet</div>') + '</div></div>' : '') + '</div></div>';
      $('wsave').onclick = function () {
        var b = this; if (!$('wf').value) { P.toast('Choose the date you leave'); return; }
        T.busy(b, true);
        T.api('logAway', { type: $('wt').value, dest: $('wd').value.trim(), from: $('wf').value, to: $('wb').value || $('wf').value, cover: $('wc').value.trim() }).then(function () {
          P.toast('Trip saved ✓ Your leaders have been told. Safe journey!'); P.app.render();
        }).catch(function (e) { T.busy(b, false); P.toast(e.message); });
      };
      if ($('actb')) $('actb').onclick = function () {
        var b = this, t = $('actx').value.trim(); if (!t) return; T.busy(b, true);
        T.api('logActivity', { text: t }).then(function () { P.toast('Posted ✓'); P.app.render(); }).catch(function (e) { T.busy(b, false); P.toast(e.message); });
      };
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };

  // ---------- My space ----------
  var LEVEL = { 'Member': 1, 'Steward': 3, 'Group leader': 4, 'Department head': 4 };
  P.views.home = { title: 'My space', icon: I.home, render: function (v) {
    T.loading(v); var gone = T.guard();
    get('home', 'home', null).then(function (d) {
      if (gone()) return;
      var u = T.user(), me = d.me, g = d.group, lv = me ? (LEVEL[me.role] || 1) : 0, h = new Date().getHours();
      P.badges.unread = 0; P.app.nav();
      v.innerHTML = '<div class="banner">' + (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', <b>' + esc(u.name.split(' ')[0]) + '</b>. ' +
        (d.notes.filter(function (n) { return !n.read; }).length ? 'You have new messages below.' : 'Here is everything for you in one place.') + '<span class="sp" style="flex:1"></span><button class="btn ghost sm" data-chpin="1">Change my PIN</button></div>' +
        '<div class="grid g3"><div class="card"><h3>My small group</h3>' + (g ? '<b>' + esc(g.name) + '</b><div class="small muted">' + esc(g.day || '') + (g.leader ? ' · leader ' + esc(g.leader) : '') + (g.area ? ' · ' + esc(g.area) : '') + '</div><div class="small" style="margin-top:8px">Last meeting: ' + (g.last ? MON(g.last.date) + (g.last.notes ? ' – ' + esc(g.last.notes) : '') : 'no report yet') + '</div>' : '<div class="small muted">' + (me ? 'Not in a small group yet. Ask a leader to add you.' : 'Your name is not in the Members directory yet.') + '</div>') + '</div>' +
        '<div class="card"><h3>My service</h3><b>' + esc((me && me.dept) || 'Not serving yet') + '</b>' + (d.duties.length ? d.duties.map(function (x) {
          return '<div class="row"><div class="meta"><b>' + MON(x.sunday) + '</b><span>' + esc(x.dept) + '</span></div>' + (x.status === 'Scheduled' ? '<button class="btn sm" data-duty="Confirmed" data-sun="' + esc(x.sunday) + '" data-dept="' + esc(x.dept) + '">Confirm</button><button class="btn ghost sm" data-duty="Can\'t make it" data-sun="' + esc(x.sunday) + '" data-dept="' + esc(x.dept) + '">Can\'t make it</button>' : dutyTag(x.status)) + '</div>';
        }).join('') : '<div class="small muted">' + (me && me.dept ? 'No duty scheduled yet' : 'Speak to a department head to start serving') + '</div>') + '</div>' +
        (d.grid && d.grid.length ? '<div class="card" style="grid-column:1/-1"><h3>My parts in upcoming services</h3>' + d.grid.map(function (x) {
          return '<div class="row"><div class="meta"><b>' + esc(x.description) + (x.team ? ' · ' + esc(x.team) : '') + '</b><span>' + MON(x.date) + ' · ' + esc(x.title) + ' · ' + esc(x.start) + ' (' + x.minutes + ' min)' + (x.callup ? ' · call-up ' + esc(x.callup) : '') + '</span></div>' +
            (x.status === 'Notified' ? '<button class="btn sm" data-gans="Confirmed" data-s="' + esc(x.service) + '" data-i="' + esc(x.item) + '">Confirm</button><button class="btn ghost sm" data-gans="Can\'t make it" data-s="' + esc(x.service) + '" data-i="' + esc(x.item) + '">Can\'t make it</button>' : dutyTag(x.status || 'Notified')) +
            '<button class="btn ghost sm" data-svc="' + esc(x.service) + '">View grid</button></div>';
        }).join('') + '</div>' : '') +
        '<div class="card"><h3>My requests<span class="sp"></span><button class="btn sm" id="hreq">+ New</button></h3>' + (d.requests.map(function (r) { return '<div class="row click" data-go="requests"><div class="meta"><b>' + esc(r.type) + '</b><span>' + MON(r.created) + '</span></div>' + reqTag(r.status) + '</div>'; }).join('') || '<div class="small muted">None</div>') + '</div></div>' +
        '<div class="grid g2" style="margin-top:16px"><div class="card"><h3>Messages for me</h3><div class="log">' + (d.notes.map(function (n) { return '<div class="e"' + (n.read ? '' : ' style="font-weight:600"') + '>' + (n.read ? '' : '<span class="tag gold">New</span> ') + esc(n.text) + '<div class="small muted" style="font-weight:400">' + T.fmt(n.time) + '</div></div>'; }).join('') || '<div class="muted small">No messages yet</div>') + '</div></div>' +
        '<div style="display:grid;gap:16px;align-content:start">' + (me ? '<div class="card"><h3>My growth track</h3><div class="tl">' + ['Membership', 'TECI', 'Serving', 'Leadership'].map(function (s, i) { return '<div class="s ' + (i < lv - 1 ? 'done' : i === lv - 1 ? 'cur' : '') + '"><i>' + (i < lv - 1 ? '✓' : i + 1) + '</i>' + s + '</div>'; }).join('') + '</div></div>' : '') +
        '<div class="card"><h3>My trips<span class="sp"></span><button class="btn ghost sm" data-go="away">Log a trip</button></h3>' + (d.away.map(function (a) { return tripRow(a, true); }).join('') || '<div class="muted small">No trips logged</div>') + '</div></div></div>';
      $('hreq').onclick = function () { P.newRequest(); };
      v.onclick = function (e) {
        var g = e.target.closest('[data-gans]');
        if (g) { T.busy(g, true); T.api('answerItem', { service: g.dataset.s, item: g.dataset.i, answer: g.dataset.gans }).then(function () { P.toast(g.dataset.gans === 'Confirmed' ? 'Thank you! Confirmed ✓' : 'The grid builder has been told'); refreshBadges(); P.app.render(); }).catch(function (e2) { T.busy(g, false); P.toast(e2.message); }); return; }
        var b = e.target.closest('[data-duty]'); if (!b) return;
        T.busy(b, true);
        T.api('answerDuty', { sunday: b.dataset.sun, dept: b.dataset.dept, answer: b.dataset.duty }).then(function () { P.toast(b.dataset.duty === 'Confirmed' ? 'Thank you! Duty confirmed ✓' : 'Your department head has been told'); refreshBadges(); P.app.render(); })
          .catch(function (e2) { T.busy(b, false); P.toast(e2.message); });
      };
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };
  // "Mark back" works on any screen
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-back]'); if (!b) return;
    T.busy(b, true);
    T.api('markBack', { id: b.dataset.back }).then(function () { P.toast('Welcome back ✓'); P.app.render(); }).catch(function (e2) { T.busy(b, false); P.toast(e2.message); });
  });

  // ---------- Sunday rota (inside the Stewards screen) ----------
  var RS = null;
  P.rotaBox = function (box) {
    if (!box) return;
    if (!RS) RS = D10(nextSun(new Date()));
    box.innerHTML = '<div class="card muted" style="margin-bottom:16px">Loading the rota…</div>';
    var draw = function (r) {
      var gaps = 0, conf = 0, total = 0;
      r.departments.forEach(function (d) { d.rows.forEach(function (x) { total++; if (x.status === 'Gap' || x.status === "Can't make it" || x.status === 'Away') gaps++; if (x.status === 'Confirmed') conf++; }); });
      box.innerHTML = '<div class="card" style="margin-bottom:16px"><h3>Sunday rota<span class="sp"></span><button class="btn ghost sm" data-rs="-7" aria-label="Previous Sunday">‹</button><b>' + MON(r.sunday) + '</b><button class="btn ghost sm" data-rs="7" aria-label="Next Sunday">›</button></h3>' +
        (r.built ? '<div class="small muted" style="margin:-4px 0 10px">' + conf + ' of ' + total + ' confirmed' + (gaps ? ' · <b style="color:var(--red)">' + gaps + ' gap(s) to fill</b>' : ' · no gaps') + '. People on the away log are skipped automatically.</div>' :
          '<div class="small muted" style="margin:-4px 0 10px">Not built yet. Building picks stewards fairly (fewest duties in the last 6 months first) and skips anyone away. It is built automatically on the rota build day once the daily reminders are turned on.</div>') +
        '<div class="grid g3">' + r.departments.filter(function (d) { return d.need || d.rows.length; }).map(function (d) {
          return '<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px"><b>' + esc(d.name) + '</b> <span class="small muted">needs ' + d.need + '</span>' + (d.rows.map(function (x) {
            return '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:13px"><span>' + esc(x.steward || '—') + '</span>' + dutyTag(x.status) + '</div>';
          }).join('') || '<div class="small muted" style="margin-top:6px">—</div>') + '</div>';
        }).join('') + '</div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn' + (r.built ? ' ghost' : '') + ' sm" id="rbuild">' + (r.built ? 'Rebuild (keeps confirmed)' : 'Build rota') + '</button></div></div>';
      box.querySelectorAll('[data-rs]').forEach(function (b) { b.onclick = function () { var x = new Date(RS); x.setDate(x.getDate() + Number(b.dataset.rs)); RS = D10(x); P.rotaBox(box); }; });
      $('rbuild').onclick = function () {
        var b = this; T.busy(b, true);
        T.api('buildRota', { sunday: RS }).then(function (j) { P.toast('Rota built: ' + j.scheduled + ' scheduled' + (j.gaps.length ? ' · gaps in ' + j.gaps.join(', ') : ' · no gaps') + '. Stewards have been told.'); draw(j.rota); })
          .catch(function (e) { T.busy(b, false); P.toast(e.message); });
      };
    };
    T.api('getRota', { sunday: RS }).then(function (j) { draw(j.rota); }).catch(function (e) { box.innerHTML = '<div class="card small muted" style="margin-bottom:16px">Rota: ' + esc(e.message) + '</div>'; });
  };
  function nextSun(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + ((7 - x.getDay()) % 7)); return x; }

  // Admin & settings now lives in admin.js (step 5).
})();
