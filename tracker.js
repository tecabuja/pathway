/* Pathway step 2: follow-ups, converts, pathway board, person profile, members, small groups, stewards.
   Lists are kept on the phone so they can be read offline; changes need internet. */
(function () {
  var P = window.Pathway; P.views = P.views || {};
  var esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ic = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var I = {
    ppl: ic('<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5.5-5-6.5"/>'),
    path: ic('<circle cx="5" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><path d="M7.5 12h2M14.5 12h2"/>'),
    task: ic('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'),
    grp: ic('<path d="M3 21h18M5 21V10l7-6 7 6v11"/><path d="M10 21v-6h4v6"/>'),
    star: ic('<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7L2 9.3l7-.8z"/>'),
    mem: ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
    phone: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3z"/></svg>'
  };
  var S = {}, KEYS = ['lookups', 'people', 'members', 'groups', 'stewards', 'dash', 'requests', 'away', 'home', 'admin'];
  var F = { q: '', stage: 0, status: 'All' }, MF = { q: '', role: 'All', bday: false }, MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ---------- data ----------
  function user() { return P.app.user() || {}; }
  function pastoral() { return ['Admin', 'Leader'].indexOf(user().role) >= 0; }
  function api(action, data) {
    if (!P.online()) return Promise.reject(new Error('You are offline. This change needs internet; please try again when connected.'));
    if (!/^(list|get|lookups|badges|home|dashboard|adminList|adminInfo|gridLookups|config|checkPhone)/.test(action)) P._force = true; // a change was made: next screen loads fresh
    return P.call(action, Object.assign({ token: P.get('token') }, data || {})).catch(function (e) {
      if (e.auth) P.app.showLogin(e.message);
      throw e;
    });
  }
  /** Gets a list: from memory, else the church server; falls back to the copy saved on this phone. */
  function load(key, action, force) {
    if (S[key] && !force) return Promise.resolve(S[key]);
    var saved = P.get('c_' + key);
    if (!P.online()) return saved ? Promise.resolve(S[key] = saved) : Promise.reject(new Error('You are offline and this list has not been opened on this phone yet.'));
    return api(action).then(function (j) { S[key] = j; P.set('c_' + key, j); return j; }).catch(function (e) {
      if (e.network && saved) { P.toast('Weak connection: showing the last saved copy'); return (S[key] = saved); }
      throw e;
    });
  }
  var RT = 0;
  function gone(tk, vw) { return tk !== RT || P.app.view() !== vw; } // a newer screen has been opened since
  function stale() { [].slice.call(arguments).forEach(function (k) { S[k] = null; }); }
  P.clearCache = function () {
    KEYS.forEach(function (k) { S[k] = null; P.set('c_' + k, null); }); P.taskCount = 0;
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('pw_c_') === 0) localStorage.removeItem(k); }); } catch (e) {}
    Object.keys(S).forEach(function (k) { S[k] = null; });
  };

  // ---------- helpers ----------
  function nm(p) { return (p.first + ' ' + p.last).trim(); }
  function ini(n) { return String(n || '?').split(/\s+/).map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase(); }
  function fmt(d) { if (!d) return '—'; var x = new Date(d); return isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function ago(n) { return n == null ? 'never' : n === 0 ? 'today' : n === 1 ? 'yesterday' : n + 'd ago'; }
  function daysIn(d) { if (!d) return null; return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 864e5)); }
  function stTag(s) { return s === 'Stalled' ? '<span class="tag red">Stalled</span>' : s === 'Active' ? '<span class="tag green">Active</span>' : s === 'New' ? '<span class="tag gold">New</span>' : '<span class="tag grey">' + esc(s) + '</span>'; }
  function actTag(p, cls) { return '<span class="tag ' + (p.color === 'teal' ? '' : p.color) + (cls ? ' ' + cls : '') + '">' + esc(p.action) + '</span>'; }
  function closed(p) { return /moved away|not interested/i.test(p.status); }
  function stages() { return (S.lookups && S.lookups.stages) || P.config().stages || []; }
  function stageName(n) { var s = stages().filter(function (x) { return x.n === n; })[0]; return s ? s.name : 'Stage ' + n; }
  function short(n) { return stageName(n).split(' / ')[0]; }
  function digits(ph) { return String(ph || '').replace(/[^\d]/g, ''); }
  function tel(p) { return 'tel:+' + digits(p.phone); }
  function wa(p) {
    var me = (user().name || '').split(' ')[0], ch = P.config().church || 'The Elevation Church';
    return 'https://wa.me/' + digits(p.phone) + '?text=' + encodeURIComponent('Hi ' + p.first + ', it\'s ' + me + ' from ' + ch + ' 😊 We are so glad you made a decision with us. How are you doing this week?');
  }
  function opts(list, cur, blank) {
    return (blank != null ? '<option value="">' + esc(blank) + '</option>' : '') + list.map(function (x) {
      var v = typeof x === 'string' ? x : x.v, l = typeof x === 'string' ? x : x.l;
      return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }
  function loading(v) { v.innerHTML = '<div class="card muted">Loading… <span class="small">(the church server can take a few seconds)</span></div>'; }
  function fail(v, e) { v.innerHTML = '<div class="card"><h3>Could not load this list</h3><p class="muted">' + esc(e.message) + '</p><button class="btn sm" data-reload="1">Try again</button></div>'; }
  function csv(name, rows) {
    var t = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + t], { type: 'text/csv' }));
    a.download = name + ' ' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    P.toast('Downloaded ' + (rows.length - 1) + ' rows (opens in Excel)');
  }
  function busy(btn, on) { if (btn) btn.disabled = on; }
  function needsAttention(p) { return !closed(p) && (p.color !== 'teal' || (p.days != null && p.days > 7)); }
  function setTasks(people) { P.taskCount = people.filter(needsAttention).length; P.app.nav(); }

  // ---------- drawer ----------
  function openDrawer(html) {
    $('drawer').innerHTML = html; $('drawer').classList.add('open'); $('ov').classList.add('open');
    document.body.classList.add('locked'); $('drawer').scrollTop = 0;
  }
  P.closeDrawer = function () {
    var d = $('drawer'); if (!d || !d.classList.contains('open')) return;
    d.classList.remove('open'); $('ov').classList.remove('open'); document.body.classList.remove('locked');
    if (S._dirty) { S._dirty = false; P.app.render(); }
  };
  function dhead(t, sub, extra) {
    return '<div class="dh"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div style="display:flex;gap:14px;align-items:center;min-width:0"><div class="av">' + esc(ini(t)) + '</div><div style="min-width:0"><div style="font-size:20px;font-weight:700;overflow-wrap:anywhere">' + esc(t) + '</div><div class="small" style="opacity:.85">' + sub + '</div></div></div><button class="x" data-close="1" aria-label="Close">×</button></div>' + (extra || '') + '</div>';
  }

  // ---------- My follow-ups ----------
  P.views.tasks = { title: 'My follow-ups', icon: I.task, render: function (v) {
    loading(v); var tk = ++RT, vw = P.app.view();
    Promise.all([load('lookups', 'lookups'), load('people', 'listPeople')]).then(function (r) {
      if (gone(tk, vw)) return;
      var ppl = r[1].people, rank = { red: 0, amber: 1, teal: 2 };
      var t = ppl.filter(needsAttention).sort(function (a, b) { return (rank[a.color] - rank[b.color]) || ((b.days || 0) - (a.days || 0)); });
      setTasks(ppl);
      var red = t.filter(function (p) { return p.color === 'red'; }).length, rl = S.lookups.rules;
      v.innerHTML = '<div class="banner">📅 ' + (t.length ? 'You have <b>' + t.length + ' follow-up' + (t.length > 1 ? 's' : '') + '</b>' + (red ? ', <b>' + red + '</b> to do today (red)' : '') + '.' : 'All caught up. 🙌') +
        ' New converts should be contacted within ' + rl.deadline + ' hours; anyone without contact for ' + rl.stall + ' days shows as stalled.<span class="sp"></span><button class="btn ghost sm" data-reload="1">Refresh</button></div>' +
        '<div class="card">' + (t.map(function (p) {
          return '<div class="row click" data-person="' + esc(p.id) + '"><div class="av">' + esc(ini(nm(p))) + '</div><div class="meta"><b>' + esc(nm(p)) + '</b><span>' + esc(short(p.stage)) + ' · last contact ' + ago(p.lastContact ? p.days : null) + (p.lang ? ' · prefers ' + esc(p.lang) : '') + (pastoral() ? ' · ' + esc(p.owner) : '') + '</span><div class="hide-d" style="margin-top:4px">' + actTag(p) + '</div></div>' +
            actTag(p, 'hide-m') + '<a class="btn ghost sm" href="' + tel(p) + '" data-stop="1" aria-label="Call">' + I.phone + '</a>' +
            (p.wa ? '<a class="btn ghost sm wa" href="' + wa(p) + '" target="_blank" rel="noopener" data-stop="1" aria-label="WhatsApp">' + I.wa + '</a>' : '') + '</div>';
        }).join('') || '<div class="empty">Nobody needs a follow-up right now. 🙌</div>') + '</div>';
    }).catch(function (e) { if (!gone(tk, vw)) fail(v, e); });
  } };

  // ---------- Converts ----------
  function peopleRows() {
    var ppl = (S.people && S.people.people) || [], q = F.q.toLowerCase();
    return ppl.filter(function (p) {
      if (F.stage && p.stage !== F.stage) return false;
      if (F.status !== 'All' && p.status !== F.status) return false;
      return !q || (nm(p) + ' ' + p.phone + ' ' + p.email + ' ' + p.area + ' ' + p.id + ' ' + p.owner).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return a.created < b.created ? 1 : -1; });
  }
  function drawPeopleTable() {
    var ps = peopleRows();
    $('ptable').innerHTML = '<table><thead><tr><th>Name</th><th>Stage</th><th class="hm">' + P.esc(P.cw()) + ' · Area</th><th class="hm">In charge</th><th class="hm">Last contact</th><th>Status</th></tr></thead><tbody>' +
      (ps.map(function (p) {
        return '<tr class="click" data-person="' + esc(p.id) + '"><td><div style="display:flex;gap:10px;align-items:center"><div class="av">' + esc(ini(nm(p))) + '</div><div><b>' + esc(nm(p)) + '</b>' + (p.dup ? ' <span class="tag amber" title="Same phone as ' + esc(p.dup) + '">Check duplicate</span>' : '') + '<div class="small muted">' + esc(p.phone) + '</div></div></div></td>' +
          '<td><span class="tag">' + p.stage + '. ' + esc(short(p.stage)) + '</span></td><td class="hm">' + esc(p.campus || '—') + (p.area ? ' · ' + esc(p.area) : '') + '</td>' +
          '<td class="hm">' + (p.owner === 'Unassigned' ? '<span class="tag red">Unassigned</span>' : esc(p.owner)) + '</td><td class="hm">' + ago(p.lastContact ? daysIn(p.lastContact) : null) + '</td><td>' + stTag(p.status) + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="empty">No one matches these filters</td></tr>') + '</tbody></table>';
    $('pcount').textContent = ps.length + ' people';
  }
  P.views.people = { title: 'Converts', icon: I.ppl, render: function (v) {
    loading(v); var tk = ++RT, vw = P.app.view();
    Promise.all([load('lookups', 'lookups'), load('people', 'listPeople')]).then(function (r) {
      if (gone(tk, vw)) return;
      setTasks(r[1].people);
      v.innerHTML = '<div class="tools"><input class="inp" id="pq" style="flex:1;min-width:180px" placeholder="Search name, phone, email, area…" value="' + esc(F.q) + '">' +
        '<select class="inp" id="pstage"><option value="0">All stages</option>' + stages().map(function (s) { return '<option value="' + s.n + '"' + (F.stage === s.n ? ' selected' : '') + '>' + s.n + '. ' + esc(s.name) + '</option>'; }).join('') + '</select>' +
        '<div class="seg" id="pseg">' + ['All', 'New', 'Active', 'Stalled', 'Moved away'].map(function (s) { return '<button class="' + (F.status === s ? 'on' : '') + '" data-st="' + s + '">' + s + '</button>'; }).join('') + '</div>' +
        (pastoral() ? '<button class="btn ghost sm" id="pexp">Export</button>' : '') + '<button class="btn sm" data-go="capture">+ New</button></div>' +
        '<div class="card tablecard" id="ptable"></div><div class="small muted" style="margin-top:8px"><span id="pcount"></span> · tap a name to open their journey</div>';
      drawPeopleTable();
      $('pq').oninput = function () { F.q = this.value; drawPeopleTable(); };
      $('pstage').onchange = function () { F.stage = +this.value; drawPeopleTable(); };
      $('pseg').onclick = function (e) { var b = e.target.closest('[data-st]'); if (!b) return; F.status = b.dataset.st; [].forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); }); drawPeopleTable(); };
      if ($('pexp')) $('pexp').onclick = function () {
        csv('Pathway converts', [['ID', 'First name', 'Last name', 'Phone', 'Email', P.cw(), 'Area', 'Stage', 'In charge', 'Small group', 'Status', 'Last contact', 'Source', 'Created']].concat(peopleRows().map(function (p) {
          return [p.id, p.first, p.last, p.phone, p.email, p.campus, p.area, p.stage + '. ' + stageName(p.stage), p.owner, p.group, p.status, fmt(p.lastContact), p.source, fmt(p.created)];
        })));
      };
    }).catch(function (e) { if (!gone(tk, vw)) fail(v, e); });
  } };

  // ---------- Pathway board ----------
  function pathway(ps) {
    var st = stages(), reached = st.map(function (s) { return ps.filter(function (p) { return p.stage >= s.n; }).length; });
    return '<div class="path">' + st.map(function (s, i) {
      return '<div class="st" data-stagefilter="' + s.n + '">' + (i < st.length - 1 ? '<span class="conv">' + (reached[i] ? Math.round(reached[i + 1] / reached[i] * 100) : 0) + '%</span>' : '') +
        '<div class="c">' + ps.filter(function (p) { return p.stage === s.n; }).length + '</div><div class="nm">' + esc(s.name) + '</div><div class="cv">' + reached[i] + ' reached</div></div>';
    }).join('') + '</div>';
  }
  P.views.path = { title: 'Pathway board', icon: I.path, render: function (v) {
    loading(v); var tk = ++RT, vw = P.app.view();
    Promise.all([load('lookups', 'lookups'), load('people', 'listPeople')]).then(function (r) {
      if (gone(tk, vw)) return;
      var ps = r[1].people.filter(function (p) { return !closed(p); }), st = stages();
      v.innerHTML = '<div class="card" style="margin-bottom:16px"><h3>Convert lifecycle <span class="tag gold">tap a stage to see the people</span><span class="sp"></span><span class="small muted hide-m">% = moved on to the next stage</span></h3>' + pathway(ps) + '</div>' +
        '<div class="small muted" style="margin-bottom:10px">Each column is a stage. Use → to move someone forward; the date and who moved them are recorded automatically.</div>' +
        '<div class="board">' + st.map(function (s, i) {
          var c = ps.filter(function (p) { return p.stage === s.n; });
          return '<div class="col"><h4><span>' + s.n + '. ' + esc(s.name) + '</span><span class="tag">' + c.length + '</span></h4>' + c.map(function (p) {
            var d = daysIn(p.stageDate);
            return '<div class="pc" data-person="' + esc(p.id) + '"><b>' + esc(nm(p)) + '</b><span class="muted">' + esc(p.campus || P.cw() + ' not set') + ' · ' + esc(p.owner) + '</span><div class="ft">' + stTag(p.status) + '<span class="muted">' + (d == null ? '' : d + 'd here') + '</span>' +
              (i < st.length - 1 ? '<button class="btn sm" data-advance="' + esc(p.id) + '" data-to="' + st[i + 1].n + '" title="Move to ' + esc(st[i + 1].name) + '">→</button>' : '') + '</div></div>';
          }).join('') + '</div>';
        }).join('') + '</div>';
    }).catch(function (e) { if (!gone(tk, vw)) fail(v, e); });
  } };
  function advance(id, to, btn, after) {
    busy(btn, true);
    return api('moveStage', { id: id, to: to }).then(function (j) {
      var p = ((S.people && S.people.people) || []).filter(function (x) { return x.id === id; })[0] || S._open;
      P.toast((p ? p.first + ' ' : '') + 'moved to ' + j.stageName + ' ✓' + (j.joinedMembers ? ' · added to the Members directory' : '') + (j.needsGroup ? ' · now choose a small group' : ''));
      stale('people'); if (j.joinedMembers) stale('members');
      if (after) after(j); else P.app.render();
    }).catch(function (e) { busy(btn, false); P.toast(e.message); });
  }

  // ---------- Person profile ----------
  function openPerson(id) {
    openDrawer(dhead('Loading…', ''));
    api('getPerson', { id: id }).catch(function (e) {
      if (!e.network) throw e;
      var p = ((S.people && S.people.people) || []).filter(function (x) { return x.id === id; })[0];
      if (!p) throw e;
      P.toast('Offline: showing basic details only');
      return { person: Object.assign({ offline: true, history: [], followups: [], needs: [], milestones: [], suggest: [] }, p) };
    }).then(function (j) { drawPerson(j.person); }).catch(function (e) { openDrawer(dhead('Could not open', esc(e.message))); });
  }
  function drawPerson(p) {
    var L = S.lookups || {}, st = stages(), cur = p.stage, canP = pastoral(), last = st.length ? st[st.length - 1].n : cur;
    var reach = {}; (p.history || []).forEach(function (h) { var s = st.filter(function (x) { return x.name === h.to; })[0]; if (s) reach[s.n] = h; });
    var nextS = st.filter(function (s) { return s.n > cur; })[0];
    var btns = '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><a class="btn gold sm" href="' + tel(p) + '">' + I.phone + ' Call</a>' +
      (p.wa ? '<a class="btn sm wa" href="' + wa(p) + '" target="_blank" rel="noopener">' + I.wa + ' WhatsApp</a>' : '') +
      (p.email ? '<a class="btn ghost sm" href="mailto:' + esc(p.email) + '">Email</a>' : '') + '</div>';
    var h = dhead(nm(p), esc(p.id) + (p.decision ? ' · ' + esc(p.decision) : '') + (p.source ? ' · ' + esc(p.source) : '') + ', ' + fmt(p.created), btns) + '<div class="db">';
    if (p.offline) h += '<div class="banner red">📴 Offline: only the basic details saved on this phone are shown. Changes need internet.</div>';
    if (p.dup) h += '<div class="warn">⚠ Possible duplicate of <b>' + esc(p.dup) + '</b> (same phone number). An admin can check both records in the Sheet.</div>';
    // journey
    h += '<div class="card"><h3>Journey<span class="sp"></span>' + stTag(p.status) + '</h3><div class="tl">' + st.map(function (s) {
      var c = s.n < cur ? 'done' : s.n === cur ? 'cur' : '', d = s.n === cur ? p.stageDate : (reach[s.n] && reach[s.n].time);
      return '<div class="s ' + c + '"><i>' + (s.n < cur ? '✓' : s.n) + '</i>' + esc(s.name.split(' / ')[0]) + '<div class="muted">' + (d ? fmt(d).replace(/ \d{4}$/, '') : '—') + '</div></div>';
    }).join('') + '</div><div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">' + (closed(p) ? '' : '<span class="tag ' + (p.color === 'teal' ? '' : p.color) + '">Next step: ' + esc(p.action) + '</span>') + '<span class="sp" style="flex:1"></span>' +
      (nextS ? '<button class="btn sm" id="padv" data-to="' + nextS.n + '">Move to ' + esc(nextS.name.split(' / ')[0]) + ' →</button>' : '<span class="tag green">Pathway complete</span>') + '</div>' +
      (canP ? '<div class="mini" style="margin-top:12px"><span class="small muted">Correct the stage:</span><select class="inp" id="psetst">' + opts(st.map(function (s) { return { v: s.n, l: s.n + '. ' + s.name }; }), cur) + '</select><button class="btn ghost sm" id="psetbtn">Save</button></div>' : '') + '</div>';
    // who's in charge
    var workers = (L.workers || []).filter(function (w) { return /follow-up/i.test(w.role); }).map(function (w) { return { v: w.name, l: w.name + (w.campus ? ' (' + w.campus + ')' : '') }; });
    if (p.owner !== 'Unassigned' && !workers.some(function (w) { return w.v === p.owner; })) workers.unshift({ v: p.owner, l: p.owner });
    var groups = (L.groups || []).map(function (g) { return { v: g.name, l: g.name + (g.area ? ' · ' + g.area : '') + (g.day ? ' · ' + g.day : '') }; });
    h += '<div class="card"><h3>Who\'s in charge</h3><div class="kv">' +
      '<div><span class="k">Follow-up worker</span>' + (canP ? '<select class="inp" id="powner" style="padding:6px">' + opts([{ v: 'Unassigned', l: 'Unassigned' }].concat(workers), p.owner) + '</select>' : esc(p.owner)) + '</div>' +
      '<div><span class="k">Small group</span><select class="inp" id="pgroup" style="padding:6px">' + opts(groups, p.group, groups.length ? 'Not in a group yet' : 'No groups in the Sheet yet') + '</select></div>' +
      (canP ? '<div><span class="k">Status</span><select class="inp" id="pstatus" style="padding:6px">' + opts(L.statuses || ['New', 'Active', 'Moved away', 'Not interested'], (L.statuses || []).indexOf(p.status) >= 0 ? p.status : 'Active') + '</select></div>' : '') +
      '<div><span class="k">Members directory</span>' + (p.isMember ? '<span class="tag green">✓ Member</span>' : '<span class="muted">Joins after Membership Class</span>') + '</div></div>';
    if (p.suggest && p.suggest.length) h += '<div class="warn" style="margin-top:12px"><b>Suggested small groups</b> (same ' + P.esc(P.cw(0,1)) + ', nearest area, with space):<br>' + p.suggest.map(function (g) {
      return '<button class="btn ghost sm" style="margin:6px 6px 0 0" data-pickgroup="' + esc(g.name) + '">' + esc(g.name) + ' · ' + esc(g.day || '') + ' · ' + g.members + '/' + g.capacity + (g.near ? ' · near' : '') + '</button>';
    }).join('') + '</div>';
    if ((p.history || []).length) h += '<div class="small" style="margin-top:14px"><b>Stage history</b>' + p.history.slice().reverse().map(function (x) {
      return '<div class="muted">' + fmt(x.time) + ': ' + (x.from ? esc(x.from) + ' → ' : '') + esc(x.to) + ' · by ' + esc(x.by) + '</div>';
    }).join('') + '</div>';
    h += '</div>';
    // details
    var ms = L.milestones || ['Water baptism', 'Serving team'];
    h += '<div class="card"><h3>Details<span class="sp"></span>' + (!p.offline && (canP || p.owner === user().name) ? '<button class="btn ghost sm" id="pedit">Edit details</button>' : '') + '</h3><div class="kv">' +
      '<div><span class="k">Phone</span>' + esc(p.phone) + (p.wa ? ' <span class="tag green">WhatsApp</span>' : '') + '</div><div><span class="k">Email</span>' + esc(p.email || '—') + '</div>' +
      '<div><span class="k">Gender · Age</span>' + esc(p.gender || '—') + ' · ' + esc(p.age || '—') + '</div><div><span class="k">' + P.esc(P.cw()) + ' · Area</span>' + esc(p.campus || '—') + ' · ' + esc(p.area || '—') + '</div>' +
      '<div><span class="k">Language · Prefers</span>' + esc(p.lang || '—') + ' · ' + esc(p.contact || '—') + '</div><div><span class="k">Captured by</span>' + esc(p.capturedBy || '—') + '</div>' +
      '<div><span class="k">Care needs</span>' + ((p.needs || []).length ? p.needs.map(function (n) { return '<span class="tag amber">' + esc(n) + '</span>'; }).join(' ') : '—') + '</div>' +
      '<div><span class="k">Consent</span>' + (p.consent ? '✓ Given ' + fmt(p.consentDate) : (p.offline ? '—' : '✗ Not recorded')) + '</div>' +
      '<div class="full" style="grid-column:1/-1"><span class="k">Milestones (tap to tick)</span><div class="chips" id="pms" style="margin-top:4px">' + ms.map(function (m) { return '<span class="chip' + ((p.milestones || []).indexOf(m) >= 0 ? ' on' : '') + '" role="button" tabindex="0">' + esc(m) + '</span>'; }).join('') + '</div></div></div>' +
      (p.prayer ? '<div class="warn" style="margin-top:12px"><b>Prayer note</b> <span class="muted">(pastoral team only)</span><br>' + esc(p.prayer) + '</div>' : '') + '</div>';
    // follow-up log
    var types = L.followupTypes || ['Call', 'WhatsApp', 'Visit', 'SMS'];
    h += '<div class="card"><h3>Follow-up log</h3><div class="mini" style="margin-bottom:8px"><select class="inp" id="lt">' + opts(types, types[0]) + '</select><input class="inp" id="lo" placeholder="What happened? e.g. Reached, will attend Sunday"></div>' +
      '<div class="mini" style="margin-bottom:14px"><input class="inp" id="ln2" placeholder="Next action (optional)"><input class="inp" id="ld" type="date" aria-label="Next action date" style="flex:0 1 160px"><button class="btn sm" id="lbtn2">Log</button></div>' +
      '<div class="log">' + ((p.followups || []).map(function (l) {
        return '<div class="e"><b>' + esc(l.type) + '</b> · ' + esc(l.outcome) + (l.next ? '<div class="small">Next: ' + esc(l.next) + (l.nextDate ? ' by ' + fmt(l.nextDate) : '') + '</div>' : '') + '<div class="small muted">' + fmt(l.time) + ' · ' + esc(l.by) + '</div></div>';
      }).join('') || '<div class="muted small">No contact logged yet</div>') + '</div></div>' +
      (user().role === 'Admin' && !p.offline ? '<div class="card"><h3>Data protection</h3><p class="small muted" style="margin-top:-6px">Only if this person asks the church to delete their details. Their name, phone, email, area, care needs and prayer note are removed; anonymous counts stay.</p><button class="btn ghost sm" id="pdel" style="color:var(--red)">Delete personal details</button></div>' : '') + '</div>';
    openDrawer(h);
    bindPerson(p);
  }
  function bindPerson(p) {
    S._open = p;
    var re = function () { S._dirty = true; stale('people'); openPerson(p.id); };
    var upd = function (ch, msg) { return api('updatePerson', { id: p.id, changes: ch }).then(function () { P.toast(msg); re(); }).catch(function (e) { P.toast(e.message); re(); }); };
    if ($('padv')) $('padv').onclick = function () { advance(p.id, +this.dataset.to, this, function () { S._dirty = true; openPerson(p.id); }); };
    if ($('psetbtn')) $('psetbtn').onclick = function () { advance(p.id, +$('psetst').value, this, function () { S._dirty = true; openPerson(p.id); }); };
    if ($('powner')) $('powner').onchange = function () { upd({ owner: this.value }, this.value === 'Unassigned' ? 'Now unassigned' : 'Now in the care of ' + this.value + ' ✓'); };
    if ($('pstatus')) $('pstatus').onchange = function () { upd({ status: this.value }, 'Status set to ' + this.value); };
    $('pgroup').onchange = function () { upd({ group: this.value }, this.value ? 'Added to ' + this.value + ' ✓' : 'Removed from small group'); };
    [].forEach.call(document.querySelectorAll('[data-pickgroup]'), function (b) { b.onclick = function () { upd({ group: b.dataset.pickgroup }, 'Added to ' + b.dataset.pickgroup + ' ✓'); }; });
    $('pms').onclick = function (e) {
      var c = e.target.closest('.chip'); if (!c) return; c.classList.toggle('on');
      upd({ milestones: [].map.call(this.querySelectorAll('.chip.on'), function (x) { return x.textContent; }) }, 'Milestones saved ✓');
    };
    if ($('pedit')) $('pedit').onclick = function () { editPerson(p); };
    if ($('pdel')) $('pdel').onclick = function () {
      if (!window.confirm('Permanently remove ' + nm(p) + '\'s personal details? This cannot be undone.')) return;
      api('deletePersonData', { id: p.id }).then(function () { P.toast('Personal details removed'); stale('people', 'members'); S._dirty = true; P.closeDrawer(); }).catch(function (e) { P.toast(e.message); });
    };
    $('lbtn2').onclick = function () {
      var b = this; busy(b, true);
      api('logFollowUp', { id: p.id, type: $('lt').value, outcome: $('lo').value.trim(), next: $('ln2').value.trim(), nextDate: $('ld').value }).then(function () {
        P.toast('Follow-up logged ✓'); re();
      }).catch(function (e) { busy(b, false); P.toast(e.message); });
    };
  }

  function editPerson(p) {
    var num = String(p.phone).split(' ').pop(), cc = p.cc || String(p.phone).split(' ')[0] || '+234';
    var sel = function (id, list, cur, blank) { return '<select class="inp" id="' + id + '">' + opts(list, cur, blank) + '</select>'; };
    openDrawer(dhead('Edit details', esc(nm(p)) + ' · ' + esc(p.id)) + '<div class="db"><div class="card"><div class="form">' +
      '<div class="f"><label for="e1">First name *</label><input class="inp" id="e1" value="' + esc(p.first) + '"></div><div class="f"><label for="e2">Last name</label><input class="inp" id="e2" value="' + esc(p.last) + '"></div>' +
      '<div class="f"><label for="e3">Phone *</label><div class="phone">' + sel('ecc', P.COUNTRIES.map(function (c) { return { v: c[1], l: c[2] + ' ' + c[1] }; }), cc) + '<input class="inp" id="e3" inputmode="tel" value="' + esc(num) + '"></div>' +
      '<label class="small" style="font-weight:500;margin-top:6px"><input type="checkbox" id="ewa"' + (p.wa ? ' checked' : '') + '> On WhatsApp</label></div>' +
      '<div class="f"><label for="e4">Email</label><input class="inp" id="e4" value="' + esc(p.email) + '"></div>' +
      '<div class="f"><label for="e5">Gender</label>' + sel('e5', ['Female', 'Male'], p.gender, '—') + '</div><div class="f"><label for="e6">Age range</label>' + sel('e6', ['Under 13', '13–17', '18–24', '25–34', '35–44', '45+'], p.age, '—') + '</div>' +
      '<div class="f"><label for="e7">Area</label><input class="inp" id="e7" value="' + esc(p.area) + '"></div><div class="f"><label for="e8">Language</label>' + sel('e8', P.LANGS, p.lang, '—') + '</div>' +
      '<div class="f"><label for="e9">Preferred contact</label>' + sel('e9', ['WhatsApp', 'Call', 'SMS', 'Email', 'Visit'], p.contact, '—') + '</div>' +
      (pastoral() ? '<div class="f"><label for="e10">' + P.esc(P.cw()) + '</label>' + sel('e10', (S.lookups && S.lookups.campuses) || [], p.campus, '—') + '</div>' : '') +
      '<div class="f full"><label>Care needs</label><div class="chips" id="eneeds">' + P.NEEDS.filter(function (n) { return n !== 'None'; }).map(function (n) { return '<span class="chip' + ((p.needs || []).indexOf(n) >= 0 ? ' on' : '') + '" role="button" tabindex="0">' + esc(n) + '</span>'; }).join('') + '</div></div>' +
      '<div class="full" style="display:flex;justify-content:flex-end"><button class="btn" id="esave">Save</button></div></div></div></div>');
    $('eneeds').onclick = function (e) { var c = e.target.closest('.chip'); if (c) c.classList.toggle('on'); };
    $('esave').onclick = function () {
      var b = this, d = { first: $('e1').value.trim(), last: $('e2').value.trim(), cc: $('ecc').value, phone: $('e3').value.trim(), whatsapp: $('ewa').checked, email: $('e4').value.trim(),
        gender: $('e5').value, age: $('e6').value, area: $('e7').value.trim(), lang: $('e8').value, contact: $('e9').value,
        needs: [].map.call(document.querySelectorAll('#eneeds .chip.on'), function (x) { return x.textContent; }) };
      if (!d.first) { P.toast('First name is required'); return; }
      var ch = { details: d }; if ($('e10')) ch.campus = $('e10').value;
      busy(b, true);
      api('updatePerson', { id: p.id, changes: ch }).then(function () { P.toast('Details saved ✓'); stale('people'); S._dirty = true; openPerson(p.id); }).catch(function (e) { busy(b, false); P.toast(e.message); });
    };
  }

  // ---------- Members ----------
  function roleTag(r) { return '<span class="tag ' + (r === 'Member' ? 'grey' : r === 'Steward' ? '' : 'gold') + '">' + esc(r) + '</span>'; }
  function trainTag(t) { return t === 'Completed' ? '<span class="tag green">Completed</span>' : t === 'In progress' ? '<span class="tag amber">In progress</span>' : '<span class="tag grey">' + esc(t || 'Not started') + '</span>'; }
  function memberRows() {
    var ms = (S.members && S.members.members) || [], q = MF.q.toLowerCase(), mon = MONTHS[new Date().getMonth()].toLowerCase();
    return ms.filter(function (m) {
      if (MF.role !== 'All' && m.role !== MF.role) return false;
      if (MF.bday && String(m.bmonth).toLowerCase().slice(0, 3) !== mon.slice(0, 3)) return false;
      return !q || (m.name + ' ' + m.area + ' ' + m.group + ' ' + m.dept + ' ' + m.phone).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function drawMembers() {
    var ms = memberRows();
    $('mtable').innerHTML = '<table><thead><tr><th>Name</th><th>Role</th><th class="hm">Small group</th><th class="hm">Department</th><th class="hm">' + P.esc(P.cw()) + ' · Area</th><th class="hm">Birthday</th></tr></thead><tbody>' +
      (ms.map(function (m) {
        return '<tr class="click" data-member="' + esc(m.key) + '"><td><div style="display:flex;gap:10px;align-items:center"><div class="av">' + esc(ini(m.name)) + '</div><div><b>' + esc(m.name) + '</b><div class="small muted">' + (m.joined ? 'Member since ' + fmt(m.joined) : esc(m.phone)) + '</div></div></div></td><td>' + roleTag(m.role) + '</td>' +
          '<td class="hm">' + esc(m.group || '—') + '</td><td class="hm">' + esc(m.dept || '—') + '</td><td class="hm">' + esc(m.campus || '—') + (m.area ? ' · ' + esc(m.area) : '') + '</td><td class="hm">' + esc(m.bmonth || '—') + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="empty">' + (S.members.members.length ? 'No one matches these filters' : 'No members yet. Converts join automatically after Membership Class; existing members can be typed into the Members tab of the Sheet.') + '</td></tr>') + '</tbody></table>';
    $('mcount').textContent = ms.length + ' members';
  }
  P.views.members = { title: 'Members', icon: I.mem, render: function (v) {
    loading(v); var tk = ++RT, vw = P.app.view();
    Promise.all([load('lookups', 'lookups'), load('members', 'listMembers')]).then(function () {
      if (gone(tk, vw)) return;
      var roles = ['All'].concat(S.lookups.memberRoles || ['Member', 'Steward', 'Group leader', 'Department head']);
      v.innerHTML = '<div class="tools"><input class="inp" id="mq" style="flex:1;min-width:180px" placeholder="Search name, area, group, department…" value="' + esc(MF.q) + '">' +
        '<div class="seg" id="mseg">' + roles.map(function (r) { return '<button class="' + (MF.role === r ? 'on' : '') + '" data-r="' + esc(r) + '">' + (r === 'All' ? 'All' : esc(r) + 's') + '</button>'; }).join('') + '</div>' +
        '<button class="btn ghost sm" id="mbday">🎂 ' + (MF.bday ? 'Showing ' : '') + MONTHS[new Date().getMonth()] + ' birthdays</button><button class="btn ghost sm" id="mexp">Export</button><button class="btn sm" id="madd">+ Add member</button></div>' +
        '<div class="card tablecard" id="mtable"></div><div class="small muted" style="margin-top:8px"><span id="mcount"></span> · converts who complete Membership Class join this directory automatically</div>';
      drawMembers();
      $('mq').oninput = function () { MF.q = this.value; drawMembers(); };
      $('mseg').onclick = function (e) { var b = e.target.closest('[data-r]'); if (!b) return; MF.role = b.dataset.r; [].forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); }); drawMembers(); };
      $('mbday').onclick = function () { MF.bday = !MF.bday; P.app.render(); };
      $('madd').onclick = function () { openMember(''); };
      $('mexp').onclick = function () {
        csv('Pathway members', [['Name', 'Phone', 'Role', 'Small group', 'Department', P.cw(), 'Area', 'Birthday month', 'Member since', 'Steward training']].concat(memberRows().map(function (m) {
          return [m.name, m.phone, m.role, m.group, m.dept, m.campus, m.area, m.bmonth, fmt(m.joined), m.training];
        })));
      };
    }).catch(function (e) { if (!gone(tk, vw)) fail(v, e); });
  } };
  function findMember(key) {
    var all = ((S.members && S.members.members) || []).concat((S.stewards && S.stewards.stewards) || []);
    return all.filter(function (m) { return m.key === key; })[0];
  }
  function openMember(key) {
    var isNew = !key, m = isNew ? { name: '', role: 'Member', campus: user().campus || '' } : findMember(key), L = S.lookups || {}; if (!m) return;
    var lv = { 'Member': 1, 'Steward': 3, 'Group leader': 4, 'Department head': 4 }[m.role] || 1;
    var h = isNew ? dhead('Add a member', 'For existing members who did not come through the convert form') + '<div class="db">' : dhead(m.name, esc(m.role) + (m.campus ? ' · ' + esc(m.campus) : '') + (m.joined ? ' · member since ' + fmt(m.joined) : ''),
      m.phone ? '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><a class="btn gold sm" href="tel:+' + digits(m.phone) + '">' + I.phone + ' Call</a><a class="btn sm wa" href="https://wa.me/' + digits(m.phone) + '" target="_blank" rel="noopener">' + I.wa + ' WhatsApp</a></div>' : '') + '<div class="db">';
    if (!isNew) h += '<div class="card"><h3>Growth track</h3><div class="tl">' + ['Membership', 'TECI', 'Serving', 'Leadership'].map(function (s, i) {
      return '<div class="s ' + (i < lv - 1 ? 'done' : i === lv - 1 ? 'cur' : '') + '"><i>' + (i < lv - 1 ? '✓' : i + 1) + '</i>' + s + '</div>';
    }).join('') + '</div></div>';
    h += '<div class="card"><h3>Profile</h3><div class="form">' +
      '<div class="f"><label for="mname">Full name *</label><input class="inp" id="mname" value="' + esc(m.name) + '"></div>' +
      '<div class="f"><label for="mphone">Phone</label><input class="inp" id="mphone" inputmode="tel" value="' + esc(m.phone || '') + '"></div>' +
      '<div class="f"><label for="mcamp">' + P.esc(P.cw()) + '</label><select class="inp" id="mcamp">' + opts(L.campuses || [], m.campus, '—') + '</select></div>' +
      '<div class="f"><label for="marea">Area</label><input class="inp" id="marea" value="' + esc(m.area || '') + '"></div>' +
      '<div class="f"><label for="mrole">Role</label><select class="inp" id="mrole">' + opts(L.memberRoles || ['Member'], m.role) + '</select></div>' +
      '<div class="f"><label for="mgroup">Small group</label><select class="inp" id="mgroup">' + opts((L.groups || []).map(function (g) { return g.name; }), m.group, 'Not in a group') + '</select></div>' +
      '<div class="f"><label for="mdept">Department (serving)</label><select class="inp" id="mdept">' + opts((L.departments || []).map(function (d) { return d.name; }), m.dept, 'Not serving yet') + '</select></div>' +
      '<div class="f"><label for="mtrain">Steward training</label><select class="inp" id="mtrain">' + opts(L.training || ['Not started', 'In progress', 'Completed'], m.training, '—') + '</select></div>' +
      '<div class="f"><label for="mbm">Birthday month</label><select class="inp" id="mbm">' + opts(MONTHS, m.bmonth, '—') + '</select></div>' +
      '<div class="full" style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">' + (isNew ? '' : '<button class="btn ghost" id="mrm" style="color:var(--red)">Remove from directory</button><span class="sp" style="flex:1"></span>') + (m.personId ? '<button class="btn ghost" data-person="' + esc(m.personId) + '">Open convert journey</button>' : '') + '<button class="btn" id="msave">' + (isNew ? 'Add member' : 'Save changes') + '</button></div></div>' +
      '<div class="small muted" style="margin-top:10px">Choosing a department makes a Member a Steward automatically. To let a member sign in, add them as a worker with role Member in Admin & settings.</div></div></div>';
    openDrawer(h);
    $('msave').onclick = function () {
      var b = this; busy(b, true);
      var vals = { name: $('mname').value.trim(), phone: $('mphone').value.trim(), campus: $('mcamp').value, area: $('marea').value.trim(), role: $('mrole').value, group: $('mgroup').value, dept: $('mdept').value, training: $('mtrain').value, bmonth: $('mbm').value };
      if (!vals.name) { busy(b, false); P.toast('Enter the name'); return; }
      (isNew ? api('createMember', { member: vals }) : api('updateMember', { key: m.key, changes: vals })).then(function () {
        P.toast(isNew ? 'Member added ✓' : 'Saved ✓'); stale('members', 'stewards', 'groups'); S._dirty = true; P.closeDrawer();
      }).catch(function (e) { busy(b, false); P.toast(e.message); });
    };
    if ($('mrm')) $('mrm').onclick = function () {
      if (!window.confirm('Remove ' + m.name + ' from the Members directory? Their history is kept.')) return;
      api('updateMember', { key: m.key, changes: { active: 'No' } }).then(function () { P.toast('Removed'); stale('members', 'stewards', 'groups'); S._dirty = true; P.closeDrawer(); }).catch(function (e) { P.toast(e.message); });
    };
  }

  // ---------- Small groups ----------
  P.views.groups = { title: 'Small groups', icon: I.grp, render: function (v) {
    loading(v); var tk = ++RT, vw = P.app.view();
    Promise.all([load('lookups', 'lookups'), load('groups', 'listGroups')]).then(function (r) {
      if (gone(tk, vw)) return;
      var gs = r[1].groups, over = gs.filter(function (g) { return g.over; });
      v.innerHTML = (over.length ? '<div class="banner">🌱 <b>' + over.length + ' group' + (over.length > 1 ? 's are' : ' is') + ' over capacity</b> (' + over.map(function (g) { return esc(g.name); }).join(', ') + '). Time to raise a new leader and multiply.</div>' : '') +
        '<div class="grid g2"><div class="card tablecard"><h3 style="padding-top:10px">Small groups</h3><table><thead><tr><th>Group</th><th class="hm">Leader</th><th class="hm">Meets</th><th>Members</th></tr></thead><tbody>' +
        (gs.map(function (g) {
          var pct = g.capacity ? Math.min(100, g.members / g.capacity * 100) : 0;
          return '<tr class="click" data-group="' + esc(g.name) + '"><td><b>' + esc(g.name) + '</b>' + (g.over ? ' <span class="tag gold">Multiply</span>' : '') + '<div class="small muted">' + esc(g.area || '—') + (g.campus ? ' · ' + esc(g.campus) : '') + '</div></td><td class="hm">' + esc(g.leader || '—') + '</td><td class="hm">' + esc(g.day || '—') + '</td>' +
            '<td style="min-width:110px"><div class="bar"><i style="width:' + pct + '%;background:' + (g.over ? 'var(--gold)' : 'var(--teal)') + '"></i></div><span class="small muted">' + g.members + ' / ' + g.capacity + (g.avg != null ? ' · avg ' + g.avg + ' attend' : '') + '</span></td></tr>';
        }).join('') || '<tr><td colspan="4" class="empty">No small groups yet. Add them in the Groups tab of the church Sheet.</td></tr>') + '</tbody></table>' +
        '<div class="small muted" style="margin:10px 0">Gold bar = over capacity. When a convert reaches the Small Group stage, their profile suggests the nearest group in their ' + P.esc(P.cw(0,1)) + ' that still has space.</div></div>' +
        '<div class="card"><h3>Adding or changing a group</h3><p class="small">1. Open the church Sheet and go to the <b>Groups</b> tab.<br>2. One row per group: name, location / area, ' + P.esc(P.cw(0,1)) + ', leader, meeting day and capacity (how many people it can hold).<br>3. Set Active to <b>Yes</b>. To close a group, set it to <b>No</b>.<br>4. Come back here and tap Refresh.</p><button class="btn ghost sm" data-reload="1">Refresh</button></div></div>';
    }).catch(function (e) { if (!gone(tk, vw)) fail(v, e); });
  } };
  function openGroup(name) {
    openDrawer(dhead(name, 'Loading…'));
    api('getGroup', { name: name }).then(function (j) {
      var g = j.group, rs = j.reports, avg = rs.length ? Math.round(rs.slice(0, 4).reduce(function (t, x) { return t + x.attendance; }, 0) / Math.min(4, rs.length)) : '—';
      var today = new Date().toISOString().slice(0, 10), total = j.members.length + j.converts.length;
      var h = dhead(g.name, esc(g.area || '') + (g.campus ? ' · ' + esc(g.campus) : '') + (g.day ? ' · meets ' + esc(g.day) : '') + (g.leader ? ' · leader ' + esc(g.leader) : '')) + '<div class="db">' +
        '<div class="grid g3"><div class="card kpi"><div class="l">People</div><div class="n">' + total + '</div><div class="d' + (total > g.capacity ? ' bad' : '') + '">' + j.converts.length + ' new converts · room for ' + g.capacity + '</div></div>' +
        '<div class="card kpi"><div class="l">Average attendance</div><div class="n">' + avg + '</div><div class="d">last 4 meetings</div></div>' +
        '<div class="card kpi"><div class="l">Last meeting</div><div class="n" style="font-size:20px">' + (rs[0] ? fmt(rs[0].date).replace(/ \d{4}$/, '') : '—') + '</div><div class="d">' + (rs[0] ? rs[0].guests + ' first-timer(s)' : 'no report yet') + '</div></div></div>' +
        '<div class="card"><h3>Log this week\'s meeting</h3><div class="mini"><input class="inp" id="gd" type="date" value="' + today + '" aria-label="Meeting date" style="flex:0 1 160px"><input class="inp" id="ga" type="number" min="0" inputmode="numeric" placeholder="Attendance" style="flex:0 1 120px"><input class="inp" id="gn" type="number" min="0" inputmode="numeric" placeholder="First-timers" style="flex:0 1 120px"></div>' +
        '<div class="mini" style="margin-top:8px"><input class="inp" id="gt" placeholder="Topic and notes (optional)"><button class="btn sm" id="gsave">Save report</button></div></div>' +
        '<div class="card"><h3>Meeting reports</h3>' + (rs.map(function (x) {
          return '<div class="row"><div class="av" style="background:var(--teal-l);color:var(--teal)">' + x.attendance + '</div><div class="meta"><b>' + esc(x.notes || 'Group meeting') + '</b><span>' + fmt(x.date) + ' · ' + x.guests + ' first-timer(s) · by ' + esc(x.by) + '</span></div></div>';
        }).join('') || '<div class="muted small">No reports yet</div>') + '</div>' +
        '<div class="card"><h3>People in this group</h3>' + (j.converts.map(function (c) {
          return '<div class="row click" data-person="' + esc(c.id) + '"><div class="av">' + esc(ini(c.name)) + '</div><div class="meta"><b>' + esc(c.name) + '</b><span>New convert · ' + esc(c.stage) + '</span></div><span class="muted">›</span></div>';
        }).join('') + j.members.map(function (m) {
          return '<div class="row"><div class="av">' + esc(ini(m.name)) + '</div><div class="meta"><b>' + esc(m.name) + '</b><span>' + esc(m.role) + (m.dept ? ' · ' + esc(m.dept) : '') + '</span></div></div>';
        }).join('') || '<div class="muted small">No one in this group yet</div>') + '</div></div>';
      openDrawer(h);
      $('gsave').onclick = function () {
        var b = this; if ($('ga').value === '') { P.toast('Enter how many attended'); return; }
        busy(b, true);
        api('logMeeting', { group: g.name, date: $('gd').value, attendance: $('ga').value, guests: $('gn').value, notes: $('gt').value.trim() }).then(function () {
          P.toast('Meeting report saved ✓'); stale('groups'); S._dirty = true; openGroup(g.name);
        }).catch(function (e) { busy(b, false); P.toast(e.message); });
      };
    }).catch(function (e) { openDrawer(dhead(name, esc(e.message))); });
  }

  // ---------- Stewards ----------
  P.views.stewards = { title: 'Stewards', icon: I.star, render: function (v) {
    loading(v); var tk = ++RT, vw = P.app.view();
    Promise.all([load('lookups', 'lookups'), load('stewards', 'listStewards')]).then(function (r) {
      if (gone(tk, vw)) return;
      var d = r[1].departments, st = r[1].stewards;
      v.innerHTML = '<div id="rotaBox"></div>' +
        '<div class="grid g3">' + (d.map(function (x) {
          var pct = x.need ? Math.min(100, x.count / x.need * 100) : 100, cls = !x.need || x.count >= x.need ? 'green' : x.count >= x.need * 0.6 ? 'amber' : 'red';
          return '<div class="card"><h3>' + esc(x.name) + '<span class="sp"></span><span class="tag ' + cls + '">' + x.count + (x.need ? '/' + x.need : '') + '</span></h3><div class="small muted">Head: ' + esc(x.head || 'not set') + ' · ' + x.need + ' needed per Sunday</div>' +
            '<div class="bar" style="margin:10px 0"><i style="width:' + pct + '%;background:' + (cls === 'red' ? 'var(--red)' : 'var(--teal)') + '"></i></div><div class="small">' + (x.training ? x.training + ' still in training' : (x.count ? 'All trained ✓' : 'No stewards yet')) + '</div></div>';
        }).join('') || '<div class="card muted">No departments yet. Add them in the Departments tab of the church Sheet.</div>') + '</div>' +
        '<div class="card tablecard" style="margin-top:16px"><h3 style="padding-top:10px">All stewards</h3><table><thead><tr><th>Steward</th><th>Department</th><th class="hm">Training</th><th class="hm">Role</th></tr></thead><tbody>' +
        (st.sort(function (a, b) { return (a.dept + a.name).localeCompare(b.dept + b.name); }).map(function (m) {
          return '<tr class="click" data-member="' + esc(m.key) + '"><td><b>' + esc(m.name) + '</b><div class="small muted">' + esc(m.campus || '') + '</div></td><td>' + esc(m.dept) + '</td><td class="hm">' + trainTag(m.training) + '</td><td class="hm">' + roleTag(m.role) + '</td></tr>';
        }).join('') || '<tr><td colspan="4" class="empty">No stewards yet</td></tr>') + '</tbody></table></div>';
      if (P.rotaBox) P.rotaBox($('rotaBox'));
    }).catch(function (e) { if (!gone(tk, vw)) fail(v, e); });
  } };

  // shared with church.js (step 3 screens)
  P.T = { I: I, S: S, api: api, stale: stale, fmt: fmt, ini: ini, opts: opts, csv: csv, busy: busy, ago: ago, digits: digits, actTag: actTag, stTag: stTag,
    openDrawer: openDrawer, dhead: dhead, loading: loading, fail: fail, user: user, pastoral: pastoral, openPerson: openPerson,
    guard: function () { var tk = ++RT, vw = P.app.view(); return function () { return gone(tk, vw); }; },
    cache: function (k, j) { S[k] = j; P.set('c_' + k, j); return j; }, saved: function (k) { return S[k] || P.get('c_' + k); } };

  // ---------- taps ----------
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-stop]')) return; // call / WhatsApp buttons inside a row
    var x;
    if ((x = t.closest('[data-advance]'))) { e.stopPropagation(); advance(x.dataset.advance, +x.dataset.to, x); return; }
    if ((x = t.closest('[data-person]'))) { openPerson(x.dataset.person); return; }
    if ((x = t.closest('[data-member]'))) { openMember(x.dataset.member); return; }
    if ((x = t.closest('[data-group]'))) { openGroup(x.dataset.group); return; }
    if ((x = t.closest('[data-stagefilter]'))) { F.stage = +x.dataset.stagefilter; F.status = 'All'; P.app.go('people'); return; }
    if (t.closest('[data-close]') || t.id === 'ov') { P.closeDrawer(); return; }
    if (t.closest('[data-reload]')) { stale('lookups', 'people', 'members', 'groups', 'stewards'); P.app.render(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') P.closeDrawer(); });
  // keep the follow-up count fresh in the menu
  setInterval(function () { if (P.app && P.app.user() && P.online() && S.people && ['Admin', 'Leader', 'Follow-up worker'].indexOf(P.app.user().role) >= 0) { stale('people'); } }, 300000);
})();
