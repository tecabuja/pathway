/* Pathway step 7: Messages. One message to many people, each with their own name filled in.
   WhatsApp and SMS open on the sender's phone with the message ready (one tap per person, free). Emails go out automatically.
   Automatic messages: birthdays, a date (events), every week, and a welcome for new converts. */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>';
  var TAB = 'lists', LK = null, DATA = null, M = null, LIST = null, AUTO = null;
  var TOKENS = [['{first}', 'First name'], ['{name}', 'Full name'], ['{church}', 'Church name'], ['{campus}', null], ['{group}', 'Small group'], ['{department}', 'Department']];
  var CHT = { WhatsApp: 'green', SMS: 'gold', Email: '' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var D10 = function (d) { var x = new Date(d); if (isNaN(x.getTime())) return ''; x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };

  function lk() {
    if (LK) return Promise.resolve(LK);
    var s = T.saved('lookups');
    return T.api('lookups').then(function (j) { T.cache('lookups', j); return (LK = j); }).catch(function () { return (LK = s || {}); });
  }
  function names(k) { return ((LK && LK[k]) || []).map(function (x) { return x.name || x; }); }
  function tag(ch) { return '<span class="tag ' + (CHT[ch] || '') + '">' + esc(ch) + '</span>'; }
  function bar(sent, total) { return '<div class="bar" style="height:8px;margin:8px 0 4px"><i style="width:' + (total ? Math.round(sent / total * 100) : 0) + '%"></i></div>'; }
  function trigText(a) {
    return a.trigger === 'Birthday' ? 'On each person’s birthday' : a.trigger === 'On a date' ? 'On ' + T.fmt(a.date) : a.trigger === 'Every week' ? 'Every ' + a.day : 'The morning after a new convert is captured';
  }
  function chText(c) { return { 'Email': 'Email (automatic)', 'WhatsApp': 'WhatsApp (ready to send)', 'Email and WhatsApp': 'Email and WhatsApp', 'Email, else WhatsApp': 'Email, or WhatsApp if no email' }[c] || c; }

  // ---------- main screen ----------
  P.views.messages = { title: 'Messages', icon: ICON, render: function (v) {
    T.loading(v); var gone = T.guard();
    Promise.all([T.api('msgList'), lk()]).then(function (r) {
      if (gone()) return;
      DATA = r[0];
      var tabs = [['lists', 'Send lists'], ['auto', 'Automatic'], ['bdays', 'Birthdays' + (DATA.birthdays.length ? ' (' + DATA.birthdays.length + ')' : '')]];
      var h = '<div class="tools"><div class="seg">' + tabs.map(function (t) { return '<button class="' + (TAB === t[0] ? 'on' : '') + '" data-mtab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
        '</div><span class="sp" style="flex:1"></span>' + (TAB === 'auto' ? '<button class="btn" data-anew="1">+ Automatic message</button>' : '<button class="btn" data-mnew="1">+ New message</button>') + '</div>';
      if (TAB === 'lists') {
        var ready = DATA.lists.filter(function (l) { return l.status !== 'Done'; });
        h += (ready.length && DATA.lists.some(function (l) { return l.kind === 'Automatic' && l.status !== 'Done'; }) ? '<div class="banner">Automatic WhatsApp messages are waiting for you to send. Open them below.</div>' : '') +
          (DATA.lists.length ? '<div class="grid g2">' + DATA.lists.map(function (l) {
            return '<div class="card click" data-mopen="' + esc(l.id) + '"><div style="display:flex;gap:8px;align-items:center">' + tag(l.channel) + (l.kind !== 'Manual' ? '<span class="tag grey">' + esc(l.kind) + '</span>' : '') +
              '<span class="sp" style="flex:1"></span><span class="tag ' + (l.status === 'Done' ? 'green' : l.sent ? 'amber' : 'gold') + '">' + esc(l.status) + '</span></div>' +
              '<b style="display:block;margin-top:8px;overflow-wrap:anywhere">' + esc(l.title) + '</b>' + bar(l.sent, l.total) +
              '<div class="small muted">' + l.sent + ' of ' + l.total + ' sent · ' + T.fmt(l.created) + ' · ' + esc(l.by) + '</div></div>';
          }).join('') + '</div>' : '<div class="card" style="text-align:center;padding:30px"><div style="font-size:36px">💬</div><b>Send one message to many people, each with their own name</b>' +
            '<p class="muted small">Choose people from Pathway, or upload or paste a list from Excel. Pathway fills in each person’s name, then opens WhatsApp or SMS on your phone with the message ready, one tap per person. Emails go out automatically.</p><button class="btn" data-mnew="1">+ New message</button></div>');
      } else if (TAB === 'auto') {
        h += '<div class="banner" style="margin-bottom:12px">Automatic messages run every morning with the daily reminders (Admin & settings > Overview). Emails go by themselves; WhatsApp messages are prepared as a list for you to send with one tap each.</div>' +
          (DATA.autos.length ? '<div class="grid g2">' + DATA.autos.map(function (a) {
            return '<div class="card"><div style="display:flex;gap:8px;align-items:center"><span class="tag ' + (a.active ? 'green' : 'grey') + '">' + (a.active ? 'On' : 'Off') + '</span><span class="tag gold">' + esc(chText(a.channel)) + '</span></div>' +
              '<b style="display:block;margin-top:8px">' + esc(a.name) + '</b><div class="small muted">' + esc(trigText(a)) + (a.last ? ' · last ran ' + T.fmt(a.last) : '') + '</div>' +
              '<div class="small" style="margin-top:8px;white-space:pre-wrap;max-height:60px;overflow:hidden">' + esc(a.text) + '</div>' +
              '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn sm" data-aedit="' + esc(a.id) + '">Edit</button><button class="btn ghost sm" data-aprev="' + esc(a.id) + '">Who gets it</button></div></div>';
          }).join('') + '</div>' : '<div class="card" style="text-align:center;padding:30px"><div style="font-size:36px">⏰</div><b>Set it once, Pathway remembers</b><p class="muted small">Birthday wishes, a reminder the day of an event, a weekly reminder for workers, or a welcome for every new convert.</p><button class="btn" data-anew="1">+ Automatic message</button></div>');
      } else {
        h += '<div class="card"><h3>Birthdays in the next 2 weeks</h3>' + (DATA.birthdays.length ? DATA.birthdays.map(function (b) {
          var wish = P.fill('Happy birthday {first}! 🎂🎉 We thank God for your life. Have a wonderful year ahead. From all of us at {church}.', b);
          return '<div class="row"><div class="meta"><b>' + esc(b.name) + (b.inDays === 0 ? ' <span class="tag gold">Today</span>' : '') + '</b><span>' + (b.inDays === 0 ? 'Today' : b.inDays === 1 ? 'Tomorrow' : new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })) + (b.group ? ' · ' + esc(b.group) : '') + '</span></div>' +
            (b.phone ? '<a class="btn ghost sm" href="' + P.telLink(b.phone) + '">Call</a><a class="btn sm wa" target="_blank" rel="noopener" href="' + P.waLink(b.phone, wish) + '">Wish</a>' : '<span class="small muted">No phone</span>') + '</div>';
        }).join('') : '<div class="small muted">No birthdays coming up. Add birthday day and month to members (Members screen, or Bulk upload) to see them here.</div>') + '</div>' +
          (DATA.birthdays.length ? '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-mbday="0">Make a list for today’s birthdays</button><button class="btn ghost" data-mbday="7">List for the next 7 days</button></div>' : '') +
          '<p class="small muted">Tip: add an automatic Birthday message (Automatic tab) so this happens every morning by itself.</p>';
      }
      v.innerHTML = h;
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };

  // ---------- new message ----------
  function newMsg(pre) {
    lk().then(function () {
      M = Object.assign({ src: 'pathway', aud: { kind: 'members' }, people: [], off: {}, channel: 'WhatsApp', title: '', subject: '', text: 'Hi {first}, ', paste: '' }, pre || {});
      drawMsg(true);
    });
  }
  function audFields(a, pre) {
    var u = T.user(), camps = (LK && LK.campuses) || [], conv = a.kind === 'converts', wk = a.kind === 'workers';
    var stages = ((LK && LK.stages) || []).map(function (s) { return { v: String(s.n), l: s.n + '. ' + s.name }; });
    return '<div class="f"><label for="' + pre + 'k">People</label><select class="inp" id="' + pre + 'k">' + T.opts([{ v: 'members', l: 'Members' }, { v: 'workers', l: 'Workers (people who sign in)' }, { v: 'everyone', l: 'Workers and members' }, { v: 'converts', l: 'New converts' }], a.kind) + '</select></div>' +
      (u.role === 'Admin' && camps.length ? '<div class="f"><label for="' + pre + 'c">' + esc(P.cw()) + '</label><select class="inp" id="' + pre + 'c">' + T.opts(camps, a.campus, 'All ' + P.cw(1, 1)) + '</select></div>' : '') +
      (names('groups').length && !wk ? '<div class="f"><label for="' + pre + 'g">Small group</label><select class="inp" id="' + pre + 'g">' + T.opts(names('groups'), a.group, 'Any') + '</select></div>' : '') +
      (!conv && names('departments').length ? '<div class="f"><label for="' + pre + 'd">Department</label><select class="inp" id="' + pre + 'd">' + T.opts(names('departments'), a.dept || a.unit, 'Any') + '</select></div>' : '') +
      (a.kind === 'members' ? '<div class="f"><label for="' + pre + 'r">Member role</label><select class="inp" id="' + pre + 'r">' + T.opts((LK && LK.memberRoles) || ['Member', 'Steward', 'Group leader', 'Department head'], a.mrole, 'Any') + '</select></div>' +
        '<div class="f"><label for="' + pre + 'b">Birthday month</label><select class="inp" id="' + pre + 'b">' + T.opts(MONTHS, a.bmonth, 'Any') + '</select></div>' : '') +
      (wk ? '<div class="f"><label for="' + pre + 'r">Worker role</label><select class="inp" id="' + pre + 'r">' + T.opts(['Admin', 'Leader', 'Follow-up worker', 'Counsellor', 'Member'], a.role, 'Any') + '</select></div>' : '') +
      (conv && stages.length ? '<div class="f"><label for="' + pre + 's">Pathway stage</label><select class="inp" id="' + pre + 's">' + T.opts(stages, a.stage ? String(a.stage) : '', 'Any') + '</select></div>' : '');
  }
  function readAud(pre) {
    var val = function (id) { var e = $(pre + id); return e ? e.value : ''; }, k = val('k') || 'members';
    var a = { kind: k, campus: val('c'), group: val('g'), dept: val('d'), bmonth: val('b'), stage: val('s') };
    if (k === 'workers') { a.role = val('r'); a.unit = a.dept; } else if (k === 'members') a.mrole = val('r');
    return a;
  }
  function chosen() { return M.people.filter(function (p, i) { return !M.off[i]; }); }
  function tokenChips(target) { return '<div class="chips" style="margin:6px 0">' + TOKENS.map(function (t) { return '<span class="chip" role="button" tabindex="0" data-tok="' + t[0] + '" data-for="' + target + '" title="' + esc(t[1] || P.cw()) + '">' + t[0] + '</span>'; }).join('') + '</div>'; }
  function drawMsg(first) {
    var ppl = chosen(), withPh = ppl.filter(function (p) { return p.phone; }).length, withEm = ppl.filter(function (p) { return p.email; }).length;
    var h = T.dhead('New message', 'One message, each person’s own name') + '<div class="db">' +
      '<div class="sec">1. Who it goes to</div><div class="card"><div class="seg" style="margin-bottom:12px"><button class="' + (M.src === 'pathway' ? 'on' : '') + '" data-msrc="pathway">From Pathway</button><button class="' + (M.src === 'paste' ? 'on' : '') + '" data-msrc="paste">Upload or paste a list</button></div>' +
      (M.src === 'pathway' ? '<div class="form">' + audFields(M.aud, 'na') + '<div class="full"><button class="btn sm" data-mfind="1">Find people</button></div></div>' :
        '<div class="f"><label for="mpaste">Paste from Excel or type: Name, Phone, Email (one person per line). The name can be left blank.</label><textarea class="inp" id="mpaste" rows="5" placeholder="Ada Obi, 08031234567, ada@gmail.com&#10;, 08035550000&#10;Pastor John, +447911123456">' + esc(M.paste) + '</textarea></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sm" data-mparse="1">Use this list</button><label class="btn ghost sm" style="cursor:pointer">Upload CSV file<input type="file" id="mfile" accept=".csv,.txt,text/csv" hidden></label><button class="btn ghost sm" data-mtpl="1">Download template</button></div>') +
      (M.people.length ? '<div style="margin-top:12px"><b>' + ppl.length + ' of ' + M.people.length + ' people chosen</b> <span class="small muted">· ' + withPh + ' with phone · ' + withEm + ' with email</span>' +
        '<div style="max-height:220px;overflow:auto;margin-top:6px;border:1px solid var(--line);border-radius:10px;padding:0 10px">' + M.people.map(function (p, i) {
          return '<label class="row small" style="cursor:pointer"><input type="checkbox" data-moff="' + i + '"' + (M.off[i] ? '' : ' checked') + '><div class="meta"><b>' + esc(p.name || '(no name)') + '</b><span>' + esc([p.phone, p.email].filter(String).join(' · ') || 'no contact') + '</span></div></label>';
        }).join('') + '</div><div style="margin-top:6px"><button class="btn ghost sm" data-mall="1">Tick all</button> <button class="btn ghost sm" data-mnone="1">Untick all</button></div></div>' : '') + '</div>' +
      '<div class="sec">2. The message</div><div class="card"><div class="form">' +
      '<div class="f full"><label>Send by</label><div class="seg">' + ['WhatsApp', 'SMS', 'Email'].map(function (c) { return '<button class="' + (M.channel === c ? 'on' : '') + '" data-mch="' + c + '">' + c + '</button>'; }).join('') + '</div></div>' +
      '<div class="f"><label for="mtitle">Name of this list (for you)</label><input class="inp" id="mtitle" value="' + esc(M.title) + '" placeholder="e.g. Thank-you to ushers"></div>' +
      (M.channel === 'Email' ? '<div class="f"><label for="msubj">Email subject</label><input class="inp" id="msubj" value="' + esc(M.subject) + '" placeholder="e.g. See you on Sunday, {first}"></div>' : '<div></div>') +
      '<div class="f full"><label for="mtext">Message</label>' + tokenChips('mtext') + '<textarea class="inp" id="mtext" rows="6">' + esc(M.text) + '</textarea>' +
      '<div class="small muted">Tap a chip to add it. {first} becomes each person’s first name (“Pastor John” keeps the title). If a name is unknown it is left out neatly.</div></div></div>' +
      '<div class="sec" style="margin-top:14px">Preview</div><div id="mprev">' + previewHtml() + '</div></div>' +
      '<div class="small muted" style="margin:10px 0">' + (M.channel === 'Email' ? 'Emails go out from the church Gmail by themselves (about 90 at a time; free Gmail sends about 100 a day). People without an email are left out.' :
        'Pathway opens ' + M.channel + ' on your phone with the message ready for each person. You tap Send, come back, and go to the next person. It is free and goes from your own number. People without a phone are left out.') + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin:12px 0 16px;flex-wrap:wrap"><button class="btn ghost" data-close="1">Cancel</button><button class="btn" id="msave">Save and start sending</button></div></div>';
    var dr = $('drawer'), top = dr.scrollTop;
    if (first) T.openDrawer(h); else { dr.innerHTML = h; dr.scrollTop = top; }
  }
  function previewHtml() {
    var sample = chosen().slice(0, 2).concat([{ name: '' }]);
    return sample.map(function (p) { return '<div class="log" style="margin-bottom:8px"><div class="e" style="white-space:pre-wrap"><span class="small muted">' + esc(p.name || 'Someone without a name') + ':</span><br>' + esc(P.fill(M.text, p)) + '</div></div>'; }).join('');
  }
  function syncMsg() {
    if (!M || !$('mtext')) return;
    M.text = $('mtext').value; M.title = $('mtitle').value; if ($('msubj')) M.subject = $('msubj').value; if ($('mpaste')) M.paste = $('mpaste').value;
    if ($('nak')) M.aud = readAud('na');
  }
  /** Reads pasted or uploaded rows: finds the phone (7+ digits), the email (has @) and treats the rest as the name. */
  function parseList(text) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var cells = line.split(/\t|,|;/).map(function (c) { return c.replace(/^\s*"|"\s*$/g, '').trim(); }), r = { name: '', phone: '', email: '' };
      if (cells.some(function (c) { return /^(phone|name|email|whatsapp)/i.test(c); }) && !cells.some(function (c) { return /\d{7,}/.test(c.replace(/\D/g, '')); })) return; // header row
      cells.forEach(function (c) {
        if (!c) return;
        if (/@/.test(c) && !r.email) r.email = c;
        else if (c.replace(/\D/g, '').length >= 7 && /^[\d\s+()\-.]+$/.test(c) && !r.phone) r.phone = c;
        else if (!r.name) r.name = c;
      });
      if (r.phone || r.email) out.push(r);
    });
    return out;
  }
  function saveMsg(btn) {
    syncMsg();
    var ppl = chosen();
    if (!ppl.length) { P.toast('Choose who it goes to first'); return; }
    if (!M.text.replace(/\{\w+\}/g, '').replace(/[\s,]/g, '').replace(/^hi$/i, '')) { P.toast('Type the message'); $('mtext').focus(); return; }
    T.busy(btn, true);
    T.api('msgSave', { msg: { title: M.title.trim() || P.fill(M.text, {}).split('\n')[0].slice(0, 60), channel: M.channel, subject: M.subject, text: M.text, recipients: ppl } }).then(function (j) {
      var ch = M.channel; M = null; T.S._dirty = true; TAB = 'lists';
      if (j.skipped) P.toast(j.skipped + ' left out (no ' + (ch === 'Email' ? 'email address' : 'phone number') + ')');
      openList(j.id);
    }).catch(function (e) { T.busy(btn, false); P.toast(e.message); });
  }

  // ---------- sending ----------
  function openList(id) {
    T.openDrawer(T.dhead('Send', 'Loading…') + '<div class="db"><div class="card muted">Loading…</div></div>');
    T.api('msgGet', { id: id }).then(function (j) { LIST = j.msg; drawList(); }).catch(function (e) { P.toast(e.message); });
  }
  P.openMsgList = function (id) { T.S._dirty = true; openList(id); };
  function link(r) {
    var text = P.fill(LIST.text, r);
    return LIST.channel === 'SMS' ? P.smsLink(r.p, text) : P.waLink(r.p, text);
  }
  function drawList() {
    var L = LIST, rec = L.recipients, sent = rec.filter(function (r) { return r.s; }).length, next = -1;
    for (var i = 0; i < rec.length; i++) if (!rec[i].s && !(L._skip || {})[i]) { next = i; break; }
    var h = T.dhead(L.title, esc(L.channel) + ' · ' + sent + ' of ' + rec.length + ' sent') + '<div class="db">' + bar(sent, rec.length);
    if (L.channel === 'Email') {
      var left = rec.filter(function (r) { return !r.s; }).length;
      h += '<div class="card" style="text-align:center">' + (left ? '<p>' + left + ' email(s) ready. Each one has the person’s own name.</p><button class="btn" data-msend="1">Send ' + Math.min(left, 90) + ' email(s) now</button>' +
        (left > 90 ? '<p class="small muted">Gmail allows about 100 a day, so the rest can be sent tomorrow from here.</p>' : '') : '<b>All sent ✓</b>') + '</div>';
    } else if (next >= 0) {
      var r = rec[next], verb = L.channel === 'SMS' ? 'Open SMS' : 'Open WhatsApp';
      h += '<div class="card" style="border:2px solid var(--teal)"><div class="small muted">Next: ' + (next + 1) + ' of ' + rec.length + '</div><b style="font-size:18px">' + esc(r.n || 'No name') + '</b><div class="small muted">' + esc(r.p) + '</div>' +
        '<div class="log" style="margin:10px 0"><div class="e" style="white-space:pre-wrap">' + esc(P.fill(L.text, r)) + '</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn ' + (L.channel === 'SMS' ? 'gold' : 'wa') + '" style="flex:1;justify-content:center;padding:12px" href="' + link(r) + '" target="_blank" rel="noopener" data-msent="' + next + '">' + verb + ' for ' + esc(P.firstName(r.n) || 'this person') + '</a>' +
        '<button class="btn ghost" data-mskip="' + next + '">Skip</button><button class="btn ghost" data-mcopy="' + next + '">Copy text</button></div>' +
        '<p class="small muted" style="margin:10px 0 0">Tap the green button, press Send in ' + L.channel + ', then come back here: the next person is ready. Sending to people who know the church keeps your number safe from being flagged.</p></div>';
    } else h += '<div class="card" style="text-align:center"><div style="font-size:34px">🎉</div><b>All ' + rec.length + ' sent</b></div>';
    h += '<div class="card" style="margin-top:12px"><h3>Everyone (' + rec.length + ')<span class="sp"></span><button class="btn ghost sm" data-mmark="all">Mark all sent</button><button class="btn ghost sm" data-mmark="none">Start again</button></h3>' +
      rec.map(function (r, i) {
        return '<div class="row"><div class="meta"><b>' + (r.s ? '✓ ' : '') + esc(r.n || '(no name)') + '</b><span>' + esc(L.channel === 'Email' ? r.e : r.p) + (r.s && r.t ? ' · sent ' + new Date(r.t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '') + '</span></div>' +
          (L.channel !== 'Email' && r.p ? '<a class="btn ghost sm ' + (L.channel === 'SMS' ? '' : 'wa') + '" href="' + link(r) + '" target="_blank" rel="noopener" data-msent="' + i + '">' + (r.s ? 'Again' : 'Send') + '</a>' + (r.p ? '<a class="btn ghost sm" href="' + P.telLink(r.p) + '">Call</a>' : '') : '') + '</div>';
      }).join('') + '</div>' +
      '<div style="display:flex;justify-content:space-between;gap:8px;margin:14px 0;flex-wrap:wrap"><button class="btn ghost sm" data-mdel="' + esc(L.id) + '" style="color:var(--red)">Delete list</button><button class="btn ghost sm" data-mreuse="1">Use again for a new message</button></div></div>';
    var dr = $('drawer'), top = dr.scrollTop; dr.innerHTML = h; dr.scrollTop = top;
  }
  function mark(i, on) {
    var r = LIST.recipients[i]; if (!r) return;
    if (on) { r.s = 1; r.t = new Date().toISOString(); } else { delete r.s; delete r.t; }
    T.api('msgMark', { id: LIST.id, idx: i, sent: on }).catch(function (e) { P.toast(e.message); });
    T.S._dirty = true;
  }

  // ---------- automatic messages ----------
  var AUTO_START = [
    { name: 'Birthday wishes', trigger: 'Birthday', channel: 'Email, else WhatsApp', subject: 'Happy birthday, {first}! 🎂', text: 'Happy birthday {first}! 🎂🎉\nWe thank God for your life and pray this new year brings you joy, health and favour.\nWith love from all of us at {church}.', audience: { kind: 'members' } },
    { name: 'Welcome new converts', trigger: 'New convert welcome', channel: 'WhatsApp', text: 'Hi {first}, welcome to the {church} family! 🙌 We are so glad you made that decision. Someone from our team will be in touch this week. God bless you!', audience: { kind: 'converts' } },
    { name: 'Event reminder', trigger: 'On a date', channel: 'Email and WhatsApp', subject: 'See you today, {first}', text: 'Hi {first}, a reminder that our programme is today. We can’t wait to see you! {church}', audience: { kind: 'members' } },
    { name: 'Weekly workers’ reminder', trigger: 'Every week', day: 'Friday', channel: 'WhatsApp', text: 'Hi {first}, a reminder for this week’s workers’ meeting. Please be on time. God bless you! {church}', audience: { kind: 'workers' } }
  ];
  function editAuto(a) {
    lk().then(function () { AUTO = JSON.parse(JSON.stringify(a)); AUTO.audience = AUTO.audience || { kind: 'members' }; drawAuto(true); });
  }
  function pickAuto() {
    T.openDrawer(T.dhead('Automatic message', 'Pick one to start from') + '<div class="db"><div class="grid g2">' + AUTO_START.map(function (s, i) {
      return '<div class="card click" data-astart="' + i + '" role="button" tabindex="0"><b>' + esc(s.name) + '</b><div class="small muted">' + esc(trigText(s)) + ' · ' + esc(chText(s.channel)) + '</div></div>';
    }).join('') + '</div></div>');
  }
  function drawAuto(first) {
    var a = AUTO, conv = a.trigger === 'New convert welcome';
    var h = T.dhead(a.id ? 'Edit automatic message' : 'New automatic message', esc(a.name || '')) + '<div class="db"><div class="card"><div class="form">' +
      '<div class="f"><label for="aname">Name</label><input class="inp" id="aname" value="' + esc(a.name || '') + '"></div>' +
      '<div class="f"><label for="atrig">When</label><select class="inp" id="atrig">' + T.opts([{ v: 'Birthday', l: 'On each person’s birthday' }, { v: 'On a date', l: 'On a date (e.g. an event)' }, { v: 'Every week', l: 'Every week' }, { v: 'New convert welcome', l: 'Welcome new converts' }], a.trigger) + '</select></div>' +
      (a.trigger === 'On a date' ? '<div class="f"><label for="adate">Date</label><input class="inp" type="date" id="adate" value="' + (a.date ? D10(a.date) : '') + '"></div>' : '') +
      (a.trigger === 'Every week' ? '<div class="f"><label for="aday">Day</label><select class="inp" id="aday">' + T.opts(DAYS, a.day || 'Friday') + '</select></div>' : '') +
      '<div class="f"><label for="ach">Send by</label><select class="inp" id="ach">' + T.opts(['Email', 'WhatsApp', 'Email and WhatsApp', 'Email, else WhatsApp'].map(function (c) { return { v: c, l: chText(c) }; }), a.channel) + '</select></div>' +
      (conv ? '<div class="small muted full">Goes to new converts captured since the last run, the next morning.</div>' : audFields(a.audience, 'aa')) +
      (/Email/.test(a.channel) ? '<div class="f full"><label for="asubj">Email subject</label><input class="inp" id="asubj" value="' + esc(a.subject || '') + '"></div>' : '') +
      '<div class="f full"><label for="atext">Message</label>' + tokenChips('atext') + '<textarea class="inp" id="atext" rows="5">' + esc(a.text || '') + '</textarea></div>' +
      '<label class="small full" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="aact"' + (a.active !== false ? ' checked' : '') + '> Turned on</label></div></div>' +
      '<div class="log" style="margin-top:12px"><div class="e" style="white-space:pre-wrap"><span class="small muted">Preview for Pastor John Okafor:</span><br>' + esc(P.fill(a.text, { name: 'Pastor John Okafor', group: 'Kubwa Light' })) + '</div></div>' +
      '<p class="small muted">Runs each morning at the daily-reminder hour, once the daily reminders are turned on (Admin & settings > Overview). WhatsApp messages are prepared as a list in Messages for you to send with one tap each; you get a notice in My space.</p>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin:12px 0 16px;flex-wrap:wrap">' + (a.id ? '<button class="btn ghost" data-adel="' + esc(a.id) + '" style="color:var(--red)">Delete</button><span class="sp" style="flex:1"></span>' : '') + '<button class="btn ghost" data-close="1">Cancel</button><button class="btn" id="asave">Save</button></div></div>';
    var dr = $('drawer'), top = dr.scrollTop;
    if (first) T.openDrawer(h); else { dr.innerHTML = h; dr.scrollTop = top; }
  }
  function syncAuto() {
    if (!AUTO || !$('atext')) return;
    var v = function (id) { var e = $(id); return e ? e.value : undefined; };
    AUTO.name = v('aname'); AUTO.trigger = v('atrig'); AUTO.channel = v('ach'); AUTO.text = v('atext'); AUTO.active = $('aact').checked;
    if (v('adate') !== undefined) AUTO.date = v('adate'); if (v('aday') !== undefined) AUTO.day = v('aday'); if (v('asubj') !== undefined) AUTO.subject = v('asubj');
    if ($('aak')) AUTO.audience = readAud('aa');
  }

  // ---------- taps ----------
  function insertToken(id, tok) {
    var e = $(id); if (!e) return;
    var s = e.selectionStart == null ? e.value.length : e.selectionStart, en = e.selectionEnd == null ? s : e.selectionEnd;
    e.value = e.value.slice(0, s) + tok + e.value.slice(en); e.focus(); e.selectionStart = e.selectionEnd = s + tok.length;
    e.dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-mtab]'))) { TAB = x.dataset.mtab; P.app.render(); return; }
    if (t.closest('[data-mnew]')) { newMsg(); return; }
    if (t.closest('[data-anew]')) { pickAuto(); return; }
    if ((x = t.closest('[data-astart]'))) { editAuto(AUTO_START[+x.dataset.astart]); return; }
    if ((x = t.closest('[data-aedit]'))) { var ae = (DATA.autos || []).filter(function (a) { return a.id === x.dataset.aedit; })[0]; if (ae) editAuto(ae); return; }
    if ((x = t.closest('[data-aprev]'))) {
      var an = (DATA.autos.filter(function (a) { return a.id === x.dataset.aprev; })[0] || {}).name;
      T.openDrawer(T.dhead('Who gets it', esc(an || '')) + '<div class="db"><div class="card muted">Loading…</div></div>');
      T.api('autoPreview', { id: x.dataset.aprev }).then(function (j) {
        $('drawer').querySelector('.db').innerHTML = '<div class="card"><h3>' + j.count + ' ' + (j.count === 1 ? 'person' : 'people') + '</h3>' + (j.people.map(function (p) {
          return '<div class="row"><div class="meta"><b>' + esc(p.name) + '</b><span>' + (p.when ? new Date(p.when).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' : '') + (p.email ? 'email' : '') + (p.email && p.phone ? ' + ' : '') + (p.phone ? 'phone' : '') + (!p.email && !p.phone ? 'no contact details' : '') + '</span></div></div>';
        }).join('') || '<div class="small muted">Nobody right now. For birthdays this shows the next 7 days.</div>') + '</div>';
      }).catch(function (e2) { P.toast(e2.message); });
      return;
    }
    if ((x = t.closest('[data-mopen]'))) { openList(x.dataset.mopen); return; }
    if ((x = t.closest('[data-mbday]'))) {
      var days = +x.dataset.mbday, b = DATA.birthdays.filter(function (p) { return p.inDays <= days; });
      newMsg({ src: 'paste', people: b, title: days ? 'Birthdays this week' : 'Birthday wishes ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        text: 'Happy birthday {first}! 🎂🎉 We thank God for your life. Have a wonderful year ahead. From all of us at {church}.' });
      return;
    }
    // inside the send screen
    if (LIST && t.closest('#drawer')) {
      if ((x = t.closest('[data-msent]'))) { var i = +x.dataset.msent; if (!LIST.recipients[i].s) mark(i, true); setTimeout(drawList, 400); return; }
      if ((x = t.closest('[data-mskip]'))) { (LIST._skip = LIST._skip || {})[+x.dataset.mskip] = 1; drawList(); return; }
      if ((x = t.closest('[data-mcopy]'))) { var tx = P.fill(LIST.text, LIST.recipients[+x.dataset.mcopy]); (navigator.clipboard ? navigator.clipboard.writeText(tx) : Promise.reject()).then(function () { P.toast('Copied ✓'); }, function () { window.prompt('Copy this', tx); }); return; }
      if ((x = t.closest('[data-mmark]'))) {
        var all = x.dataset.mmark === 'all'; if (!window.confirm(all ? 'Mark everyone as sent?' : 'Untick everyone and start again?')) return;
        LIST._skip = {}; T.api('msgMark', { id: LIST.id, idx: x.dataset.mmark, sent: all }).then(function () { openList(LIST.id); T.S._dirty = true; }).catch(function (e2) { P.toast(e2.message); }); return;
      }
      if (t.closest('[data-msend]')) {
        T.busy(t.closest('[data-msend]'), true);
        T.api('msgEmail', { id: LIST.id }).then(function (j) { P.toast(j.sent + ' email(s) sent ✓'); T.S._dirty = true; openList(LIST.id); }).catch(function (e2) { P.toast(e2.message); T.busy(t.closest('[data-msend]'), false); }); return;
      }
      if ((x = t.closest('[data-mdel]'))) { if (!window.confirm('Delete this list?')) return; T.api('msgRemove', { id: LIST.id }).then(function () { LIST = null; T.S._dirty = true; P.closeDrawer(); }).catch(function (e2) { P.toast(e2.message); }); return; }
      if (t.closest('[data-mreuse]')) { var L0 = LIST; LIST = null; newMsg({ src: 'paste', channel: L0.channel, text: L0.text, subject: L0.subject, people: L0.recipients.map(function (r) { return { name: r.n, phone: r.p, email: r.e, campus: r.c, group: r.g, dept: r.d }; }) }); return; }
    }
    // inside the new-message drawer
    if (M && t.closest('#drawer') && $('mtext')) {
      if ((x = t.closest('[data-tok]'))) { insertToken(x.dataset.for, x.dataset.tok); return; }
      if ((x = t.closest('[data-msrc]'))) { syncMsg(); M.src = x.dataset.msrc; drawMsg(); return; }
      if ((x = t.closest('[data-mch]'))) { syncMsg(); M.channel = x.dataset.mch; drawMsg(); return; }
      if (t.closest('[data-mall]') || t.closest('[data-mnone]')) { syncMsg(); var none = !!t.closest('[data-mnone]'); M.off = {}; if (none) M.people.forEach(function (p, i) { M.off[i] = 1; }); drawMsg(); return; }
      if (t.closest('[data-mfind]')) {
        syncMsg(); var fb = t.closest('[data-mfind]'); T.busy(fb, true);
        T.api('msgAudience', { audience: M.aud }).then(function (j) { M.people = j.people; M.off = {}; drawMsg(); if (!j.people.length) P.toast('Nobody matches. Try fewer filters.'); }).catch(function (e2) { T.busy(fb, false); P.toast(e2.message); });
        return;
      }
      if (t.closest('[data-mparse]')) { syncMsg(); M.people = parseList(M.paste); M.off = {}; drawMsg(); P.toast(M.people.length ? M.people.length + ' people found' : 'No phone numbers or emails found'); return; }
      if (t.closest('[data-mtpl]')) { T.csv('Message list template', [['Name', 'Phone', 'Email'], ['Ada Obi', '08031234567', 'ada@example.com'], ['', '08035550000', ''], ['Pastor John', '+447911123456', '']]); return; }
      if (t.id === 'msave') { saveMsg(t); return; }
    }
    if (AUTO && t.closest('#drawer') && $('atext')) {
      if ((x = t.closest('[data-tok]'))) { insertToken(x.dataset.for, x.dataset.tok); return; }
      if (t.id === 'asave') {
        syncAuto(); T.busy(t, true);
        T.api('autoSave', { auto: AUTO }).then(function () { P.toast('Saved ✓'); AUTO = null; TAB = 'auto'; T.S._dirty = true; P.closeDrawer(); }).catch(function (e2) { T.busy(t, false); P.toast(e2.message); });
        return;
      }
      if ((x = t.closest('[data-adel]'))) { if (!window.confirm('Delete this automatic message?')) return; T.api('autoRemove', { id: x.dataset.adel }).then(function () { AUTO = null; T.S._dirty = true; P.closeDrawer(); }).catch(function (e2) { P.toast(e2.message); }); }
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#drawer')) return;
    if (M && $('mtext') && t.id === 'nak') { syncMsg(); M.aud = { kind: t.value }; drawMsg(); return; }
    if (M && t.id === 'mfile' && t.files && t.files[0]) {
      var rd = new FileReader(); rd.onload = function () { syncMsg(); M.paste = String(rd.result); M.people = parseList(M.paste); M.off = {}; drawMsg(); P.toast(M.people.length + ' people found'); }; rd.readAsText(t.files[0]); return;
    }
    if (AUTO && $('atext') && (t.id === 'atrig' || t.id === 'ach' || t.id === 'aak')) { syncAuto(); if (t.id === 'aak') AUTO.audience = { kind: t.value }; drawAuto(); }
  });
  document.addEventListener('input', function (e) {
    if (M && e.target.id === 'mtext' && $('mprev')) { M.text = e.target.value; $('mprev').innerHTML = previewHtml(); }
  });
})();
