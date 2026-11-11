/* Pathway step 4: service grids – build from a template, times worked out from the minutes, publish to notify,
   people confirm their item, everyone signed in can view and print. Uses helpers from tracker.js (P.T). */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7"/></svg>';
  var SECTIONS = ['Pre-service', 'Service'], L = null, ED = null, OPEN = null;
  var MON = function (d) { return d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; };
  var SHORTD = function (d) { return d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''; };
  var D10 = function (d) { var x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  var stTag = function (s) { return s ? '<span class="tag ' + ({ Confirmed: 'green', Notified: 'amber', "Can't make it": 'red' }[s] || 'grey') + '">' + esc(s === 'Notified' ? 'Not confirmed yet' : s) + '</span>' : ''; };

  function mins(v) { var m = String(v || '').trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i); if (!m) return null; var h = +m[1], mi = +(m[2] || 0), ap = (m[3] || '').toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; return h > 23 || mi > 59 ? null : h * 60 + mi; }
  function hm(n) { if (n == null) return ''; n = ((n % 1440) + 1440) % 1440; var h = Math.floor(n / 60), m = n % 60; return (h % 12 || 12) + ':' + ('0' + m).slice(-2) + ' ' + (h >= 12 ? 'pm' : 'am'); }
  function retime() {
    var at = { 'Pre-service': mins(ED.svc.preStart), 'Service': mins(ED.svc.start) };
    SECTIONS.forEach(function (sec) {
      var t = at[sec];
      ED.items.filter(function (i) { return i.section === sec; }).forEach(function (i) { i.start = t == null ? '' : hm(t); t = t == null ? null : t + Math.max(0, +i.minutes || 0); i.end = t == null ? '' : hm(t); });
    });
  }
  function lookups() { return L ? Promise.resolve(L) : T.api('gridLookups').then(function (j) { L = j; return j; }); }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  // ---------- list ----------
  P.views.grid = { title: 'Service grids', icon: ICON, render: function (v) {
    if (ED) return drawEditor(v);
    if (OPEN) return openView(v, OPEN);
    T.loading(v); var gone = T.guard();
    Promise.all([lookups(), T.api('listServices')]).then(function (r) {
      if (gone()) return;
      var ss = r[1].services, today = D10(new Date()), up = ss.filter(function (s) { return D10(s.date) >= today; }).reverse(), past = ss.filter(function (s) { return D10(s.date) < today; }).slice(0, 12);
      var card = function (s) {
        return '<div class="row click" data-svc="' + esc(s.id) + '"><div class="av" style="background:var(--teal-l);color:var(--teal)">' + new Date(s.date).getDate() + '</div><div class="meta"><b>' + esc(s.title) + '</b><span>' + SHORTD(s.date) + ' · starts ' + esc(s.start) + (s.campus ? ' · ' + esc(s.campus) : '') +
          (r[0].canBuild && s.status === 'Published' ? ' · ' + s.confirmed + '/' + s.toConfirm + ' confirmed' + (s.cant ? ' · ' + s.cant + " can't make it" : '') : '') + '</span></div>' +
          (s.mine ? '<span class="tag gold">You\'re on it</span>' : '') + (s.status === 'Draft' ? '<span class="tag grey">Draft</span>' : s.cant ? '<span class="tag red">Reassign</span>' : '') + '<span class="muted">›</span></div>';
      };
      v.innerHTML = (r[0].canBuild ? '<div class="tools"><select class="inp" id="gtpl">' + T.opts(r[0].templates.map(function (t) { return { v: t, l: 'Start from: ' + t }; }), r[0].templates[0]) + '<option value="">Start from a blank grid</option></select><button class="btn" id="gnew">+ New service grid</button></div>' : '') +
        '<div class="grid g2" style="align-items:start"><div class="card"><h3>Coming up</h3>' + (up.map(card).join('') || '<div class="muted small">No upcoming services' + (r[0].canBuild ? ' yet. Build one above.' : ' published yet.') + '</div>') + '</div>' +
        '<div class="card"><h3>Past services</h3>' + (past.map(card).join('') || '<div class="muted small">None yet</div>') + '</div></div>';
      if ($('gnew')) $('gnew').onclick = function () { startNew($('gtpl').value); };
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-svc]'); if (!b) return;
    OPEN = b.dataset.svc; ED = null; P.app.go('grid');
  });
  function startNew(tpl) {
    var next = new Date(); next.setDate(next.getDate() + ((7 - next.getDay()) % 7 || 7));
    var go = function (items) {
      var type = /mid/i.test(tpl) ? 'Midweek service' : tpl ? 'Sunday service' : (L.types[0] || '');
      ED = { svc: { id: '', title: type === 'Midweek service' ? 'Midweek Service' : 'Sunday Service', type: type, date: D10(next), venue: L.venue, campus: '', callup: '8:00 am', preStart: '8:10 am', start: '9:00 am', notes: '', status: 'Draft' },
        items: items.map(function (i) { i.id = uid(); i.status = ''; return i; }) };
      P.app.go('grid');
    };
    if (!tpl) return go([{ section: 'Service', description: '', minister: '', handler: '', kind: 'Person', minutes: 5, remarks: '', cues: [] }]);
    T.api('getService', { template: tpl }).then(function (j) { go(j.items); }).catch(function (e) { P.toast(e.message); });
  }

  // ---------- editor ----------
  function whoOpts(i) {
    var cur = i.kind === 'Guest' ? 'G:' : i.handler ? (i.kind === 'Team' ? 'T:' : 'P:') + i.handler : '';
    var o = function (v, l) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>'; };
    return o('', '— Not assigned yet —') + o('G:', 'Guest / not on Pathway (no notice)') +
      '<optgroup label="Teams (head is told)">' + L.teams.map(function (t) { return o('T:' + t.name, t.name + (t.head ? ' · ' + t.head : '')); }).join('') + '</optgroup>' +
      '<optgroup label="People">' + L.people.map(function (n) { return o('P:' + n, n); }).join('') + '</optgroup>';
  }
  function itemHtml(i, idx) {
    return '<div class="gi" data-i="' + idx + '"><div class="gi-top"><span class="gtime" data-t="' + idx + '">' + esc(i.start ? i.start + ' – ' + i.end : '—') + '</span>' + stTag(i.status) + '<span class="sp" style="flex:1"></span>' +
      '<button class="btn ghost sm" data-mv="-1" aria-label="Move up">↑</button><button class="btn ghost sm" data-mv="1" aria-label="Move down">↓</button><button class="btn ghost sm" data-del="1" aria-label="Remove" style="color:var(--red)">✕</button></div>' +
      '<div class="mini"><input class="inp" data-f="description" value="' + esc(i.description) + '" placeholder="What happens, e.g. Praise Session"><input class="inp" data-f="minutes" type="number" min="0" inputmode="numeric" value="' + esc(i.minutes) + '" aria-label="Minutes" style="flex:0 0 76px;min-width:0"><span class="small muted">min</span></div>' +
      '<div class="mini" style="margin-top:8px"><select class="inp" data-f="who" aria-label="Who handles it">' + whoOpts(i) + '</select><input class="inp" data-f="minister" value="' + esc(i.minister) + '" placeholder="Name shown on the grid (e.g. PBow, EPOP)"></div>' +
      '<textarea class="inp" data-f="remarks" rows="2" placeholder="Remarks / cues" style="margin-top:8px;width:100%">' + esc(i.remarks) + '</textarea>' +
      '<details style="margin-top:6px"><summary class="small muted" style="cursor:pointer">Also alert teams (' + (i.cues.length ? esc(i.cues.join(', ')) : 'none') + ')</summary><div class="chips" style="margin-top:6px">' +
      L.teams.map(function (t) { return '<label class="chip' + (i.cues.indexOf(t.name) >= 0 ? ' on' : '') + '"><input type="checkbox" data-cue="' + esc(t.name) + '"' + (i.cues.indexOf(t.name) >= 0 ? ' checked' : '') + ' hidden>' + esc(t.name) + '</label>'; }).join('') + '</div></details></div>';
  }
  function drawEditor(v) {
    lookups().then(function () {
      var s = ED.svc, pub = s.status === 'Published'; retime();
      var f = function (k, label, type, ph) { return '<div class="f"><label>' + label + '</label><input class="inp" data-sv="' + k + '" type="' + (type || 'text') + '" value="' + esc(s[k] || '') + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></div>'; };
      v.innerHTML = '<div class="banner">' + (pub ? '✏️ Editing a <b>published</b> grid. When you save, only the people whose part changed are told again.' : '📝 Draft: nobody is told until you press <b>Publish</b>.') + ' Times work themselves out from the start times and minutes.</div>' +
        '<div class="card"><div class="form">' + f('title', 'Service name') +
        '<div class="f"><label>Type</label><select class="inp" data-sv="type">' + T.opts(L.types, s.type) + '</select></div>' + f('date', 'Date', 'date') + f('venue', 'Venue') +
        '<div class="f"><label>Campus</label><select class="inp" data-sv="campus">' + T.opts(L.campuses, s.campus, 'All / not specific') + '</select></div>' +
        f('callup', 'Call-up time / service brief', 'text', '8:00 am') + f('preStart', 'Pre-service starts', 'text', '8:10 am') + f('start', 'Service starts', 'text', '9:00 am') +
        '<div class="f full"><label>Notes for the team (optional)</label><input class="inp" data-sv="notes" value="' + esc(s.notes || '') + '"></div></div></div>' +
        SECTIONS.map(function (sec) {
          return '<div class="card" style="margin-top:16px"><h3>' + sec + '<span class="sp"></span><span class="small muted">starts ' + esc(sec === 'Service' ? s.start : s.preStart || '—') + '</span></h3><div style="display:grid;gap:12px">' +
            ED.items.map(function (i, idx) { return i.section === sec ? itemHtml(i, idx) : ''; }).join('') + '</div><button class="btn ghost sm" style="margin-top:12px" data-add="' + sec + '">+ Add ' + sec.toLowerCase() + ' item</button></div>';
        }).join('') +
        '<div class="gbar"><button class="btn ghost" id="gcancel">Close</button>' + (s.id ? '<button class="btn ghost" id="gdel" style="color:var(--red)">Delete</button>' : '') + '<button class="btn ghost" id="gtplsave">Save as template</button><span class="sp" style="flex:1"></span>' +
        (pub ? '' : '<button class="btn ghost" id="gdraft">Save draft</button>') + '<button class="btn gold" id="gpub">' + (pub ? 'Save & tell changes' : 'Publish & notify') + '</button></div>';
      bindEditor(v);
    }).catch(function (e) { T.fail(v, e); });
  }
  function bindEditor(v) {
    var times = function () { retime(); ED.items.forEach(function (i, idx) { var t = v.querySelector('[data-t="' + idx + '"]'); if (t) t.textContent = i.start ? i.start + ' – ' + i.end : '—'; }); };
    v.oninput = v.onchange = function (e) {
      var el = e.target, sv = el.dataset.sv;
      if (sv) { ED.svc[sv] = el.value; if (['start', 'preStart'].indexOf(sv) >= 0) times(); return; }
      var box = el.closest('.gi'); if (!box) return;
      var i = ED.items[+box.dataset.i], fld = el.dataset.f;
      if (el.dataset.cue) { var c = el.dataset.cue; i.cues = el.checked ? i.cues.concat([c]) : i.cues.filter(function (x) { return x !== c; }); el.parentNode.classList.toggle('on', el.checked); return; }
      if (fld === 'who') {
        var old = i.handler, val = el.value; i.kind = val.charAt(0) === 'T' ? 'Team' : val.charAt(0) === 'G' ? 'Guest' : 'Person'; i.handler = val.slice(2);
        if (!i.minister || i.minister === old) { i.minister = i.handler; box.querySelector('[data-f="minister"]').value = i.minister; }
        return;
      }
      if (fld) { i[fld] = fld === 'minutes' ? +el.value || 0 : el.value; if (fld === 'minutes') times(); }
    };
    v.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var box = b.closest('.gi'), idx = box ? +box.dataset.i : -1;
      if (b.dataset.add) { ED.items.push({ id: uid(), section: b.dataset.add, description: '', minister: '', handler: '', kind: 'Person', minutes: 5, remarks: '', cues: [], status: '' }); return drawEditor(v); }
      if (b.dataset.del) { if (window.confirm('Remove this item?')) { ED.items.splice(idx, 1); drawEditor(v); } return; }
      if (b.dataset.mv) {
        var dir = +b.dataset.mv, sec = ED.items[idx].section, j = idx + dir;
        while (j >= 0 && j < ED.items.length && ED.items[j].section !== sec) j += dir;
        if (j >= 0 && j < ED.items.length) { var t = ED.items[idx]; ED.items[idx] = ED.items[j]; ED.items[j] = t; drawEditor(v); }
        return;
      }
      if (b.id === 'gcancel') { if (window.confirm('Close without saving the latest changes?')) { OPEN = ED.svc.id || null; ED = null; P.app.render(); } return; }
      if (b.id === 'gdel') { if (window.confirm('Delete this service grid?' + (ED.svc.status === 'Published' ? ' Everyone on it will be told it is cancelled.' : ''))) T.api('deleteService', { id: ED.svc.id }).then(function () { P.toast('Deleted'); ED = null; OPEN = null; P.app.render(); }).catch(function (e2) { P.toast(e2.message); }); return; }
      if (b.id === 'gtplsave') { var n = window.prompt('Template name (use an existing name to replace it):', ED.svc.type || 'Sunday service'); if (n) T.api('saveTemplate', { name: n, items: payload() }).then(function () { L = null; P.toast('Template saved ✓'); }).catch(function (e2) { P.toast(e2.message); }); return; }
      if (b.id === 'gdraft' || b.id === 'gpub') save(b, b.id === 'gpub');
    };
  }
  function payload() {
    var ord = { 'Pre-service': 0, 'Service': 0 };
    return ED.items.map(function (i) { return { id: i.id, order: ++ord[i.section], section: i.section, description: i.description, minister: i.minister, handler: i.handler, kind: i.kind, minutes: i.minutes, remarks: i.remarks, cues: i.cues }; });
  }
  function save(b, publish) {
    var s = ED.svc;
    if (!s.title || !s.date) { P.toast('Enter the service name and date'); return; }
    if (mins(s.start) == null) { P.toast('Enter the service start time, e.g. 9:00 am'); return; }
    if (publish && s.status !== 'Published' && !window.confirm('Publish now? Everyone with a part (and team heads) will be told.')) return;
    T.busy(b, true);
    T.api('saveService', { service: s, items: payload(), publish: publish }).then(function (j) {
      P.toast(j.status === 'Published' ? 'Saved ✓ ' + (j.notified ? j.notified + ' notice(s) sent' : 'no one needed a new notice') : 'Draft saved ✓');
      ED = null; OPEN = j.id; P.app.render();
    }).catch(function (e) { T.busy(b, false); P.toast(e.message); });
  }

  // ---------- view / print ----------
  function openView(v, id) {
    T.loading(v); var gone = T.guard();
    Promise.all([lookups(), T.api('getService', { id: id })]).then(function (r) {
      if (gone()) return;
      var s = r[1].service, items = r[1].items, b = r[1].canBuild, n = 0;
      var row = function (i) {
        n++;
        var who = i.minister || i.handler || '<span class="muted">to be assigned</span>';
        return '<tr class="' + (i.mine ? 'gmine' : '') + '"><td>' + n + '</td><td><b>' + esc(i.description) + '</b>' + (i.remarks ? '<div class="small muted hide-d" style="margin-top:4px">' + esc(i.remarks) + '</div>' : '') +
          (i.mine && s.status === 'Published' ? '<div class="noprint" style="margin-top:6px">' + (i.status === 'Confirmed' ? stTag('Confirmed') : '<button class="btn sm" data-ans="Confirmed" data-item="' + esc(i.id) + '">Confirm</button> <button class="btn ghost sm" data-ans="Can\'t make it" data-item="' + esc(i.id) + '">Can\'t make it</button>') + '</div>' : '') + '</td>' +
          '<td>' + (i.minister ? esc(i.minister) : who) + (b && i.kind === 'Team' && i.handler && i.handler !== i.minister ? '<div class="small muted noprint">' + esc(i.handler) + '</div>' : '') + '</td><td>' + esc(i.minutes) + '</td><td style="white-space:nowrap">' + esc(i.start) + ' – ' + esc(i.end) + '</td>' +
          '<td class="hm">' + esc(i.remarks).replace(/\n/g, '<br>') + '</td>' + (b ? '<td class="noprint">' + (i.kind === 'Guest' ? '<span class="small muted">Guest</span>' : stTag(i.status)) + '</td>' : '') + '</tr>';
      };
      var sec = function (name) {
        var list = items.filter(function (i) { return i.section === name; }); n = 0;
        if (!list.length) return '';
        return '<tr class="gsec"><td colspan="' + (b ? 7 : 6) + '">' + (name === 'Pre-service' ? 'Pre-service' : 'Service') + '</td></tr>' + list.map(row).join('');
      };
      var mine = items.filter(function (i) { return i.mine; });
      v.innerHTML = '<div class="tools noprint"><button class="btn ghost sm" id="gback">← All service grids</button><span class="sp" style="flex:1"></span><button class="btn ghost sm" onclick="window.print()">Print / save PDF</button>' + (b ? '<button class="btn sm" id="gedit">Edit</button>' : '') + '</div>' +
        (s.status === 'Draft' ? '<div class="banner noprint">📝 Draft: not published yet, so nobody has been told.</div>' : '') +
        (mine.length ? '<div class="banner noprint">⭐ You have <b>' + mine.length + '</b> part' + (mine.length > 1 ? 's' : '') + ' in this service (highlighted). Please confirm each one.</div>' : '') +
        '<div class="card gdoc"><div class="ghead"><div class="gch">' + esc((L.church || 'The Elevation Church').toUpperCase()) + (s.campus ? ', ' + esc(s.campus.toUpperCase()) : '') + '</div>' + (s.venue ? '<div>' + esc(s.venue) + '</div>' : '') +
        '<div class="gtitle">' + esc(s.title.toUpperCase()) + '</div></div><div class="gmeta"><div><b>DATE:</b> ' + esc(MON(s.date).toUpperCase()) + '</div><div><b>SERVICE STARTS:</b> ' + esc(s.start.toUpperCase()) + '</div>' +
        (s.callup ? '<div><b>CALL-UP TIME / SERVICE BRIEF:</b> ' + esc(s.callup.toUpperCase()) + '</div>' : '') + (s.notes ? '<div><b>NOTE:</b> ' + esc(s.notes) + '</div>' : '') + '</div>' +
        '<div class="tablecard" style="padding:0"><table class="gtable"><thead><tr><th>S/N</th><th>Description</th><th>Minister</th><th>Min</th><th>Time</th><th class="hm">Remarks</th>' + (b ? '<th class="noprint">Status</th>' : '') + '</tr></thead><tbody>' +
        sec('Pre-service') + sec('Service') + '</tbody></table></div>' + (b ? '<div class="small muted noprint" style="margin-top:10px">Built by ' + esc(s.builtBy) + (s.published ? ' · published ' + T.fmt(s.published) : '') + '</div>' : '') + '</div>';
      $('gback').onclick = function () { OPEN = null; P.app.render(); };
      if ($('gedit')) $('gedit').onclick = function () {
        ED = { svc: { id: s.id, title: s.title, type: s.type, date: D10(s.date), venue: s.venue, campus: s.campus, callup: s.callup, preStart: s.preStart, start: s.start, notes: s.notes, status: s.status },
          items: items.map(function (i) { return { id: i.id, section: i.section, description: i.description, minister: i.minister, handler: i.handler, kind: i.kind, minutes: i.minutes, remarks: i.remarks, cues: i.cues || [], status: i.status }; }) };
        OPEN = null; P.app.render();
      };
      v.onclick = function (e) {
        var x = e.target.closest('[data-ans]'); if (!x) return;
        T.busy(x, true);
        T.api('answerItem', { service: s.id, item: x.dataset.item, answer: x.dataset.ans }).then(function () {
          P.toast(x.dataset.ans === 'Confirmed' ? 'Thank you! Confirmed ✓' : 'The grid builder has been told'); if (P.refreshBadges) P.refreshBadges(); P.app.render();
        }).catch(function (e2) { T.busy(x, false); P.toast(e2.message); });
      };
    }).catch(function (e) { if (!gone()) { OPEN = null; T.fail(v, e); } });
  }
  P.openService = function (id) { OPEN = id; ED = null; P.app.go('grid'); };
})();
