/* Pathway step 5: Admin centre. Everything (workers and PINs, campuses, events, stages, groups, departments, approval routes,
   approvers, rules, service templates, exports, backup, audit) is managed here; nobody needs to open the Sheet. */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';
  var SEC_ADMIN = [['overview', 'Overview'], ['workers', 'Workers & PINs'], ['campuses', 'Campuses'], ['events', 'Events & QR'], ['stages', 'Pathway stages'], ['groups', 'Small groups'],
    ['departments', 'Departments'], ['approvals', 'Approvals'], ['rules', 'Approval routes'], ['pins', 'PIN requests'], ['templates', 'Service templates'], ['settings', 'Rules'], ['bulk', 'Bulk upload'], ['backup', 'Export & backup'], ['audit', 'Audit trail']];
  var SEC_LEADER = [['workers', 'My team & PINs'], ['pins', 'PIN requests'], ['bulk', 'Bulk upload']];
  var INTRO = {
    workers: 'People who sign in to Pathway. Set or reset a PIN here; a locked worker is unlocked by giving a new PIN. Removing someone signs them out everywhere but keeps their history.',
    campuses: 'Renaming a campus updates it everywhere (people, members, groups, workers, events).',
    events: 'Each event gets its own QR code (QR codes screen), so the church knows where every convert came from.',
    stages: 'The steps of the convert pathway. Renaming a stage updates everyone at that stage and their history.',
    groups: 'Renaming a group updates its members and reports. Capacity is used to suggest groups and to flag when to multiply.',
    departments: 'Heads receive their team\'s notices (rota gaps, service grid parts). "Needed per Sunday" drives the automatic rota.',
    settings: 'Rules the whole app follows. Tap a rule to change it.'
  };
  var SEC = 'overview';
  P.openAdmin = function (sec) { SEC = sec; P.app.go('admin'); };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-admin]'); if (b) { if (P.closeDrawer) P.closeDrawer(true); P.openAdmin(b.dataset.admin); } });
  function secs() { return (T.user().role === 'Admin' ? SEC_ADMIN : SEC_LEADER).map(function (x) { return [x[0], P.cwText(x[1])]; }); }

  P.views.admin = { get title() { var u = P.app && P.app.user && P.app.user(); return u && u.role === 'Leader' ? 'Team & PINs' : 'Admin & settings'; }, icon: ICON, render: function (v) {
    var ss = secs(); if (!ss.some(function (s) { return s[0] === SEC; })) SEC = ss[0][0];
    v.innerHTML = '<div class="tools noprint" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px"><div class="seg" id="aseg" style="flex-wrap:nowrap">' + ss.map(function (s) { return '<button class="' + (SEC === s[0] ? 'on' : '') + '" data-sec="' + s[0] + '" style="white-space:nowrap">' + s[1] + '</button>'; }).join('') + '</div></div><div id="abox"></div>';
    $('aseg').onclick = function (e) { var b = e.target.closest('[data-sec]'); if (b) { SEC = b.dataset.sec; P.app.render(); } };
    var box = $('abox'), gone = T.guard();
    box.innerHTML = '<div class="card muted">Loading…</div>';
    var f = { overview: overview, approvals: approvals, templates: templates, backup: backup, audit: audit, bulk: bulk, rules: P.adminRules, pins: P.adminPins }[SEC];
    (f ? f(box, gone) : listSection(box, SEC, gone)).catch(function (e) { if (!gone()) T.fail(box, e); });
  } };

  // ---------- bulk upload: download a template, fill it in Excel, upload many records at once ----------
  var IMP = { list: '', rows: null, head: null, res: null };
  function parseTable(text) {
    text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    var first = text.split('\n')[0], d = first.indexOf('\t') >= 0 ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
    var rows = [], row = [], c = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; continue; }
      if (ch === '"' && c === '') q = true; else if (ch === d) { row.push(c); c = ''; } else if (ch === '\n') { row.push(c); rows.push(row); row = []; c = ''; } else c += ch;
    }
    if (c !== '' || row.length) { row.push(c); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
  }
  function bulk(box, gone) {
    return T.api('importInfo').then(function (d) {
      if (gone()) return;
      if (!d.lists.some(function (l) { return l.list === IMP.list; })) IMP.list = d.lists[0].list;
      var L = d.lists.filter(function (l) { return l.list === IMP.list; })[0], show = function (c) { return P.cwText(c); };
      box.innerHTML = '<div class="grid g2" style="align-items:start"><div class="card"><h3>1. Choose what to upload</h3>' +
        '<select class="inp" id="bl">' + d.lists.map(function (l) { return '<option value="' + l.list + '"' + (l.list === IMP.list ? ' selected' : '') + '>' + esc(show(l.label)) + '</option>'; }).join('') + '</select>' +
        '<p class="small muted">Best order: ' + esc(d.lists.map(function (l) { return show(l.label.split(' (')[0]); }).join(' → ')) + '. Small groups and members need their leaders, departments and ' + esc(P.cw(1, 1)) + ' to exist first.</p>' +
        '<h3 style="margin-top:14px">2. Download the template</h3><p class="small" style="margin-top:-4px">Open it in Excel, type one record per row under the headings, and delete the grey "e.g." row. Save it as <b>CSV</b>. Columns marked * must be filled.</p>' +
        '<div class="small" style="margin-bottom:10px">' + L.cols.map(function (c) { return '<div><b>' + esc(show(c.col)) + (c.req ? ' *' : '') + '</b>' + (c.note ? ' <span class="muted">· ' + esc(show(c.note)) + '</span>' : '') + '</div>'; }).join('') + '</div>' +
        '<button class="btn ghost sm" id="btpl">Download template</button></div>' +
        '<div class="card"><h3>3. Upload the filled template</h3><input type="file" id="bf" accept=".csv,.txt,text/csv" class="inp">' +
        '<p class="small muted" style="margin:8px 0 4px">Or copy the rows from Excel (with the heading row) and paste them here:</p><textarea class="inp" id="bp" rows="4" placeholder="Paste from Excel"></textarea>' +
        '<div id="bprev" style="margin-top:12px"></div></div></div><div id="bres" style="margin-top:16px"></div>';
      $('bl').onchange = function () { IMP = { list: this.value }; P.app.render(); };
      $('btpl').onclick = function () {
        download('Pathway template - ' + show(L.label.split(' (')[0]) + '.csv', toCsv([L.cols.map(function (c) { return show(c.col); }),
          L.cols.map(function (c, i) { return (i ? '' : 'e.g. ') + (c.req ? '(required) ' : '') + show(c.note || ''); })]), 'text/csv');
      };
      function take(text) {
        var t = parseTable(text); if (!t.length) { $('bprev').innerHTML = ''; return; }
        var map = {}; L.cols.forEach(function (c) { map[c.col.toLowerCase()] = c.col; map[show(c.col).toLowerCase()] = c.col; });
        var head = t[0].map(function (h) { return map[String(h).replace(/\*/g, '').trim().toLowerCase()] || ''; });
        var known = head.filter(String).length, missing = L.cols.filter(function (c) { return c.req && head.indexOf(c.col) < 0; });
        IMP.rows = []; t.slice(1).forEach(function (r, i) {
          if (/^e\.g\./i.test(String(r[0] || '').trim())) return;
          var o = { _line: i + 2 }; head.forEach(function (k, j) { if (k) o[k] = String(r[j] == null ? '' : r[j]).trim(); }); IMP.rows.push(o);
        });
        if (!known || missing.length) { IMP.rows = null; $('bprev').innerHTML = '<div class="warn">' + (!known ? 'The headings were not recognised. Use the template for ' + esc(show(L.label)) + '.' : 'Missing column: ' + esc(missing.map(function (c) { return show(c.col); }).join(', '))) + '</div>'; return; }
        if (IMP.rows.length > d.max) { $('bprev').innerHTML = '<div class="warn">That is ' + IMP.rows.length + ' rows. Upload at most ' + d.max + ' at a time: split the file.</div>'; IMP.rows = null; return; }
        var cols = L.cols.filter(function (c) { return head.indexOf(c.col) >= 0; }).slice(0, 4);
        $('bprev').innerHTML = '<div class="small"><b>' + IMP.rows.length + ' rows</b> ready. First few:</div><div style="overflow-x:auto"><table><thead><tr>' + cols.map(function (c) { return '<th>' + esc(show(c.col)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          IMP.rows.slice(0, 5).map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + esc(r[c.col] || '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
          '<button class="btn" id="bgo" style="margin-top:10px">Upload ' + IMP.rows.length + ' rows</button>';
        $('bgo').onclick = function () { run(this); };
      }
      $('bf').onchange = function () { var f = this.files[0]; if (!f) return; if (/\.xlsx?$/i.test(f.name)) { $('bprev').innerHTML = '<div class="warn">This is an Excel file. In Excel choose File → Save As → <b>CSV</b>, then choose that file. Or copy the rows and paste them below.</div>'; return; } var rd = new FileReader(); rd.onload = function () { take(rd.result); }; rd.readAsText(f); };
      $('bp').oninput = function () { take(this.value); };
      function run(b) {
        var rows = IMP.rows.slice(), all = [], added = 0, updated = 0; T.busy(b, true);
        (function next(k) {
          if (k >= rows.length) return finish();
          b.textContent = 'Uploading ' + Math.min(k + 50, rows.length) + ' of ' + rows.length + '…';
          T.api('bulkImport', { list: L.list, rows: rows.slice(k, k + 50) }).then(function (j) {
            added += j.added; updated += j.updated; j.results.forEach(function (x) { x.row = rows[k + x.i]; all.push(x); }); next(k + 50);
          }).catch(function (e) { T.busy(b, false); b.textContent = 'Try again'; P.toast(e.message); });
        })(0);
        function finish() {
          T.stale('lookups', 'people', 'members', 'groups', 'stewards');
          var bad = all.filter(function (x) { return !x.ok; }), skip = all.filter(function (x) { return x.action === 'skipped'; }).length;
          IMP.rows = null; $('bprev').innerHTML = ''; $('bp').value = ''; $('bf').value = '';
          $('bres').innerHTML = '<div class="card"><h3>Upload finished</h3><div class="small"><b>' + added + '</b> added · <b>' + updated + '</b> updated' + (skip ? ' · ' + skip + ' already there' : '') + ' · <b' + (bad.length ? ' style="color:var(--red)"' : '') + '>' + bad.length + '</b> not uploaded</div>' +
            (bad.length ? '<div style="margin-top:10px">' + bad.map(function (x) { return '<div class="small">Row ' + x.row._line + ': ' + esc(x.error) + '</div>'; }).join('') + '</div><button class="btn ghost sm" id="bbad" style="margin-top:10px">Download the rows not uploaded</button><p class="small muted">Fix them in that file, then upload it again. Rows already uploaded are not doubled.</p>' : '') + '</div>';
          if ($('bbad')) $('bbad').onclick = function () {
            download('Pathway - fix these rows.csv', toCsv([L.cols.map(function (c) { return show(c.col); }).concat(['Problem'])].concat(bad.map(function (x) { return L.cols.map(function (c) { return x.row[c.col] || ''; }).concat([x.error]); }))), 'text/csv');
          };
        }
      }
    });
  }

  // ---------- generic list (add / edit / remove) ----------
  function cell(f, r) {
    var x = r[f.k];
    if (f.t === 'yesno') return x === 'No' ? '<span class="tag grey">No</span>' : '<span class="tag green">Yes</span>';
    if (f.t === 'tick') return /^y/i.test(x) ? '<span class="tag green">Yes</span>' : '<span class="tag grey">No</span>';
    return esc(x || '—');
  }
  function listSection(box, list, gone, title) {
    return T.api('adminList', { list: list }).then(function (d) {
      if (gone && gone()) return;
      var vis = d.fields.filter(function (f) { return f.k !== 'Active' && f.k !== 'What it means'; }).slice(0, list === 'routes' ? 5 : 4);
      var html = '<div class="card tablecard"><h3 style="padding-top:10px">' + esc(title || (secs().filter(function (s) { return s[0] === list; })[0] || [0, list])[1]) + '<span class="sp"></span>' +
        '<input class="inp" data-q="' + list + '" placeholder="Search" style="width:160px;padding:6px 10px">' + (d.canAdd ? '<button class="btn sm" data-new="' + list + '">+ Add</button>' : '') + '</h3>' +
        (INTRO[list] ? '<p class="small muted" style="margin:-4px 0 8px">' + P.cwText(T.user().role === 'Leader' && list === 'workers' ? 'People in your team who sign in. Set or reset their PIN here; a locked person is unlocked by giving a new PIN.' : INTRO[list]) + '</p>' : '') +
        (T.user().role === 'Leader' && list === 'workers' ? '<div class="banner" style="margin-bottom:10px">' + (d.unit ? 'You see the people in <b>' + esc(d.unit) + '</b>. Anyone you add joins ' + esc(d.unit) + '.' : 'You see your whole ' + esc(P.cw(0, 1)) + '. An admin can limit this to your own group or department.') + '</div>' : '') +
        '<table><thead><tr>' + vis.map(function (f, i) { return '<th' + (i > 1 ? ' class="hm"' : '') + '>' + esc(P.cwText(f.l)) + '</th>'; }).join('') + (d.hasActive ? '<th>Active</th>' : '') + (list === 'workers' ? '<th>Sign-in</th>' : '') + '</tr></thead><tbody data-rows="' + list + '">' +
        d.rows.map(function (r) {
          return '<tr class="click" data-edit="' + esc(r._key) + '" data-list="' + list + '" data-s="' + esc(Object.keys(r).map(function (k) { return r[k]; }).join(' ').toLowerCase()) + '">' + vis.map(function (f, i) { return '<td' + (i > 1 ? ' class="hm"' : '') + '>' + (i === 0 ? '<b>' + cell(f, r) + '</b>' : cell(f, r)) + '</td>'; }).join('') +
            (d.hasActive ? '<td>' + cell({ t: 'yesno', k: 'Active' }, r) + '</td>' : '') +
            (list === 'workers' ? '<td>' + (r.Active === 'No' ? '<span class="tag grey">Removed</span>' : r._locked ? '<span class="tag red">Locked</span>' : !r._pin ? '<span class="tag amber">Needs PIN</span>' : '<span class="tag green">OK</span>') + '</td>' : '') + '</tr>';
        }).join('') + (d.rows.length ? '' : '<tr><td colspan="6" class="empty">Nothing here yet' + (d.canAdd ? '. Tap + Add.' : '') + '</td></tr>') + '</tbody></table></div>';
      if (box.id === 'abox') box.innerHTML = html; else box.innerHTML = html;
      CACHE[list] = d;
    });
  }
  var CACHE = {};
  document.addEventListener('input', function (e) {
    var q = e.target.dataset && e.target.dataset.q; if (!q) return;
    var t = e.target.value.toLowerCase();
    document.querySelectorAll('[data-rows="' + q + '"] tr[data-s]').forEach(function (tr) { tr.hidden = t && tr.dataset.s.indexOf(t) < 0; });
  });
  document.addEventListener('click', function (e) {
    var n = e.target.closest('[data-new]'), ed = e.target.closest('[data-edit]');
    if (n) return openForm(n.dataset.new, null);
    if (ed) return openForm(ed.dataset.list, ed.dataset.edit);
  });

  function input(f, val, r) {
    var id = 'af_' + f.k.replace(/\W/g, '_'), v = val == null ? '' : val;
    if (f.ro) return '<div class="f full"><label>' + esc(P.cwText(f.l)) + '</label><div style="padding:6px 0">' + esc(v || '—') + '</div></div>';
    var opts = f.options, t = f.t;
    if (r && r._opts && f.k === 'Value') { t = 'select'; opts = r._opts; }
    if (r && r._num && f.k === 'Value') t = 'number';
    var el;
    if (t === 'yesno') el = '<select class="inp" id="' + id + '">' + T.opts(['Yes', 'No'], v || 'Yes') + '</select>';
    else if (t === 'tick') el = '<select class="inp" id="' + id + '">' + T.opts(['No', 'Yes'], /^y/i.test(v) ? 'Yes' : 'No') + '</select>';
    else if (t === 'select') el = '<select class="inp" id="' + id + '">' + T.opts(opts || [], v, f.blank || '—') + '</select>';
    else if (t === 'suggest') el = '<input class="inp" id="' + id + '" list="' + id + '_l" value="' + esc(v) + '" placeholder="Choose or type"><datalist id="' + id + '_l">' + (opts || []).map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>';
    else el = '<input class="inp" id="' + id + '" type="' + (t === 'number' ? 'number' : 'text') + '" value="' + esc(v) + '"' + (t === 'number' ? ' inputmode="numeric"' : '') + '>';
    return '<div class="f' + (f.k === 'What it means' || f.k === 'Notes' ? ' full' : '') + '"><label for="' + id + '">' + esc(P.cwText(f.l)) + (f.req ? ' *' : '') + '</label>' + el + (f.help ? '<div class="small muted" style="margin-top:4px">' + esc(f.help) + '</div>' : '') + '</div>';
  }
  function openForm(list, key) {
    var d = CACHE[list]; if (!d) return;
    var r = key ? d.rows.filter(function (x) { return x._key === key; })[0] : null, isNew = !r;
    var title = isNew ? 'Add ' + ({ workers: 'worker', campuses: P.cw(0, 1), events: 'event', stages: 'stage', groups: 'small group', departments: 'department', routes: 'request type', approvers: 'approver' }[list] || 'item') : (r._key + '');
    var sub = list === 'workers' && r ? (r.Active === 'No' ? 'Removed' : r._locked ? 'Locked: give a new PIN to unlock' : !r._pin ? 'No PIN yet: set one below' : 'Last sign-in ' + (r._last ? T.fmt(r._last) : 'never')) : '';
    var h = T.dhead(title, esc(sub)) + '<div class="db"><div class="card"><div class="form">' + d.fields.map(function (f) { return input(f, r ? r[f.k] : (f.k === 'Active' ? 'Yes' : ''), r); }).join('') +
      (list === 'workers' ? '<div class="f"><label for="af_pin">' + (isNew ? 'PIN (4 digits) *' : 'New PIN (leave blank to keep)') + '</label><input class="inp" id="af_pin" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••"><div class="small muted" style="margin-top:4px">Tell the person their PIN privately. They can change it in My space.</div></div>' : '') +
      '<div class="full" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">' + (!isNew && d.canRemove && !(d.hasActive && r.Active === 'No') ? '<button class="btn ghost" id="af_rm" style="color:var(--red)">' + (d.hasActive ? 'Remove' : 'Delete') + '</button>' : '') +
      '<span class="sp" style="flex:1"></span><button class="btn" id="af_save">Save</button></div></div>' +
      (!isNew && d.hasActive && r.Active === 'No' ? '<p class="small muted">This one is removed. Set Active to Yes and save to bring it back.</p>' : '') + '</div></div>';
    T.openDrawer(h);
    $('af_save').onclick = function () {
      var b = this, vals = {};
      d.fields.forEach(function (f) { var el = $('af_' + f.k.replace(/\W/g, '_')); if (el && !f.ro) vals[f.k] = el.value.trim(); });
      if (list === 'workers') { vals._pin = $('af_pin').value.trim(); if (isNew && !/^\d{4}$/.test(vals._pin)) { P.toast('Give a 4-digit PIN'); return; } }
      T.busy(b, true);
      T.api('adminSave', { list: list, key: isNew ? '' : r._key, values: vals }).then(function (j) {
        P.toast('Saved ✓' + (j.updated ? ' Updated in ' + j.updated + ' places.' : '') + (j.pinCleared ? ' Name changed: set a new PIN for them.' : ''));
        T.stale('lookups', 'people', 'members', 'groups', 'stewards'); P.closeDrawer();
        P.refreshConfig().then(function () { P.app.render(); });
      }).catch(function (e) { T.busy(b, false); P.toast(e.message); });
    };
    if ($('af_rm')) $('af_rm').onclick = function () {
      if (!window.confirm((d.hasActive ? 'Remove ' : 'Delete ') + r._key + '?' + (d.hasActive ? ' You can bring it back later.' : ''))) return;
      T.api('adminRemove', { list: list, key: r._key }).then(function () { P.toast('Done ✓'); T.stale('lookups'); P.closeDrawer(); P.app.render(); }).catch(function (e) { P.toast(e.message); });
    };
  }

  // ---------- sections ----------
  function overview(box, gone) {
    return T.api('adminInfo').then(function (d) {
      if (gone()) return;
      var w = d.workers, locked = w.filter(function (x) { return x.active && x.locked; }).length, nopin = w.filter(function (x) { return x.active && !x.pin; }).length;
      box.innerHTML = '<div class="grid g4" style="margin-bottom:16px">' + [['People', 'Converts captured'], ['Members', 'Members'], ['Requests', 'Requests'], ['Away', 'Trips logged']].map(function (x) { return '<div class="card kpi"><div class="l">' + x[1] + '</div><div class="n">' + (d.counts[x[0]] || 0) + '</div></div>'; }).join('') + '</div>' +
        '<div class="grid g2" style="align-items:start"><div style="display:grid;gap:16px">' +
        '<div class="card"><h3>Daily reminders & automatic rota<span class="sp"></span>' + (d.automation ? '<span class="tag green">On</span>' : '<span class="tag red">Off</span>') + '</h3><p class="small" style="margin-top:-4px">Every morning: follow-up reminders, the day-before service grid reminders, people marked back from trips, and the Sunday rota built on the rota build day.</p>' +
        '<button class="btn sm' + (d.automation ? ' ghost' : '') + '" id="aauto">' + (d.automation ? 'Turn off' : 'Turn on') + '</button></div>' +
        '<div class="card"><h3>Sign-in health</h3><div class="small">' + w.filter(function (x) { return x.active; }).length + ' active workers · ' + (locked ? '<b style="color:var(--red)">' + locked + ' locked</b>' : 'none locked') + ' · ' + (nopin ? '<b style="color:#8d5f0f">' + nopin + ' without a PIN</b>' : 'all have PINs') + '</div><button class="btn ghost sm" style="margin-top:10px" data-sec2="workers">Manage workers</button></div></div>' +
        '<div style="display:grid;gap:16px;align-content:start"><div class="card"><h3>Check & repair</h3><p class="small" style="margin-top:-4px">If something looks wrong after an update, this adds any missing parts. It never deletes data.</p><button class="btn ghost sm" id="arep">Check & repair</button></div>' +
        '<div class="card"><h3>Help</h3><p class="small" style="margin-top:-4px">The one-page admin guide explains every task in plain steps.</p><a class="btn ghost sm" href="guide.html" target="_blank" rel="noopener">Open the admin guide</a></div></div></div>';
      $('aauto').onclick = function () { var b = this; T.busy(b, true); T.api('setAutomation', { on: !d.automation }).then(function (j) { P.toast(j.on ? 'Daily reminders are on ✓' : 'Daily reminders are off'); P.app.render(); }).catch(function (e) { T.busy(b, false); P.toast(e.message); }); };
      $('arep').onclick = function () { var b = this; T.busy(b, true); T.api('repairTabs').then(function () { P.toast('All checked ✓'); T.busy(b, false); }).catch(function (e) { T.busy(b, false); P.toast(e.message); }); };
      box.querySelector('[data-sec2]').onclick = function () { SEC = 'workers'; P.app.render(); };
    });
  }
  function approvals(box, gone) {
    box.innerHTML = '<div id="ab1" style="margin-bottom:16px"></div><div id="ab2"></div><p class="small muted">Steps can be <b>Group leader</b> or <b>Department head</b> (taken from the requester\'s group or department), <b>Admin</b>, a title from the Approvers list (e.g. Senior pastor), or a worker\'s name. Steps the requester would approve themselves are skipped.</p>';
    return Promise.all([listSection($('ab1'), 'routes', gone, 'Request types and their approval steps'), listSection($('ab2'), 'approvers', gone, 'Approvers (who each title is)')]);
  }
  function templates(box, gone) {
    return T.api('gridLookups').then(function (d) {
      if (gone()) return;
      box.innerHTML = '<div class="card"><h3>Service grid templates</h3><p class="small muted" style="margin-top:-4px">Starter running orders for new service grids. To change one: start a new grid from it, edit, then <b>Save as template</b> with the same name.</p>' +
        (d.templates.map(function (t) {
          return '<div class="row"><div class="av" style="background:var(--teal-l);color:var(--teal)">T</div><div class="meta"><b>' + esc(t) + '</b></div><button class="btn ghost sm" data-tuse="' + esc(t) + '">Start a grid from it</button>' + (d.canBuild ? '<button class="btn ghost sm" style="color:var(--red)" data-tdel="' + esc(t) + '">Delete</button>' : '') + '</div>';
        }).join('') || '<div class="muted small">No templates yet. Build a grid and choose Save as template.</div>') + '</div>';
      box.onclick = function (e) {
        var u = e.target.closest('[data-tuse]'), x = e.target.closest('[data-tdel]');
        if (u && P.startGrid) P.startGrid(u.dataset.tuse);
        if (x && window.confirm('Delete the template "' + x.dataset.tdel + '"? Grids already built are not affected.')) T.api('deleteTemplate', { name: x.dataset.tdel }).then(function () { P.toast('Template deleted'); P.app.render(); }).catch(function (e2) { P.toast(e2.message); });
      };
    });
  }
  var TABLES = [['People', 'Converts'], ['Follow-ups', 'Follow-up log'], ['Stage History', 'Stage moves'], ['Members', 'Members'], ['Groups', 'Small groups'], ['Group Reports', 'Group meeting reports'],
    ['Departments', 'Departments'], ['Rota', 'Sunday rota'], ['Services', 'Service grids'], ['Service Items', 'Service grid items'], ['Requests', 'Requests & approvals'], ['Away', 'Away log'],
    ['Workers', 'Workers (no PINs)'], ['Events', 'Events'], ['Audit', 'Audit trail']];
  function xmlEsc(s) { return String(s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function download(name, data, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function toCsv(rows) { return '﻿' + rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n'); }
  function toXls(tables) {
    var x = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#E3F0EE" ss:Pattern="Solid"/></Style></Styles>';
    Object.keys(tables).forEach(function (n) {
      x += '<Worksheet ss:Name="' + xmlEsc(n.slice(0, 31)) + '"><Table>' + tables[n].map(function (r, i) {
        return '<Row>' + r.map(function (c) { var num = typeof c === 'number' && isFinite(c); return '<Cell' + (i === 0 ? ' ss:StyleID="h"' : '') + '><Data ss:Type="' + (num ? 'Number' : 'String') + '">' + xmlEsc(c == null ? '' : c) + '</Data></Cell>'; }).join('') + '</Row>';
      }).join('') + '</Table></Worksheet>';
    });
    return x + '</Workbook>';
  }
  var today = function () { return new Date().toISOString().slice(0, 10); };
  function backup(box) {
    box.innerHTML = '<div class="grid g2" style="align-items:start"><div class="card"><h3>Full backup</h3><p class="small" style="margin-top:-4px">Downloads everything (except PINs) as one Excel workbook, one sheet per list. Do this once a month and keep the file safely.</p><button class="btn" id="bfull">Download full backup (Excel)</button></div>' +
      '<div class="card"><h3>Reports</h3><p class="small" style="margin-top:-4px">The Dashboard is the church report. Open it, choose a ' + P.esc(P.cw(0,1)) + ' if needed, then tap <b>Print report</b> to print or save it as PDF.</p><button class="btn ghost sm" data-go="dash">Open the Dashboard</button></div></div>' +
      '<div class="card" style="margin-top:16px"><h3>Download one list (opens in Excel)</h3><div style="display:flex;gap:8px;flex-wrap:wrap">' + TABLES.map(function (t) { return '<button class="btn ghost sm" data-exp="' + esc(t[0]) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div></div>';
    $('bfull').onclick = function () {
      var b = this; T.busy(b, true); b.textContent = 'Preparing…';
      T.api('exportData', { tab: 'ALL' }).then(function (j) { download('Pathway backup ' + today() + '.xls', toXls(j.tables), 'application/vnd.ms-excel'); P.toast('Backup downloaded ✓'); })
        .catch(function (e) { P.toast(e.message); }).then(function () { T.busy(b, false); b.textContent = 'Download full backup (Excel)'; });
    };
    box.onclick = function (e) {
      var x = e.target.closest('[data-exp]'); if (!x) return;
      T.busy(x, true);
      T.api('exportData', { tab: x.dataset.exp }).then(function (j) { var t = j.tables[x.dataset.exp]; download('Pathway ' + x.dataset.exp + ' ' + today() + '.csv', toCsv(t), 'text/csv'); P.toast('Downloaded ' + (t.length - 1) + ' rows'); })
        .catch(function (e2) { P.toast(e2.message); }).then(function () { T.busy(x, false); });
    };
    return Promise.resolve();
  }
  function audit(box, gone) {
    return T.api('adminInfo').then(function (d) {
      if (gone()) return;
      box.innerHTML = '<div class="card"><h3>Audit trail<span class="sp"></span><input class="inp" id="aq" placeholder="Search" style="width:160px;padding:6px 10px"><button class="btn ghost sm" data-exp="Audit">Download all</button></h3><p class="small muted" style="margin-top:-4px">Every change made in Pathway, newest first (latest 60 shown).</p><div class="log" id="alog">' +
        d.audit.map(function (a) { return '<div class="e" data-s="' + esc((a.action + ' ' + a.user + ' ' + a.details).toLowerCase()) + '"><b>' + esc(a.action) + '</b> · ' + esc(a.user) + '<div class="small muted">' + esc(a.details) + ' · ' + T.fmt(a.time) + '</div></div>'; }).join('') + '</div></div>';
      $('aq').oninput = function () { var t = this.value.toLowerCase(); document.querySelectorAll('#alog .e').forEach(function (x) { x.hidden = t && x.dataset.s.indexOf(t) < 0; }); };
      box.onclick = function (e) { var x = e.target.closest('[data-exp]'); if (x) T.api('exportData', { tab: 'Audit' }).then(function (j) { download('Pathway Audit ' + today() + '.csv', toCsv(j.tables.Audit), 'text/csv'); }).catch(function (e2) { P.toast(e2.message); }); };
    });
  }

  // ---------- change my PIN (from My space) ----------
  P.changePin = function () {
    T.openDrawer(T.dhead('Change my PIN', 'Choose a new 4-digit PIN only you know') + '<div class="db"><div class="card"><div class="form">' +
      '<div class="f"><label for="cp0">Current PIN</label><input class="inp" id="cp0" inputmode="numeric" maxlength="4" type="password"></div>' +
      '<div class="f"><label for="cp1">New PIN</label><input class="inp" id="cp1" inputmode="numeric" maxlength="4" type="password"></div>' +
      '<div class="f"><label for="cp2">New PIN again</label><input class="inp" id="cp2" inputmode="numeric" maxlength="4" type="password"></div>' +
      '<div class="full" style="display:flex;justify-content:flex-end"><button class="btn" id="cpsave">Change PIN</button></div></div></div></div>');
    $('cpsave').onclick = function () {
      var a = $('cp1').value.trim(); if (!/^\d{4}$/.test(a)) { P.toast('The new PIN must be 4 digits'); return; } if (a !== $('cp2').value.trim()) { P.toast('The two new PINs do not match'); return; }
      var b = this; T.busy(b, true);
      T.api('changeMyPin', { old: $('cp0').value.trim(), pin: a }).then(function () { P.toast('PIN changed ✓'); P.closeDrawer(); }).catch(function (e) { T.busy(b, false); P.toast(e.message); });
    };
  };
  document.addEventListener('click', function (e) { if (e.target.closest('[data-chpin]')) P.changePin(); });
})();
