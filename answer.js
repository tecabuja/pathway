/* Pathway: public page for answering a poll, form or RSVP (answer.html?f=ID). Works for anyone with the link;
   signed-in workers get their name filled in. Answers typed offline are sent when the phone is back online. */
(function () {
  var P = window.Pathway, $ = function (id) { return document.getElementById(id); }, esc = P.esc;
  var ID = (new URLSearchParams(location.search).get('f') || '').replace(/[^\w]/g, ''), D = null, A = {}, EDIT = false;
  function msg(html) { $('af').hidden = true; $('amsg').hidden = false; $('amsg').innerHTML = html; }
  function closesText(f) { return f.closes ? 'Closes ' + new Date(f.closes).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''; }
  function load() {
    if (!ID) { $('atitle').textContent = 'Link not complete'; msg('<p class="muted">This link is missing part of its address. Please ask for the link again.</p>'); return; }
    var saved = P.get('form_' + ID);
    if (!P.online() && saved) { D = saved; draw(); return; }
    P.call('formPublic', { id: ID, token: P.get('token') || '' }).then(function (j) { D = j; P.set('form_' + ID, j); draw(); })
      .catch(function (e) { if (saved) { D = saved; draw(); P.toast('Weak connection: showing the saved copy'); } else { $('atitle').textContent = 'Not available'; msg('<p class="muted">' + esc(e.message) + '</p>'); } });
  }
  function hb(label, n, max, total) { return '<div class="hb w"><span>' + esc(label) + '</span><div class="bar"><i style="width:' + (max ? Math.round(n / max * 100) : 0) + '%"></i></div><b>' + (total ? Math.round(n / total * 100) : 0) + '%</b></div>'; }
  function results(r) {
    if (!r) return '';
    return '<div style="text-align:left;margin-top:18px"><b>Results so far</b>' + D.form.questions.filter(function (q) { return r[q.id]; }).map(function (q) {
      var c = r[q.id], keys = q.type === 'rating' ? ['5', '4', '3', '2', '1'] : q.type === 'yesno' ? ['Yes', 'No'] : (q.options || []), tot = 0, max = 1;
      keys.forEach(function (k) { tot += c[k] || 0; max = Math.max(max, c[k] || 0); });
      return '<div class="small" style="margin:10px 0 4px;font-weight:600">' + esc(q.label) + '</div>' + keys.map(function (k) { return hb(q.type === 'rating' ? k + ' ★' : k, c[k] || 0, max, tot); }).join('');
    }).join('') + '</div>';
  }
  function field(q) {
    var v = A[q.id], req = q.required ? ' <span class="req">*</span>' : '', id = 'q_' + q.id;
    var h = '<div class="q" data-q="' + esc(q.id) + '">';
    if (['single', 'multi', 'yesno'].indexOf(q.type) >= 0) {
      var opts = q.type === 'yesno' ? ['Yes', 'No'] : q.options, sel = [].concat(v || []);
      h += '<div class="ql" id="l_' + esc(q.id) + '">' + esc(q.label) + req + (q.type === 'multi' ? ' <span class="small muted" style="font-weight:500">(choose all that apply)</span>' : '') + '</div><div class="chips big" role="' + (q.type === 'multi' ? 'group' : 'radiogroup') + '" aria-labelledby="l_' + esc(q.id) + '"' + (q.type === 'multi' ? ' data-multi="1"' : '') + '>' +
        opts.map(function (o) { return '<span class="chip' + (sel.indexOf(o) >= 0 ? ' on' : '') + '" role="' + (q.type === 'multi' ? 'checkbox' : 'radio') + '" aria-checked="' + (sel.indexOf(o) >= 0) + '" tabindex="0" data-v="' + esc(o) + '">' + esc(o) + '</span>'; }).join('') + '</div>';
    } else if (q.type === 'rating') {
      h += '<div class="ql" id="l_' + esc(q.id) + '">' + esc(q.label) + req + '</div><div class="stars" role="radiogroup" aria-labelledby="l_' + esc(q.id) + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="' + (+v >= n ? 'on' : '') + '" data-star="' + n + '" aria-label="' + n + ' out of 5">★</button>'; }).join('') + '</div>';
    } else {
      var type = { number: 'number', date: 'date', phone: 'tel', email: 'email' }[q.type] || 'text';
      h += '<label for="' + id + '">' + esc(q.label) + req + '</label>' + (q.type === 'long' ? '<textarea class="inp" id="' + id + '" rows="4">' + esc(v || '') + '</textarea>' :
        '<input class="inp" id="' + id + '" type="' + type + '"' + (q.type === 'number' ? ' inputmode="numeric" min="0"' : '') + (q.type === 'phone' ? ' inputmode="tel" autocomplete="tel"' : '') + (q.type === 'email' ? ' autocomplete="email"' : '') + ' value="' + esc(v == null ? '' : v) + '">');
    }
    if (q.help) h += '<div class="small muted">' + esc(q.help) + '</div>';
    return h + '</div>';
  }
  function draw() {
    var f = D.form, s = f.settings, me = D.me;
    document.title = f.title + ' · ' + (D.church || 'Church');
    $('atitle').textContent = f.title;
    $('asub').textContent = [D.church, closesText(f), f.left != null && f.status === 'Open' ? f.left + ' place' + (f.left === 1 ? '' : 's') + ' left' : ''].filter(String).join(' · ');
    if (s.anon) $('afoot').textContent = 'This is anonymous: your name and phone number are not recorded.';
    if (f.status !== 'Open' && !(f.status === 'Full' && D.mine)) { msg('<div style="font-size:40px">' + (f.status === 'Full' ? '🎟️' : '🔒') + '</div><b style="font-size:18px">' + (f.status === 'Full' ? 'Sorry, this is now full' : 'This is now closed') + '</b><p class="muted">Thank you for your interest.</p>' + results(D.results)); return; }
    if ((D.mine || P.get('ans_' + ID)) && !EDIT) { done({ results: D.results }, true); return; }
    if (D.mine && !Object.keys(A).length) A = JSON.parse(JSON.stringify(D.mine));
    var name = P.get('ans_name') || '', phone = P.get('ans_phone') || '';
    if (me) { name = name || me.name; phone = phone || me.phone; }
    $('amsg').hidden = true; var fm = $('af'); fm.hidden = false;
    fm.innerHTML = '<div class="banner red" id="aoff" hidden style="margin:0 0 12px">📴 No internet right now. You can still submit; it will send automatically later.</div>' +
      (f.desc ? '<p style="margin-top:0;white-space:pre-wrap">' + esc(f.desc) + '</p>' : '') +
      (s.askName !== 'no' && !s.anon ? '<div class="q"><label for="aname">Your name' + (s.askName === 'required' ? ' <span class="req">*</span>' : '') + '</label><input class="inp" id="aname" autocomplete="name" autocapitalize="words" value="' + esc(name) + '"></div>' : '') +
      (s.askPhone !== 'no' && !s.anon ? '<div class="q"><label for="aphone">Phone (WhatsApp)' + (s.askPhone === 'required' ? ' <span class="req">*</span>' : '') + '</label><input class="inp" id="aphone" inputmode="tel" autocomplete="tel" value="' + esc(phone) + '"></div>' : '') +
      f.questions.map(field).join('') +
      '<input class="hp" id="aw" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="err" id="aerr" role="alert"></div>' +
      '<button class="btn" id="asend" type="submit" style="padding:12px;width:100%;justify-content:center">' + (EDIT ? 'Update my answer' : 'Submit') + '</button>';
    $('aoff').hidden = P.online();
  }
  function done(j, before) {
    var s = D.form.settings;
    msg('<div style="font-size:42px">' + (D.form.type === 'RSVP' && A.rsvp === 'Not coming' ? '🙏' : '🎉') + '</div><b style="font-size:18px">' + (before ? 'You have already answered' : j.updated ? 'Your answer has been updated' : 'Thank you!') + '</b>' +
      '<p class="muted" style="white-space:pre-wrap">' + esc(s.thanks || (D.form.type === 'RSVP' ? (A.rsvp === 'Coming' ? 'We look forward to seeing you!' : 'Thank you for letting us know.') : 'Your answer has been received.')) + '</p>' +
      (j.queued ? '<p class="small" style="color:var(--amber)">Saved on this phone. It will send automatically when you are back online.</p>' : '') + results(j.results) +
      '<button class="btn ghost" id="aagain" type="button" style="margin-top:16px">Change or add an answer</button>');
    $('aagain').onclick = function () { EDIT = true; draw(); window.scrollTo(0, 0); };
  }
  function collect() {
    var f = D.form, a = {};
    f.questions.forEach(function (q) {
      var box = document.querySelector('[data-q="' + q.id + '"]'); if (!box) return;
      if (['single', 'multi', 'yesno'].indexOf(q.type) >= 0) { var on = [].slice.call(box.querySelectorAll('.chip.on')).map(function (c) { return c.dataset.v; }); a[q.id] = q.type === 'multi' ? on : (on[0] || ''); }
      else if (q.type === 'rating') a[q.id] = box.querySelectorAll('.stars .on').length || '';
      else { var e = box.querySelector('input,textarea'); a[q.id] = e ? e.value.trim() : ''; }
    });
    return a;
  }
  function send(body) { return P.call('formAnswer', body); }
  function flush() {
    var q = P.get('ans_queue', []); if (!q.length || !P.online()) return;
    var b = q[0];
    send(b).then(function () { P.set('ans_queue', P.get('ans_queue', []).slice(1)); P.toast('Your saved answer has been sent ✓'); flush(); })
      .catch(function (e) { if (!e.network) { P.set('ans_queue', P.get('ans_queue', []).slice(1)); P.toast(e.message); } });
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('#af .chip');
    if (c) {
      var g = c.parentNode;
      if (!g.dataset.multi) g.querySelectorAll('.chip').forEach(function (x) { if (x !== c) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); } });
      c.classList.toggle('on'); c.setAttribute('aria-checked', String(c.classList.contains('on'))); return;
    }
    var st = e.target.closest('[data-star]');
    if (st) { var n = +st.dataset.star; st.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', +b.dataset.star <= n); }); }
  });
  document.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && e.target.closest && e.target.closest('#af .chip')) { e.preventDefault(); e.target.click(); } });
  $('af').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = D.form, s = f.settings, err = $('aerr'); err.textContent = '';
    A = collect();
    var name = $('aname') ? $('aname').value.trim() : '', phone = $('aphone') ? $('aphone').value.trim() : '';
    if (s.askName === 'required' && !s.anon && !name) { err.textContent = 'Please enter your name.'; $('aname').focus(); return; }
    if (s.askPhone === 'required' && !s.anon && phone.replace(/\D/g, '').length < 7) { err.textContent = 'Please enter your phone number.'; $('aphone').focus(); return; }
    for (var i = 0; i < f.questions.length; i++) {
      var q = f.questions[i], v = A[q.id];
      if (q.required && (v === '' || v == null || (Array.isArray(v) && !v.length))) { err.textContent = 'Please answer: ' + q.label; var box = document.querySelector('[data-q="' + q.id + '"]'); if (box) box.scrollIntoView({ block: 'center' }); return; }
    }
    if ($('aw').value) return; // spam trap
    if (name) P.set('ans_name', name); if (phone) P.set('ans_phone', phone);
    var body = { id: ID, name: name, phone: phone, answers: A, token: P.get('token') || '', clientId: P.uid() }, btn = $('asend');
    if (!P.online()) { P.set('ans_queue', P.get('ans_queue', []).concat([body])); P.set('ans_' + ID, 1); EDIT = false; done({ queued: true }); return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    send(body).then(function (j) { P.set('ans_' + ID, 1); EDIT = false; D.mine = A; done(j); })
      .catch(function (e2) {
        if (e2.network) { P.set('ans_queue', P.get('ans_queue', []).concat([body])); P.set('ans_' + ID, 1); EDIT = false; done({ queued: true }); return; }
        err.textContent = e2.message; btn.disabled = false; btn.textContent = EDIT ? 'Update my answer' : 'Submit';
      });
  });
  window.addEventListener('online', function () { var o = $('aoff'); if (o) o.hidden = true; flush(); });
  window.addEventListener('offline', function () { var o = $('aoff'); if (o) o.hidden = false; });
  load(); flush();
})();
