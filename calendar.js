/* Pathway: Church calendar. Everyone signed in sees what is coming up; Admins and Leaders add events.
   Public events also appear on events.html (the "What's on" page anyone can open without signing in). */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>';
  var MODE = 'list', MONTH = null, PICK = null, DATA = null, EV = null;
  var MON = function (d) { return d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(); };
  var D10 = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  function publicUrl() { var b = (DATA && DATA.appAddress) || P.appBase(); if (!/\/$/.test(b)) b += '/'; return b + 'events.html'; }
  function items() { // calendar events plus published service grids, as one list
    var ev = DATA.events.map(function (e) { return Object.assign({ kind: 'event', d0: P.day(e.start), d1: P.day(e.end || e.start) }, e); });
    var sv = DATA.services.map(function (s) { return { kind: 'service', id: s.id, title: s.title, category: 'Service', time: s.start, venue: s.venue, campus: s.campus, start: s.date, end: s.date, d0: P.day(s.date), d1: P.day(s.date), pub: true }; });
    return ev.concat(sv).sort(function (a, b) { return a.d0 - b.d0 || String(a.time).localeCompare(String(b.time)); });
  }
  function when(e) {
    var same = e.d0.getTime() === e.d1.getTime(), o = { weekday: 'short', day: 'numeric', month: 'short' };
    return (same ? e.d0.toLocaleDateString('en-GB', o) : e.d0.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' – ' + e.d1.toLocaleDateString('en-GB', o)) + (e.time ? ' · ' + e.time : '');
  }
  function shareText(e) { return '*' + e.title + '*\n' + when(e) + (e.venue ? '\n📍 ' + e.venue : '') + (e.link ? '\n' + e.link : '') + '\n\nSee everything coming up: ' + publicUrl(); }
  function card(e) {
    var t = P.today(), now = e.d0 <= t && e.d1 >= t;
    return '<div class="card cal-card' + (now ? ' now' : '') + '" id="ev-' + esc(e.id) + '"><div class="cal-tile"><b>' + e.d0.getDate() + '</b><span>' + MON(e.d0) + '</span></div><div style="flex:1;min-width:0">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">' + (now ? '<span class="tag gold">Happening now</span>' : '') + '<span class="tag">' + (P.CAT_ICON[e.category] || '') + ' ' + esc(e.category) + '</span>' +
      (e.kind === 'service' ? '<span class="tag grey">Service grid</span>' : '') + (e.pub === false ? '<span class="tag grey">Church only</span>' : '') + (e.campus ? '<span class="tag grey">' + esc(e.campus) + '</span>' : '') + '</div>' +
      '<b style="font-size:16px;display:block;overflow-wrap:anywhere">' + esc(e.title) + '</b><div class="small muted">' + esc(when(e)) + (e.venue ? ' · <a href="' + P.mapLink(e.venue) + '" target="_blank" rel="noopener">📍 ' + esc(e.venue) + '</a>' : '') + '</div>' +
      (e.desc ? '<div class="small" style="margin-top:6px;white-space:pre-wrap">' + esc(e.desc) + '</div>' : '') +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' + (e.link ? '<a class="btn sm" href="' + esc(e.link) + '" target="_blank" rel="noopener">Register / RSVP</a>' : '') +
      '<button class="btn ghost sm" data-cics="' + esc(e.id) + '">Add to my calendar</button><a class="btn ghost sm wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(shareText(e)) + '">Share</a>' +
      (e.kind === 'service' ? '<button class="btn ghost sm" data-go="grid">View grid</button>' : '') + (e.canEdit ? '<button class="btn ghost sm" data-cedit="' + esc(e.id) + '">Edit</button>' : '') + '</div></div></div>';
  }
  function monthView(all) {
    var m = MONTH || new Date(P.today().getFullYear(), P.today().getMonth(), 1), first = new Date(m.getFullYear(), m.getMonth(), 1), start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start on Monday
    var cells = '', t = P.today().getTime();
    for (var i = 0; i < 42; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i);
      var on = all.filter(function (e) { return e.d0 <= d && e.d1 >= d; }), inM = d.getMonth() === m.getMonth();
      cells += '<button class="cal-day' + (inM ? '' : ' out') + (d.getTime() === t ? ' today' : '') + (PICK && PICK.getTime() === d.getTime() ? ' pick' : '') + '" data-cday="' + D10(d) + '" aria-label="' + d.toDateString() + ', ' + on.length + ' events">' +
        '<span>' + d.getDate() + '</span>' + (on.length ? '<i>' + on.slice(0, 3).map(function (e) { return '<em class="' + (e.kind === 'service' ? 's' : '') + '"></em>'; }).join('') + '</i>' : '') + '</button>';
    }
    var sel = PICK ? all.filter(function (e) { return e.d0 <= PICK && e.d1 >= PICK; }) : [];
    return '<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><button class="btn ghost sm" data-cmon="-1" aria-label="Previous month">‹</button><b style="flex:1;text-align:center;font-size:16px">' +
      m.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + '</b><button class="btn ghost sm" data-cmon="1" aria-label="Next month">›</button></div>' +
      '<div class="cal-grid">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (x) { return '<div class="cal-h">' + x + '</div>'; }).join('') + cells + '</div>' +
      '<div class="small muted" style="margin-top:8px"><em class="cal-dot"></em> event &nbsp; <em class="cal-dot s"></em> service grid · tap a day</div></div>' +
      (PICK ? '<div class="sec">' + PICK.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div>' + (sel.map(card).join('') || '<div class="card muted small">Nothing on this day.' + (DATA.canAdd ? ' <button class="btn sm" data-cnew="' + D10(PICK) + '">+ Add an event on this day</button>' : '') + '</div>') : '');
  }
  P.views.calendar = { title: 'Church calendar', icon: ICON, render: function (v) {
    T.loading(v); var gone = T.guard();
    T.api('calList').then(function (d) {
      if (gone()) return;
      DATA = d; var all = items(), t = P.today(), up = all.filter(function (e) { return e.d1 >= t; }), past = all.filter(function (e) { return e.d1 < t; }).reverse().slice(0, 6);
      var weekEnd = new Date(t); weekEnd.setDate(t.getDate() + 7);
      var thisWeek = up.filter(function (e) { return e.d0 <= weekEnd; }), later = up.filter(function (e) { return e.d0 > weekEnd; });
      v.innerHTML = '<div class="tools"><div class="seg"><button class="' + (MODE === 'list' ? 'on' : '') + '" data-cmode="list">Upcoming</button><button class="' + (MODE === 'month' ? 'on' : '') + '" data-cmode="month">Month</button></div>' +
        '<span class="sp" style="flex:1"></span><a class="btn ghost sm" href="events.html" target="_blank" rel="noopener">Public page</a><a class="btn ghost sm wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('See what is coming up at ' + (P.config().church || 'church') + ': ' + publicUrl()) + '">Share page</a>' +
        (d.canAdd ? '<button class="btn sm" data-cnew="1">+ Add event</button>' : '') + '</div>' +
        (MODE === 'month' ? monthView(all) :
          (up.length ? (thisWeek.length ? '<div class="sec">This week</div>' + thisWeek.map(card).join('') : '') + (later.length ? '<div class="sec">Later</div>' + later.map(card).join('') : '') :
            '<div class="card" style="text-align:center;padding:30px"><div style="font-size:36px">🗓️</div><b>Nothing on the calendar yet</b><p class="muted small">' + (d.canAdd ? 'Add services, conferences, outreaches and meetings. Public ones also show on the What’s on page that anyone can open without signing in.' : 'Events added by church leaders will show here.') + '</p>' + (d.canAdd ? '<button class="btn" data-cnew="1">+ Add event</button>' : '') + '</div>') +
          (past.length ? '<details style="margin-top:14px"><summary class="small muted" style="cursor:pointer">Recent events</summary>' + past.map(card).join('') + '</details>' : ''));
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };

  // ---------- add / edit ----------
  function openEditor(e) {
    EV = Object.assign({ title: '', category: 'Service', start: '', end: '', time: '', venue: (DATA.venue || ''), campus: '', desc: '', pub: true, link: '' }, e || {});
    var cats = DATA.categories, u = T.user(), camps = P.config().campuses || [], forms = DATA.forms || [];
    var sd = EV.start ? D10(P.day(EV.start)) : (EV._day || ''), ed = EV.end && EV.end !== EV.start ? D10(P.day(EV.end)) : '';
    T.openDrawer(T.dhead(EV.id ? 'Edit event' : 'New event', EV.id ? esc(EV.title) : 'It shows in the app and, if public, on the What’s on page') + '<div class="db"><div class="card"><div class="form">' +
      '<div class="f full"><label for="ctitle">Event name *</label><input class="inp" id="ctitle" value="' + esc(EV.title) + '" placeholder="e.g. Thanksgiving Service"></div>' +
      '<div class="f full"><label>Kind of event</label><div class="chips" id="ccat">' + cats.map(function (c) { return '<span class="chip' + (c === EV.category ? ' on' : '') + '" role="button" tabindex="0" data-ccat="' + esc(c) + '">' + (P.CAT_ICON[c] || '') + ' ' + esc(c) + '</span>'; }).join('') + '</div></div>' +
      '<div class="f"><label for="cstart">Date *</label><input class="inp" type="date" id="cstart" value="' + sd + '"></div>' +
      '<div class="f"><label for="cend">Ends (if more than one day)</label><input class="inp" type="date" id="cend" value="' + ed + '"></div>' +
      '<div class="f"><label for="ctime">Time</label><input class="inp" id="ctime" value="' + esc(EV.time) + '" placeholder="e.g. 9am or 5:30pm – 8pm"></div>' +
      '<div class="f"><label for="cvenue">Venue</label><input class="inp" id="cvenue" value="' + esc(EV.venue) + '" placeholder="e.g. Sandralia Hotel, Jabi"></div>' +
      (u.role === 'Admin' && camps.length ? '<div class="f"><label for="ccamp">' + esc(P.cw()) + '</label><select class="inp" id="ccamp">' + T.opts(camps, EV.campus, 'Whole church') + '</select></div>' : '') +
      '<div class="f"><label for="clinkf">Registration or RSVP</label><select class="inp" id="clinkf">' + T.opts([{ v: '', l: 'None' }].concat(forms.map(function (f) { return { v: f.link, l: 'Form: ' + f.title }; })).concat([{ v: '_own', l: 'Another link (paste below)' }]),
        forms.some(function (f) { return f.link === EV.link; }) ? EV.link : (EV.link ? '_own' : '')) + '</select></div>' +
      '<div class="f full" id="clinkbox"' + (EV.link && !forms.some(function (f) { return f.link === EV.link; }) ? '' : ' hidden') + '><label for="clink">Link</label><input class="inp" id="clink" value="' + esc(EV.link) + '" placeholder="https://"></div>' +
      '<div class="f full"><label for="cdesc">About the event (optional)</label><textarea class="inp" id="cdesc" rows="3" placeholder="Who it is for, what to bring, dress code…">' + esc(EV.desc) + '</textarea></div>' +
      '<label class="small full" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="cpub"' + (EV.pub !== false ? ' checked' : '') + '> <span><b>Public</b>: also show it on the What’s on page anyone can open. Untick for church-only events such as workers’ meetings.</span></label>' +
      '</div></div><div style="display:flex;gap:10px;justify-content:flex-end;margin:16px 0;flex-wrap:wrap">' + (EV.id ? '<button class="btn ghost" data-cdel="' + esc(EV.id) + '" style="color:var(--red)">Delete</button><span class="sp" style="flex:1"></span>' : '') +
      '<button class="btn ghost" data-close="1">Cancel</button><button class="btn" id="csave">' + (EV.id ? 'Save changes' : 'Add to calendar') + '</button></div>' +
      '<p class="small muted">Tip: make an RSVP in Polls &amp; forms first, then choose it above so people can say they are coming.</p></div>');
    if (!EV.title) setTimeout(function () { var t = $('ctitle'); if (t) t.focus(); }, 60);
  }
  function save(btn) {
    var own = $('clinkf').value === '_own', x = { id: EV.id, title: $('ctitle').value, category: EV.category, start: $('cstart').value, end: $('cend').value, time: $('ctime').value,
      venue: $('cvenue').value, campus: $('ccamp') ? $('ccamp').value : EV.campus, desc: $('cdesc').value, pub: $('cpub').checked, link: own ? $('clink').value : $('clinkf').value, base: P.appBase() };
    if (!x.title.trim()) { P.toast('Give the event a name'); $('ctitle').focus(); return; }
    if (!x.start) { P.toast('Choose the date'); $('cstart').focus(); return; }
    T.busy(btn, true);
    T.api('calSave', { event: x }).then(function () { P.toast(EV.id ? 'Saved ✓' : 'Added to the calendar ✓'); EV = null; T.S._dirty = true; P.closeDrawer(); })
      .catch(function (e) { T.busy(btn, false); P.toast(e.message); });
  }
  function find(id) { return DATA && items().filter(function (e) { return String(e.id) === String(id); })[0]; }
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-cmode]'))) { MODE = x.dataset.cmode; P.app.render(); return; }
    if ((x = t.closest('[data-cmon]'))) { var m = MONTH || new Date(P.today().getFullYear(), P.today().getMonth(), 1); MONTH = new Date(m.getFullYear(), m.getMonth() + (+x.dataset.cmon), 1); PICK = null; P.app.render(); return; }
    if ((x = t.closest('[data-cday]'))) { var p = x.dataset.cday.split('-'); PICK = new Date(+p[0], +p[1] - 1, +p[2]); P.app.render(); return; }
    if ((x = t.closest('[data-cnew]'))) { openEditor(x.dataset.cnew.length === 10 ? { _day: x.dataset.cnew } : null); return; }
    if ((x = t.closest('[data-cedit]'))) { var ev = find(x.dataset.cedit); if (ev) openEditor(ev); return; }
    if ((x = t.closest('[data-cics]'))) { var ic = find(x.dataset.cics); if (ic) { P.icsFile(ic); P.toast('Open the downloaded file to add it to your calendar'); } return; }
    if (!EV || !t.closest('#drawer')) return;
    if ((x = t.closest('[data-ccat]'))) { EV.category = x.dataset.ccat; [].forEach.call(document.querySelectorAll('#ccat .chip'), function (c) { c.classList.toggle('on', c === x); }); return; }
    if (t.id === 'csave') { save(t); return; }
    if ((x = t.closest('[data-cdel]'))) { if (!window.confirm('Delete "' + EV.title + '" from the calendar?')) return; T.api('calRemove', { id: x.dataset.cdel }).then(function () { P.toast('Deleted'); EV = null; T.S._dirty = true; P.closeDrawer(); }).catch(function (e2) { P.toast(e2.message); }); }
  });
  document.addEventListener('change', function (e) { if (EV && e.target.id === 'clinkf') { $('clinkbox').hidden = e.target.value !== '_own'; if (e.target.value === '_own') $('clink').focus(); } });
})();
