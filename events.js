/* Pathway public "What's on" page (events.html): anyone can open it, no sign-in. Shows public calendar events and service times,
   with a live countdown to the next one, filters, add-to-calendar, map links and WhatsApp sharing. Works offline from the last copy. */
(function () {
  var P = window.Pathway, $ = function (id) { return document.getElementById(id); }, esc = P.esc;
  var D = null, F = { when: 'all', cat: '', campus: '' }, ALL = [], NEXT = null;
  var MON = function (d) { return d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(); };
  function page() { return location.href.replace(/[#?].*$/, ''); }
  function when(e) {
    var same = e.d0.getTime() === e.d1.getTime(), o = { weekday: 'long', day: 'numeric', month: 'long' };
    return (same ? e.d0.toLocaleDateString('en-GB', o) : e.d0.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' – ' + e.d1.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })) + (e.time ? ' · ' + e.time : '');
  }
  function build() {
    var ev = D.events.map(function (e) { return Object.assign({ d0: P.day(e.start), d1: P.day(e.end || e.start) }, e); });
    var sv = D.services.map(function (s, i) { return { id: 'S' + i, title: s.title, category: 'Service', time: s.start, venue: s.venue, campus: s.campus, start: s.date, end: s.date, d0: P.day(s.date), d1: P.day(s.date), desc: '' }; });
    ALL = ev.concat(sv).sort(function (a, b) { return a.d0 - b.d0 || String(a.time).localeCompare(String(b.time)); });
  }
  function shown() {
    var t = P.today(), wk = new Date(t); wk.setDate(t.getDate() + 7); var mo = new Date(t); mo.setDate(t.getDate() + 31);
    return ALL.filter(function (e) {
      if (F.cat && e.category !== F.cat) return false;
      if (F.campus && e.campus && e.campus !== F.campus) return false;
      if (F.when === 'week' && e.d0 > wk) return false;
      if (F.when === 'month' && e.d0 > mo) return false;
      return true;
    });
  }
  function card(e) {
    var t = P.today(), now = e.d0 <= t && e.d1 >= t;
    var share = '*' + e.title + '*\n' + when(e) + (e.venue ? '\n📍 ' + e.venue : '') + '\n' + page() + '#ev-' + e.id;
    return '<div class="card cal-card' + (now ? ' now' : '') + '" id="ev-' + esc(e.id) + '"><div class="cal-tile"><b>' + e.d0.getDate() + '</b><span>' + MON(e.d0) + '</span></div><div style="flex:1;min-width:0">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">' + (now ? '<span class="tag gold">Happening now</span>' : '') + '<span class="tag">' + (P.CAT_ICON[e.category] || '') + ' ' + esc(e.category) + '</span>' + (e.campus ? '<span class="tag grey">' + esc(e.campus) + '</span>' : '') + '</div>' +
      '<b style="font-size:17px;display:block;overflow-wrap:anywhere">' + esc(e.title) + '</b><div class="small muted">' + esc(when(e)) + '</div>' +
      (e.venue ? '<div class="small" style="margin-top:2px"><a href="' + P.mapLink(e.venue) + '" target="_blank" rel="noopener">📍 ' + esc(e.venue) + ' (directions)</a></div>' : '') +
      (e.desc ? '<div class="small" style="margin-top:8px;white-space:pre-wrap">' + esc(e.desc) + '</div>' : '') +
      '<div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">' + (e.link ? '<a class="btn sm" href="' + esc(e.link) + '" target="_blank" rel="noopener">Register / RSVP</a>' : '') +
      '<button class="btn ghost sm" data-ics="' + esc(e.id) + '">Add to my calendar</button><a class="btn ghost sm wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(share) + '">Share</a></div></div></div>';
  }
  function chip(k, v, label, on) { return '<span class="chip' + (on ? ' on' : '') + '" role="button" tabindex="0" data-f="' + k + '" data-v="' + esc(v) + '">' + esc(label) + '</span>'; }
  function draw() {
    var t = P.today(), list = shown(), cats = {}, h = '', last = '';
    ALL.forEach(function (e) { cats[e.category] = 1; });
    $('wfil').innerHTML = '<div class="chips">' + chip('when', 'all', 'Everything', F.when === 'all') + chip('when', 'week', 'Next 7 days', F.when === 'week') + chip('when', 'month', 'Next 30 days', F.when === 'month') + '</div>' +
      (Object.keys(cats).length > 1 ? '<div class="chips">' + chip('cat', '', 'All kinds', !F.cat) + Object.keys(cats).map(function (c) { return chip('cat', c, (P.CAT_ICON[c] || '') + ' ' + c, F.cat === c); }).join('') + '</div>' : '') +
      ((D.campuses || []).length > 1 ? '<select class="inp" id="wcamp" style="width:auto" aria-label="' + esc(D.campusWord) + '"><option value="">All ' + esc(String(D.campusWords || 'Campuses').toLowerCase()) + '</option>' + D.campuses.map(function (c) { return '<option' + (c === F.campus ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' : '');
    list.forEach(function (e) {
      var m = e.d0 <= t ? 'Happening now' : e.d0.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (m !== last) { h += '<div class="mon">' + m + '</div>'; last = m; }
      h += card(e);
    });
    $('wlist').innerHTML = h || '<div class="card" style="text-align:center;padding:30px"><div style="font-size:36px">🗓️</div><b>Nothing listed' + (F.when !== 'all' || F.cat ? ' for this choice' : ' yet') + '</b><p class="muted small">Please check back soon.</p></div>';
    if (location.hash && !draw.jumped) { draw.jumped = 1; var el = document.querySelector(location.hash); if (el) setTimeout(function () { el.scrollIntoView({ block: 'center' }); }, 100); }
  }
  function spot() {
    var nowT = Date.now(), t = P.today();
    NEXT = ALL.filter(function (e) { var s = P.startsAt(e.start, e.time); return s ? s.getTime() > nowT - 3 * 3600e3 : e.d1 >= t; })[0] || null;
    if (!NEXT) { $('wspot').innerHTML = ''; return; }
    var s = P.startsAt(NEXT.start, NEXT.time), ms = s ? s.getTime() - nowT : NEXT.d0 - t, live = (s && ms <= 0) || (!s && NEXT.d0 <= t);
    var dd = Math.max(0, Math.floor(ms / 864e5)), hh = Math.max(0, Math.floor(ms % 864e5 / 36e5)), mm = Math.max(0, Math.floor(ms % 36e5 / 6e4));
    $('wspot').innerHTML = '<div class="card"><div style="flex:1;min-width:220px"><div class="small" style="font-weight:800;letter-spacing:.08em;color:var(--gold)">' + (live ? 'HAPPENING NOW' : 'NEXT UP') + '</div>' +
      '<b style="font-size:20px;display:block">' + esc(NEXT.title) + '</b><div class="small muted">' + esc(when(NEXT)) + (NEXT.venue ? ' · ' + esc(NEXT.venue) : '') + '</div>' +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><a class="btn sm" href="#ev-' + esc(NEXT.id) + '">Details</a><button class="btn ghost sm" data-ics="' + esc(NEXT.id) + '">Add to my calendar</button></div></div>' +
      (live ? '<div class="cd"><div><b>🎉</b><span>Join us</span></div></div>' : '<div class="cd" aria-label="Time left"><div><b>' + dd + '</b><span>days</span></div>' + (s ? '<div><b>' + hh + '</b><span>hours</span></div><div><b>' + mm + '</b><span>mins</span></div>' : '') + '</div>') + '</div>';
  }
  function show(d) {
    D = d; P.set('pub_events', d);
    document.title = 'What’s on · ' + d.church; $('wch').textContent = d.church;
    $('wmsg').textContent = d.message || 'Here is what is happening. Everyone is welcome.';
    $('wfoot').textContent = d.church + (d.venue ? ' · ' + d.venue : '');
    build(); spot(); draw();
  }
  function load() {
    var saved = P.get('pub_events');
    $('woff').hidden = P.online();
    if (!P.online() && saved) { show(saved); return; }
    P.call('publicEvents').then(show).catch(function (e) { if (saved) { show(saved); P.toast('Weak connection: showing the last saved list'); } else $('wlist').innerHTML = '<div class="card">' + esc(e.message) + '</div>'; });
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-f]');
    if (c) { F[c.dataset.f] = c.dataset.v; draw(); return; }
    var i = e.target.closest('[data-ics]');
    if (i) { var ev = ALL.filter(function (x) { return x.id === i.dataset.ics; })[0]; if (ev) { P.icsFile(ev); P.toast('Open the downloaded file to add it to your calendar'); } return; }
    if (e.target.id === 'wshare') { e.preventDefault(); window.open('https://wa.me/?text=' + encodeURIComponent('See what is coming up at ' + (D ? D.church : 'church') + ': ' + page()), '_blank'); }
  });
  document.addEventListener('change', function (e) { if (e.target.id === 'wcamp') { F.campus = e.target.value; draw(); } });
  document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-f]')) { e.preventDefault(); e.target.click(); } });
  window.addEventListener('online', load); window.addEventListener('offline', function () { $('woff').hidden = false; });
  setInterval(function () { if (D) spot(); }, 30000);
  setInterval(function () { if (P.online()) P.call('publicEvents').then(show).catch(function () {}); }, 300000);
  load();
})();
