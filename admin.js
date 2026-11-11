/* Pathway step 5: Admin centre. Everything (workers and PINs, campuses, events, stages, groups, departments, approval routes,
   approvers, rules, service templates, exports, backup, audit) is managed here; nobody needs to open the Sheet. */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';
  var SEC_ADMIN = [['overview', 'Overview'], ['workers', 'Workers & PINs'], ['campuses', 'Campuses'], ['events', 'Events & QR'], ['stages', 'Pathway stages'], ['groups', 'Small groups'],
    ['departments', 'Departments'], ['approvals', 'Approvals'], ['templates', 'Service templates'], ['settings', 'Rules'], ['backup', 'Export & backup'], ['audit', 'Audit trail']];
  var SEC_LEADER = [['workers', 'Workers & PINs'], ['events', 'Events & QR'], ['groups', 'Small groups'], ['departments', 'Departments'], ['templates', 'Service templates']];
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
  function secs() { return T.user().role === 'Admin' ? SEC_ADMIN : SEC_LEADER; }

  P.views.admin = { title: 'Admin & settings', icon: ICON, render: function (v) {
    var ss = secs(); if (!ss.some(function (s) { return s[0] === SEC; })) SEC = ss[0][0];
    v.innerHTML = '<div class="tools noprint" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px"><div class="seg" id="aseg" style="flex-wrap:nowrap">' + ss.map(function (s) { return '<button class="' + (SEC === s[0] ? 'on' : '') + '" data-sec="' + s[0] + '" style="white-space:nowrap">' + s[1] + '</button>'; }).join('') + '</div></div><div id="abox"></div>';
    $('aseg').onclick = function (e) { var b = e.target.closest('[data-sec]'); if (b) { SEC = b.dataset.sec; P.app.render(); } };
    var box = $('abox'), gone = T.guard();
    box.innerHTML = '<div class="card muted">Loading…</div>';
    var f = { overview: overview, approvals: approvals, templates: templates, backup: backup, audit: audit }[SEC];
    (f ? f(box, gone) : listSection(box, SEC, gone)).catch(function (e) { if (!gone()) T.fail(box, e); });
  } };

  // ---------- generic list (add / edit / remove) ----------
  function cell(f, r) {
    var x = r[f.k];
    if (f.t === 'yesno') return x === 'No' ? '<span class="tag grey">No</span>' : '<span class="tag green">Yes</span>';
    return esc(x || '—');
  }
  function listSection(box, list, gone, title) {
    return T.api('adminList', { list: list }).then(function (d) {
      if (gone && gone()) return;
      var vis = d.fields.filter(function (f) { return f.k !== 'Active' && f.k !== 'What it means'; }).slice(0, list === 'routes' ? 5 : 4);
      var html = '<div class="card tablecard"><h3 style="padding-top:10px">' + esc(title || (secs().filter(function (s) { return s[0] === list; })[0] || [0, list])[1]) + '<span class="sp"></span>' +
        '<input class="inp" data-q="' + list + '" placeholder="Search" style="width:160px;padding:6px 10px">' + (d.canAdd ? '<button class="btn sm" data-new="' + list + '">+ Add</button>' : '') + '</h3>' +
        (INTRO[list] ? '<p class="small muted" style="margin:-4px 0 8px">' + INTRO[list] + '</p>' : '') +
        '<table><thead><tr>' + vis.map(function (f, i) { return '<th' + (i > 1 ? ' class="hm"' : '') + '>' + esc(f.l) + '</th>'; }).join('') + (d.hasActive ? '<th>Active</th>' : '') + (list === 'workers' ? '<th>Sign-in</th>' : '') + '</tr></thead><tbody data-rows="' + list + '">' +
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
    if (f.ro) return '<div class="f full"><label>' + esc(f.l) + '</label><div style="padding:6px 0">' + esc(v || '—') + '</div></div>';
    var opts = f.options, t = f.t;
    if (r && r._opts && f.k === 'Value') { t = 'select'; opts = r._opts; }
    if (r && r._num && f.k === 'Value') t = 'number';
    var el;
    if (t === 'yesno') el = '<select class="inp" id="' + id + '">' + T.opts(['Yes', 'No'], v || 'Yes') + '</select>';
    else if (t === 'select') el = '<select class="inp" id="' + id + '">' + T.opts(opts || [], v, f.blank || '—') + '</select>';
    else if (t === 'suggest') el = '<input class="inp" id="' + id + '" list="' + id + '_l" value="' + esc(v) + '" placeholder="Choose or type"><datalist id="' + id + '_l">' + (opts || []).map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>';
    else el = '<input class="inp" id="' + id + '" type="' + (t === 'number' ? 'number' : 'text') + '" value="' + esc(v) + '"' + (t === 'number' ? ' inputmode="numeric"' : '') + '>';
    return '<div class="f' + (f.k === 'What it means' || f.k === 'Notes' ? ' full' : '') + '"><label for="' + id + '">' + esc(f.l) + (f.req ? ' *' : '') + '</label>' + el + (f.help ? '<div class="small muted" style="margin-top:4px">' + esc(f.help) + '</div>' : '') + '</div>';
  }
  function openForm(list, key) {
    var d = CACHE[list]; if (!d) return;
    var r = key ? d.rows.filter(function (x) { return x._key === key; })[0] : null, isNew = !r;
    var title = isNew ? 'Add ' + ({ workers: 'worker', campuses: 'campus', events: 'event', stages: 'stage', groups: 'small group', departments: 'department', routes: 'request type', approvers: 'approver' }[list] || 'item') : (r._key + '');
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
        T.stale('lookups', 'people', 'members', 'groups', 'stewards'); P.set('config', null); P.refreshConfig();
        P.closeDrawer(); P.app.render();
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
      '<div class="card"><h3>Reports</h3><p class="small" style="margin-top:-4px">The Dashboard is the church report. Open it, choose a campus if needed, then tap <b>Print report</b> to print or save it as PDF.</p><button class="btn ghost sm" data-go="dash">Open the Dashboard</button></div></div>' +
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
