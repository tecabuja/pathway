/* Pathway step 7: Polls & forms. Make polls, forms and RSVPs in the app, share them by link / QR / WhatsApp, see live results,
   and remind people who have not answered. Answers come in through answer.html (anyone with the link). */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M9 11h6M9 15h4"/><path d="M9 11h.01"/></svg>';
  var QT = [['short', 'Short answer'], ['long', 'Long answer'], ['single', 'One choice'], ['multi', 'Several choices'], ['yesno', 'Yes / No'], ['number', 'Number'],
    ['date', 'Date'], ['rating', 'Rating 1 to 5'], ['phone', 'Phone number'], ['email', 'Email']];
  var FIL = 'Open', DRAFT = null, LK = null, FORMS = {}, RES = null;
  var D10 = function (d) { var x = new Date(d); if (isNaN(x.getTime())) return ''; x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  var KIND = { Poll: 'poll', Form: 'form', RSVP: 'RSVP' };

  function lk() {
    if (LK) return Promise.resolve(LK);
    var s = T.saved('lookups');
    return T.api('lookups').then(function (j) { T.cache('lookups', j); return (LK = j); }).catch(function () { return (LK = s || {}); });
  }
  function starters() {
    var depts = ((LK && LK.departments) || []).map(function (d) { return d.name; });
    var guests = { id: 'guests', type: 'number', label: 'How many people are coming with you?' };
    return [
      { icon: '📊', name: 'Quick poll', note: 'One question, tap to answer', f: { type: 'Poll', title: '', questions: [{ type: 'single', label: '', options: ['', ''], required: true }], settings: { showResults: true } } },
      { icon: '🗓️', name: 'Workers’ meeting date', note: 'Find the day that suits most workers', f: { type: 'Poll', title: 'Workers’ meeting: which date works for you?', questions: [{ type: 'multi', label: 'Tick every date you can make', options: ['Saturday 10am', 'Saturday 4pm', 'Sunday after service'], required: true }], audience: { kind: 'workers' }, settings: { showResults: true } } },
      { icon: '✅', name: 'Meeting RSVP', note: 'Coming / Not coming / Maybe, with headcount', f: { type: 'RSVP', title: 'Workers’ meeting', desc: 'Please let us know if you will attend.', questions: [guests], audience: { kind: 'workers' } } },
      { icon: '🎟️', name: 'Event with limited places', note: 'RSVP that closes itself when full', f: { type: 'RSVP', title: '', limit: 50, questions: [guests, { type: 'short', label: 'Anything we should know? (e.g. dietary needs)' }], settings: { askPhone: 'required' } } },
      { icon: '⭐', name: 'Event feedback', note: 'Anonymous rating and comments', f: { type: 'Form', title: 'How was the programme?', questions: [{ type: 'rating', label: 'Overall, how would you rate it?', required: true }, { type: 'multi', label: 'What did you enjoy most?', options: ['Worship', 'The Word', 'Fellowship', 'Organisation'] }, { type: 'long', label: 'What could we do better?' }], settings: { anon: true } } },
      { icon: '🙋', name: 'Volunteer sign-up', note: 'Which team people want to serve in', f: { type: 'Form', title: 'Join a serving team', questions: [{ type: 'multi', label: 'Where would you like to serve?', options: depts.length > 1 ? depts : ['Ushering', 'Choir / Music', 'Media', 'Hospitality'], required: true }, { type: 'single', label: 'How often can you serve?', options: ['Every Sunday', 'Twice a month', 'Once a month', 'Special events only'] }, { type: 'email', label: 'Email (optional)' }], settings: { askPhone: 'required' } } },
      { icon: '🙏', name: 'Prayer request', note: 'Seen only by the people who manage it', f: { type: 'Form', title: 'Prayer request', desc: 'Share how we can pray for you. Only the pastoral team will see this.', questions: [{ type: 'long', label: 'How can we pray for you?', required: true }, { type: 'yesno', label: 'Would you like someone to call you?' }], settings: { askName: 'optional', askPhone: 'optional', onePer: false } } },
      { icon: '🎓', name: 'Class or training sign-up', note: 'Name, phone and choice of class', f: { type: 'Form', title: 'Class sign-up', questions: [{ type: 'single', label: 'Which class?', options: ['Membership Class', 'TECI', 'Leadership Development'], required: true }, { type: 'single', label: 'Preferred time', options: ['Saturday morning', 'Sunday after service', 'Midweek evening'] }], settings: { askPhone: 'required' } } },
      { icon: '📝', name: 'Blank form', note: 'Start from nothing', f: { type: 'Form', title: '', questions: [{ type: 'short', label: '' }] } }
    ];
  }
  function stTag(s) { return '<span class="tag ' + ({ Open: 'green', Full: 'amber', Closed: 'grey' }[s] || 'grey') + '">' + esc(s) + '</span>'; }
  function card(f) {
    var n = f.type === 'RSVP' ? f.seats + ' coming' : f.responses + ' answer' + (f.responses === 1 ? '' : 's');
    return '<div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span class="tag gold">' + esc(f.type) + '</span>' + stTag(f.status) +
      '<span class="sp" style="flex:1"></span><span class="small muted">' + esc(f.owner) + '</span></div>' +
      '<b style="font-size:16px;display:block;margin-bottom:4px;overflow-wrap:anywhere">' + esc(f.title) + '</b><div class="small muted">' + n + (f.limit ? ' of ' + f.limit + (f.type === 'RSVP' ? ' places' : '') : '') +
      (f.closes ? ' · closes ' + T.fmt(f.closes) : '') + (f.campus ? ' · ' + esc(f.campus) : '') + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn sm" data-fres="' + esc(f.id) + '">Results</button><button class="btn ghost sm" data-fshare="' + esc(f.id) + '">Share</button><button class="btn ghost sm" data-fedit="' + esc(f.id) + '">Edit</button></div></div>';
  }

  // ---------- list ----------
  P.views.forms = { title: 'Polls & forms', icon: ICON, render: function (v) {
    T.loading(v); var gone = T.guard();
    Promise.all([T.api('formList'), lk()]).then(function (r) {
      if (gone()) return;
      FORMS = {}; r[0].forms.forEach(function (f) { FORMS[f.id] = f; });
      var all = r[0].forms, list = all.filter(function (f) { return FIL === 'All' || (FIL === 'Open' ? f.status === 'Open' : f.status !== 'Open'); });
      v.innerHTML = '<div class="tools"><div class="seg">' + ['Open', 'Closed', 'All'].map(function (k) { return '<button class="' + (k === FIL ? 'on' : '') + '" data-ffil="' + k + '">' + k + '</button>'; }).join('') +
        '</div><span class="sp" style="flex:1"></span><button class="btn" data-fnew="1">+ New poll or form</button></div>' +
        (list.length ? '<div class="grid g2">' + list.map(card).join('') + '</div>' : '<div class="card" style="text-align:center;padding:30px"><div style="font-size:36px">🗳️</div><b>No ' + (FIL === 'All' ? '' : FIL.toLowerCase() + ' ') + 'polls or forms yet</b>' +
          '<p class="muted small">Ask workers which meeting date suits them, collect RSVPs, run event feedback or a volunteer sign-up. Anyone with the link can answer, even without signing in.</p><button class="btn" data-fnew="1">+ New poll or form</button></div>');
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };

  function pick() {
    lk().then(function () {
      T.openDrawer(T.dhead('New poll or form', 'Pick a starting point. You can change everything after.') + '<div class="db"><div class="grid g2">' + starters().map(function (s, i) {
        return '<div class="card click" data-fstart="' + i + '" role="button" tabindex="0" style="display:flex;gap:12px;align-items:center"><div style="font-size:28px">' + s.icon + '</div><div><b>' + esc(s.name) + '</b><div class="small muted">' + esc(s.note) + '</div></div></div>';
      }).join('') + '</div></div>');
    });
  }

  // ---------- builder ----------
  function openBuilder(f) {
    DRAFT = JSON.parse(JSON.stringify(f || {}));
    DRAFT.type = DRAFT.type || 'Form'; DRAFT.settings = DRAFT.settings || {}; DRAFT.audience = DRAFT.audience || { kind: 'none' };
    DRAFT.questions = (DRAFT.questions || []).filter(function (q) { return q.id !== 'rsvp'; });
    drawBuilder(true);
  }
  function chk(id, label, on, dis) { return '<label class="small full" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '> <span>' + esc(label) + '</span></label>'; }
  function qCard(q, i, n) {
    var choice = q.type === 'single' || q.type === 'multi';
    return '<div class="card" style="margin-bottom:10px"><div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><b class="small muted">Question ' + (i + 1) + (q.id === 'guests' ? ' · headcount' : '') + '</b><span class="sp" style="flex:1"></span>' +
      (i ? '<button class="btn ghost sm" data-qmove="' + i + '" data-dir="-1" aria-label="Move up">↑</button>' : '') + (i < n - 1 ? '<button class="btn ghost sm" data-qmove="' + i + '" data-dir="1" aria-label="Move down">↓</button>' : '') +
      '<button class="btn ghost sm" data-qdel="' + i + '" style="color:var(--red)" aria-label="Remove question">✕</button></div><div class="form">' +
      '<div class="f full"><input class="inp" data-ql="' + i + '" value="' + esc(q.label || '') + '" placeholder="Type the question" aria-label="Question ' + (i + 1) + '"></div>' +
      '<div class="f"><select class="inp" data-qt="' + i + '" aria-label="Kind of answer">' + T.opts(QT.map(function (x) { return { v: x[0], l: x[1] }; }), q.type || 'short') + '</select></div>' +
      '<label class="small f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-qr="' + i + '"' + (q.required ? ' checked' : '') + '> Must be answered</label>' +
      (choice ? '<div class="f full"><label>Choices (one per line)</label><textarea class="inp" rows="' + Math.max(3, (q.options || []).length + 1) + '" data-qo="' + i + '" placeholder="Choice 1&#10;Choice 2">' + esc((q.options || []).join('\n')) + '</textarea></div>' : '') +
      '</div></div>';
  }
  function drawBuilder(first) {
    var d = DRAFT, s = d.settings, a = d.audience, u = T.user(), camps = (LK && LK.campuses) || [];
    var groups = ((LK && LK.groups) || []).map(function (g) { return g.name; }), depts = ((LK && LK.departments) || []).map(function (x) { return x.name; });
    var what = KIND[d.type] || 'form';
    var h = T.dhead(d.id ? 'Edit ' + what : 'New ' + what, d.id ? esc(d.title) : 'Questions, who answers, and when it closes') + '<div class="db">' +
      '<div class="card"><div class="form"><div class="f full"><label>Type</label><div class="seg">' + [['Poll', 'Poll'], ['Form', 'Form'], ['RSVP', 'RSVP / attendance']].map(function (t) {
        return '<button type="button" data-btype="' + t[0] + '" class="' + (d.type === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="f full"><label for="btitle">Title *</label><input class="inp" id="btitle" value="' + esc(d.title || '') + '" placeholder="e.g. Workers’ meeting: which date works?"></div>' +
      '<div class="f full"><label for="bdesc">Short note (optional)</label><textarea class="inp" id="bdesc" rows="2">' + esc(d.desc || '') + '</textarea></div></div></div>' +
      (d.type === 'RSVP' ? '<div class="banner" style="margin:12px 0">The first question, “Will you be there? Coming / Not coming / Maybe”, is added for you.</div>' : '') +
      '<div class="sec">Questions</div>' + d.questions.map(function (q, i) { return qCard(q, i, d.questions.length); }).join('') +
      '<button class="btn ghost" data-qadd="1" style="margin:2px 0 16px">+ Add question</button>' +
      '<div class="sec">Who should answer</div><div class="card"><div class="form">' +
      '<div class="f"><label for="bak">Send to</label><select class="inp" id="bak">' + T.opts([{ v: 'none', l: 'Anyone with the link' }, { v: 'workers', l: 'Workers (people who sign in)' }, { v: 'members', l: 'Members' }, { v: 'everyone', l: 'Workers and members' }], a.kind || 'none') + '</select></div>' +
      (u.role === 'Admin' && camps.length ? '<div class="f"><label for="bac">' + esc(P.cw()) + '</label><select class="inp" id="bac">' + T.opts(camps, a.campus, 'All ' + P.cw(1, 1)) + '</select></div>' : '') +
      (groups.length ? '<div class="f"><label for="bag">Small group</label><select class="inp" id="bag">' + T.opts(groups, a.group, 'Any') + '</select></div>' : '') +
      (depts.length ? '<div class="f"><label for="bad">Department</label><select class="inp" id="bad">' + T.opts(depts, a.dept || a.unit, 'Any') + '</select></div>' : '') +
      '<div class="small muted full">Anyone can answer with the link. Choosing a group of people also puts it in their My space, shows you who has not answered yet, and lets you remind them.</div></div></div>' +
      '<div class="sec">Settings</div><div class="card"><div class="form">' +
      '<div class="f"><label for="bname">Ask for name</label><select class="inp" id="bname"' + (s.anon ? ' disabled' : '') + '>' + T.opts([{ v: 'required', l: 'Required' }, { v: 'optional', l: 'Optional' }, { v: 'no', l: 'Don’t ask' }], s.askName || 'required') + '</select></div>' +
      '<div class="f"><label for="bphone">Ask for phone</label><select class="inp" id="bphone"' + (s.anon ? ' disabled' : '') + '>' + T.opts([{ v: 'required', l: 'Required' }, { v: 'optional', l: 'Optional' }, { v: 'no', l: 'Don’t ask' }], s.askPhone || 'optional') + '</select></div>' +
      '<div class="f"><label for="bclose">Closes on (optional)</label><input class="inp" type="date" id="bclose" value="' + (d.closes ? D10(d.closes) : '') + '"></div>' +
      '<div class="f"><label for="blimit">' + (d.type === 'RSVP' ? 'Places available' : 'Stop after this many answers') + ' (optional)</label><input class="inp" type="number" min="0" inputmode="numeric" id="blimit" value="' + (d.limit || '') + '"></div>' +
      '<div class="f full"><label for="bthanks">Thank-you message (optional)</label><input class="inp" id="bthanks" value="' + esc(s.thanks || '') + '" placeholder="e.g. Thank you! See you on Saturday."></div>' +
      chk('banon', 'Anonymous: no names or phone numbers are kept', s.anon) + chk('bres', 'Show results to people after they answer', s.showResults) +
      chk('bone', 'One answer per person (a new answer replaces their earlier one)', s.onePer !== false, s.anon) + chk('brem', 'Remind people who have not answered, the day before it closes', s.remind !== false) +
      (d.id ? '<div class="f"><label for="bstat">Status</label><select class="inp" id="bstat">' + T.opts(['Open', 'Closed'], d.status === 'Closed' ? 'Closed' : 'Open') + '</select></div>' : '') +
      '</div></div>' + (d.id && d.responses ? '<div class="small muted" style="margin-top:10px">' + d.responses + ' people have already answered. Changing the questions may make their answers harder to read.</div>' : '') +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin:16px 0;flex-wrap:wrap"><button class="btn ghost" data-close="1">Cancel</button><button class="btn" id="bsave">' + (d.id ? 'Save changes' : 'Create and share') + '</button></div></div>';
    var dr = $('drawer'), top = dr.scrollTop;
    if (first) T.openDrawer(h); else { dr.innerHTML = h; dr.scrollTop = top; }
    if (first) setTimeout(function () { var t = $('btitle'); if (t && !t.value) t.focus(); }, 60);
  }
  function sync() {
    var d = DRAFT, dr = $('drawer'); if (!d || !dr || !$('btitle')) return;
    var val = function (id) { var e = $(id); return e ? e.value : ''; }, on = function (id) { var e = $(id); return !!(e && e.checked); };
    d.title = val('btitle'); d.desc = val('bdesc');
    d.questions.forEach(function (q, i) {
      var l = dr.querySelector('[data-ql="' + i + '"]'), t = dr.querySelector('[data-qt="' + i + '"]'), r = dr.querySelector('[data-qr="' + i + '"]'), o = dr.querySelector('[data-qo="' + i + '"]');
      if (l) q.label = l.value; if (t) q.type = t.value; if (r) q.required = r.checked;
      if (o) q.options = o.value.split('\n').map(function (x) { return x.trim(); }).filter(String);
    });
    d.audience = { kind: val('bak') || 'none', campus: val('bac'), group: val('bag'), dept: val('bad') };
    if (d.audience.kind === 'workers') d.audience.unit = d.audience.dept || d.audience.group;
    d.settings = { askName: val('bname'), askPhone: val('bphone'), thanks: val('bthanks'), anon: on('banon'), showResults: on('bres'), onePer: on('bone') || on('banon'), remind: on('brem') };
    d.closes = val('bclose'); d.limit = val('blimit');
    if ($('bstat')) d.status = val('bstat');
  }
  function save(btn) {
    sync(); var d = DRAFT;
    if (!String(d.title).trim()) { P.toast('Give it a title'); $('btitle').focus(); return; }
    var qs = d.questions.filter(function (q) { return String(q.label || '').trim(); });
    if (!qs.length && d.type !== 'RSVP') { P.toast('Add at least one question'); return; }
    for (var i = 0; i < qs.length; i++) if ((qs[i].type === 'single' || qs[i].type === 'multi') && (qs[i].options || []).length < 2) { P.toast('“' + qs[i].label + '” needs at least 2 choices'); return; }
    T.busy(btn, true);
    var isNew = !d.id, body = Object.assign({}, d, { questions: qs, base: P.appBase() });
    T.api('formSave', { form: body }).then(function (j) {
      DRAFT = null; T.S._dirty = true; P.toast(isNew ? 'Created ✓ Now share it' : 'Saved ✓');
      return T.api('formList').then(function (l) { FORMS = {}; l.forms.forEach(function (f) { FORMS[f.id] = f; }); if (isNew) openShare(j.id); else P.closeDrawer(); });
    }).catch(function (e) { T.busy(btn, false); P.toast(e.message); });
  }

  // ---------- share ----------
  function linkOf(f) { return f.link && /^https?:/.test(f.link) ? f.link : P.appBase() + 'answer.html?f=' + encodeURIComponent(f.id); }
  function shareText(f) {
    return (f.type === 'RSVP' ? 'Please let us know if you are coming: ' : f.type === 'Poll' ? 'Quick poll, please vote: ' : 'Please fill this in: ') + '*' + f.title + '*' +
      (f.closes ? ' (closes ' + T.fmt(f.closes) + ')' : '') + '\n' + linkOf(f);
  }
  function qrSvg(t) { var q = qrcode(0, 'M'); q.addData(t); q.make(); return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }
  function openShare(id) {
    var f = FORMS[id]; if (!f) return;
    var link = linkOf(f), aud = f.audience && f.audience.kind && f.audience.kind !== 'none';
    T.openDrawer(T.dhead('Share', esc(f.title)) + '<div class="db"><div class="card" style="text-align:center"><b style="font-size:17px;display:block">' + esc(f.title) + '</b>' +
      '<div class="qrbox" style="margin:12px auto;max-width:230px">' + qrSvg(link) + '</div><p class="small muted" style="word-break:break-all;margin:0 0 12px">' + esc(link) + '</p>' +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><a class="btn wa" href="https://wa.me/?text=' + encodeURIComponent(shareText(f)) + '" target="_blank" rel="noopener">Share on WhatsApp</a>' +
      '<button class="btn ghost" data-fcopy="' + esc(f.id) + '">Copy link</button><a class="btn ghost" href="' + esc(link) + '" target="_blank" rel="noopener">Open</a><button class="btn ghost" data-fposter="' + esc(f.id) + '">Print QR poster</button></div>' +
      '<p class="small muted" style="margin:12px 0 0">Post the WhatsApp text in your workers’ or members’ group, or show the QR code on screen. Anyone can answer, even without signing in.</p></div>' +
      (aud ? '<div class="card" style="margin-top:12px"><h3>Remind people who have not answered</h3><p class="small muted" style="margin-top:-4px">It already shows in their My space. You can also nudge them now.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-fremind="' + esc(f.id) + '">Remind in Pathway and by email</button><button class="btn sm wa" data-fwa="' + esc(f.id) + '">WhatsApp each person</button></div></div>' : '') +
      '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-fres="' + esc(f.id) + '">See results</button></div></div>');
  }
  function poster(f) {
    var w = window.open('', '_blank'); if (!w) { P.toast('Allow pop-ups to print the poster'); return; }
    w.document.write('<!doctype html><title>' + esc(f.title) + '</title><link rel="stylesheet" href="' + P.appBase() + 'app.css"><body style="background:#fff;text-align:center;padding:40px;font-family:\'Plus Jakarta Sans\',sans-serif">' +
      '<img src="' + P.appBase() + 'img/logo-full.png" alt="" style="width:200px"><h1 style="color:#1F5A54;margin:18px 0 6px">' + esc(f.title) + '</h1>' + (f.desc ? '<p style="font-size:18px">' + esc(f.desc) + '</p>' : '') +
      '<div style="width:320px;margin:20px auto">' + qrSvg(linkOf(f)) + '</div><p style="font-size:20px;font-weight:700">Scan with your phone camera to ' + (f.type === 'RSVP' ? 'let us know you are coming' : f.type === 'Poll' ? 'vote' : 'answer') + '</p>' +
      (f.closes ? '<p>Closes ' + T.fmt(f.closes) + '</p>' : '') + '<p style="color:#666;word-break:break-all">' + esc(linkOf(f)) + '</p></body>');
    w.document.close(); setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 700);
  }
  function waNonResponders(id, btn) {
    T.busy(btn, true);
    T.api('formGet', { id: id }).then(function (j) {
      var f = j.form, who = f.waiting.filter(function (p) { return p.phone; });
      if (!who.length) { T.busy(btn, false); P.toast(f.waiting.length ? 'Nobody waiting has a phone number' : 'Everyone has answered 🎉'); return; }
      var text = 'Hi {first}, please take a minute to ' + (f.type === 'RSVP' ? 'tell us if you are coming to' : 'answer') + ' "' + f.title + '"' + (f.closes ? ' before ' + T.fmt(f.closes) : '') + ': ' + linkOf(f) + '\nThank you! 🙏';
      return T.api('msgSave', { msg: { title: 'Reminder: ' + f.title, channel: 'WhatsApp', text: text, kind: 'Form reminder', recipients: who } }).then(function (m) {
        P.toast(who.length + ' reminder(s) ready'); if (P.openMsgList) P.openMsgList(m.id); else P.app.go('messages');
      });
    }).catch(function (e) { T.busy(btn, false); P.toast(e.message); });
  }

  // ---------- results ----------
  function openResults(id) {
    T.openDrawer(T.dhead('Results', 'Loading…') + '<div class="db"><div class="card muted">Loading…</div></div>');
    T.api('formGet', { id: id }).then(function (j) { RES = j.form; FORMS[RES.id] = Object.assign(FORMS[RES.id] || {}, RES); drawResults(); })
      .catch(function (e) { $('drawer').querySelector('.db').innerHTML = '<div class="card">' + esc(e.message) + '</div>'; });
  }
  function hb(label, n, max, total, lead) {
    return '<div class="hb w"><span title="' + esc(label) + '">' + (lead ? '🏆 ' : '') + esc(label) + '</span><div class="bar"><i style="width:' + (max ? Math.round(n / max * 100) : 0) + '%"></i></div><b>' + n + (total ? ' · ' + Math.round(n / total * 100) + '%' : '') + '</b></div>';
  }
  function has(v) { return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length); }
  function summary(q, A, poll) {
    var vals = A.map(function (a) { return a.answers[q.id]; }).filter(has), n = vals.length;
    var h = '<div class="card" style="margin-bottom:12px"><h3 style="font-size:15px">' + esc(q.label) + '<span class="sp"></span><span class="small muted" style="font-weight:500">' + n + ' answer' + (n === 1 ? '' : 's') + '</span></h3>';
    if (['single', 'multi', 'yesno', 'rating'].indexOf(q.type) >= 0) {
      var opts = q.type === 'yesno' ? ['Yes', 'No'] : q.type === 'rating' ? ['5', '4', '3', '2', '1'] : (q.options || []).slice(), c = {};
      vals.forEach(function (v) { [].concat(v).forEach(function (x) { x = String(x); c[x] = (c[x] || 0) + 1; if (opts.indexOf(x) < 0) opts.push(x); }); });
      var max = Math.max.apply(null, opts.map(function (o) { return c[o] || 0; }).concat([1]));
      if (q.type === 'rating') h += '<div style="font-size:30px;font-weight:800;color:var(--teal-d);margin-bottom:6px">' + (n ? (vals.reduce(function (t, v) { return t + Number(v); }, 0) / n).toFixed(1) : '—') + ' <span class="small muted" style="font-weight:500">out of 5</span></div>';
      h += opts.map(function (o) { return hb(q.type === 'rating' ? new Array(+o + 1).join('★') : o, c[o] || 0, max, n, (poll || q.type === 'multi' || q.id === 'rsvp') && q.type !== 'rating' && n && c[o] === max && q.id !== 'rsvp'); }).join('');
    } else if (q.type === 'number') {
      var nums = vals.map(Number).filter(function (x) { return !isNaN(x); }), tot = nums.reduce(function (t, x) { return t + x; }, 0);
      h += '<div class="grid g3"><div><div class="small muted">Total</div><b style="font-size:20px">' + tot + '</b></div><div><div class="small muted">Average</div><b style="font-size:20px">' + (nums.length ? Math.round(tot / nums.length * 10) / 10 : '—') + '</b></div><div><div class="small muted">Highest</div><b style="font-size:20px">' + (nums.length ? Math.max.apply(null, nums) : '—') + '</b></div></div>';
    } else {
      var cnt = {}; vals.forEach(function (v) { var k = String(v).trim().toLowerCase(); cnt[k] = (cnt[k] || 0) + 1; });
      var rep = Object.keys(cnt).filter(function (k) { return cnt[k] > 1; }).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 6);
      if (rep.length) h += '<div class="chips" style="margin-bottom:8px">' + rep.map(function (k) { return '<span class="chip">' + esc(k) + ' × ' + cnt[k] + '</span>'; }).join('') + '</div>';
      h += '<div class="log">' + (vals.slice(-40).reverse().map(function (v) { return '<div class="e">' + esc(q.type === 'date' ? T.fmt(v) : v) + '</div>'; }).join('') || '<div class="small muted">No answers yet</div>') + '</div>';
    }
    return h + '</div>';
  }
  function drawResults() {
    var f = RES, A = f.answers, qs = f.questions, anon = f.settings && f.settings.anon, k = '';
    if (f.type === 'RSVP') {
      var by = { Coming: 0, 'Not coming': 0, Maybe: 0 }, ppl = 0;
      A.forEach(function (a) { var r = a.answers.rsvp; if (r in by) by[r]++; if (r === 'Coming') ppl += 1 + (Number(a.answers.guests) || 0); });
      k = '<div class="card kpi"><div class="l">Coming (people)</div><div class="n">' + ppl + '</div><div class="d">' + by.Coming + ' replies' + (f.limit ? ' · ' + Math.max(0, f.limit - ppl) + ' places left' : '') + '</div></div>' +
        '<div class="card kpi"><div class="l">Maybe</div><div class="n">' + by.Maybe + '</div></div><div class="card kpi"><div class="l">Not coming</div><div class="n">' + by['Not coming'] + '</div></div>';
    } else k = '<div class="card kpi"><div class="l">Answers</div><div class="n">' + A.length + '</div><div class="d">' + (f.limit ? 'of ' + f.limit : '&nbsp;') + '</div></div>';
    if (f.audience && f.audience.kind !== 'none' && !anon) k += '<div class="card kpi"><div class="l">Not answered yet</div><div class="n">' + f.waiting.length + '</div><div class="d">' + (f.reminded ? 'reminded ' + T.fmt(f.reminded) : '&nbsp;') + '</div></div>';
    var head = ['Time'].concat(anon ? [] : ['Name', 'Phone']).concat(qs.map(function (q) { return q.label; }));
    var cell = function (q, v) { return !has(v) ? '' : Array.isArray(v) ? v.join(', ') : q.type === 'date' ? T.fmt(v) : String(v); };
    var h = T.dhead(f.title, esc(f.type) + ' · ' + esc(f.status) + (f.closes ? ' · closes ' + T.fmt(f.closes) : '') + ' · by ' + esc(f.owner)) + '<div class="db" id="fresults">' +
      '<div class="tools noprint" style="margin-bottom:12px"><button class="btn sm" data-fshare="' + esc(f.id) + '">Share</button><button class="btn ghost sm" data-fedit="' + esc(f.id) + '">Edit</button>' +
      '<button class="btn ghost sm" data-fcsv="1">Download (Excel)</button><button class="btn ghost sm" data-fprint="1">Print summary</button><button class="btn ghost sm" data-fdup="' + esc(f.id) + '">Duplicate</button>' +
      '<span class="sp" style="flex:1"></span><button class="btn ghost sm" data-fdel="' + esc(f.id) + '" style="color:var(--red)">Delete</button></div>' +
      '<div class="grid g3" style="margin-bottom:14px">' + k + '</div>' +
      qs.map(function (q) { return summary(q, A, f.type === 'Poll'); }).join('') +
      (f.waiting && f.waiting.length ? '<div class="card" style="margin-bottom:12px"><h3>Not answered yet (' + f.waiting.length + ')<span class="sp"></span><button class="btn sm noprint" data-fremind="' + esc(f.id) + '">Remind</button><button class="btn sm wa noprint" data-fwa="' + esc(f.id) + '">WhatsApp them</button></h3>' +
        f.waiting.slice(0, 200).map(function (p) { return '<div class="row"><div class="meta"><b>' + esc(p.name) + '</b><span>' + esc([p.campus, p.group || p.dept].filter(String).join(' · ')) + '</span></div>' +
          (p.phone ? '<a class="btn ghost sm wa noprint" data-stop="1" target="_blank" rel="noopener" href="' + P.waLink(p.phone, P.fill('Hi {first}, please take a minute to answer "' + f.title + '": ' + linkOf(f), p)) + '">WhatsApp</a>' : '') + '</div>'; }).join('') + '</div>' : '') +
      '<div class="card tablecard"><h3 style="padding:14px 14px 0">All answers</h3><div style="overflow-x:auto"><table><thead><tr>' + head.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (A.slice().reverse().map(function (a) { return '<tr><td>' + T.fmt(a.time) + '</td>' + (anon ? '' : '<td>' + esc(a.name || a.user || '—') + '</td><td>' + esc(a.phone || '') + '</td>') +
        qs.map(function (q) { return '<td>' + esc(cell(q, a.answers[q.id])) + '</td>'; }).join('') + '</tr>'; }).join('') || '<tr><td colspan="' + head.length + '" class="empty">No answers yet. Share the link to get started.</td></tr>') +
      '</tbody></table></div></div></div>';
    T.openDrawer(h);
    RES._csv = [head].concat(A.map(function (a) { return [new Date(a.time).toLocaleString('en-GB')].concat(anon ? [] : [a.name || a.user, a.phone]).concat(qs.map(function (q) { return cell(q, a.answers[q.id]); })); }));
  }
  function printSummary() {
    var el = $('fresults'), w = window.open('', '_blank'); if (!w || !el) { P.toast('Allow pop-ups to print'); return; }
    w.document.write('<!doctype html><title>' + esc(RES.title) + '</title><link rel="stylesheet" href="' + P.appBase() + 'app.css"><style>body{background:#fff;padding:20px}.noprint{display:none!important}.card{break-inside:avoid;box-shadow:none;border:1px solid #ddd}</style><body>' +
      '<h2 style="margin:0 0 4px">' + esc(RES.title) + '</h2><p class="small muted">' + esc((P.config().church || '')) + ' · printed ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '</p>' + el.innerHTML + '</body>');
    w.document.close(); setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 700);
  }

  // ---------- taps ----------
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-ffil]'))) { FIL = x.dataset.ffil; P.app.render(); return; }
    if (t.closest('[data-fnew]')) { pick(); return; }
    if ((x = t.closest('[data-fstart]'))) { openBuilder(starters()[+x.dataset.fstart].f); return; }
    if ((x = t.closest('[data-fres]'))) { openResults(x.dataset.fres); return; }
    if ((x = t.closest('[data-fshare]'))) { openShare(x.dataset.fshare); return; }
    if ((x = t.closest('[data-fedit]'))) { var fe = FORMS[x.dataset.fedit]; if (fe) lk().then(function () { openBuilder(fe); }); return; }
    if ((x = t.closest('[data-fdup]'))) { var fd = FORMS[x.dataset.fdup]; if (fd) { var c = JSON.parse(JSON.stringify(fd)); delete c.id; delete c.status; delete c.responses; c.title = c.title + ' (copy)'; c.closes = ''; openBuilder(c); } return; }
    if ((x = t.closest('[data-fcopy]'))) { var l = linkOf(FORMS[x.dataset.fcopy]); (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(function () { P.toast('Link copied ✓'); }, function () { window.prompt('Copy this link', l); }); return; }
    if ((x = t.closest('[data-fposter]'))) { poster(FORMS[x.dataset.fposter]); return; }
    if (t.closest('[data-fcsv]') && RES) { T.csv(RES.title, RES._csv); return; }
    if (t.closest('[data-fprint]') && RES) { printSummary(); return; }
    if ((x = t.closest('[data-fwa]'))) { waNonResponders(x.dataset.fwa, x); return; }
    if ((x = t.closest('[data-fremind]'))) {
      T.busy(x, true);
      T.api('formRemind', { id: x.dataset.fremind }).then(function (j) { P.toast(j.waiting ? 'Reminded: ' + j.inapp + ' in Pathway, ' + j.emails + ' by email' + (j.waiting - j.inapp - j.emails > 0 ? '. Use WhatsApp for the other ' + (j.waiting - j.inapp - j.emails) : '') : 'Everyone has answered 🎉'); T.busy(x, false); })
        .catch(function (e2) { T.busy(x, false); P.toast(e2.message); });
      return;
    }
    if ((x = t.closest('[data-fdel]'))) {
      var fx = FORMS[x.dataset.fdel] || RES;
      if (!window.confirm('Delete "' + fx.title + '" and all its answers? This cannot be undone. Tip: download the answers first.')) return;
      T.api('formRemove', { id: x.dataset.fdel }).then(function () { P.toast('Deleted'); T.S._dirty = true; P.closeDrawer(); }).catch(function (e2) { P.toast(e2.message); });
      return;
    }
    if (!DRAFT || !t.closest('#drawer')) return;
    if ((x = t.closest('[data-btype]'))) { sync(); DRAFT.type = x.dataset.btype; if (DRAFT.type === 'RSVP' && !DRAFT.questions.some(function (q) { return q.id === 'guests'; })) DRAFT.questions.unshift({ id: 'guests', type: 'number', label: 'How many people are coming with you?' }); drawBuilder(); return; }
    if (t.closest('[data-qadd]')) { sync(); DRAFT.questions.push({ type: 'short', label: '' }); drawBuilder(); var ls = $('drawer').querySelectorAll('[data-ql]'); if (ls.length) ls[ls.length - 1].focus(); return; }
    if ((x = t.closest('[data-qdel]'))) { sync(); DRAFT.questions.splice(+x.dataset.qdel, 1); drawBuilder(); return; }
    if ((x = t.closest('[data-qmove]'))) { sync(); var i = +x.dataset.qmove, j = i + (+x.dataset.dir), qq = DRAFT.questions; if (j >= 0 && j < qq.length) { var tmp = qq[i]; qq[i] = qq[j]; qq[j] = tmp; } drawBuilder(); return; }
    if (t.id === 'bsave') { save(t); return; }
  });
  document.addEventListener('change', function (e) {
    if (!DRAFT || !e.target.closest('#drawer')) return;
    if (e.target.matches('[data-qt]') || e.target.id === 'banon') { sync(); var q = DRAFT.questions[+e.target.dataset.qt]; if (q && (q.type === 'single' || q.type === 'multi') && !(q.options || []).length) q.options = ['', '']; drawBuilder(); }
  });
  document.addEventListener('keydown', function (e) { var x = e.target.closest && e.target.closest('[data-fstart]'); if (x && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); x.click(); } });
  P.openFormResults = openResults;
})();
