/* Pathway QR self-registration (public form, no sign-in). Event comes from ?e=CODE in the QR link. */
(function () {
  var P = window.Pathway, $ = function (id) { return document.getElementById(id); };
  var code = (new URLSearchParams(location.search).get('e') || '').trim();
  var cfg = P.config();
  function checkEvent() {
    var ok = !code || !cfg.events || cfg.events.some(function (e) { return e.code.toLowerCase() === code.toLowerCase(); });
    $('rbad').hidden = ok || !P.get('config'); // only warn once we have the real list
  }
  $('rcc').innerHTML = P.COUNTRIES.map(function (c) { return '<option value="' + c[1] + '"' + (c[1] === cfg.defaultCC ? ' selected' : '') + '>' + c[2] + ' ' + c[1] + '</option>'; }).join('');
  document.querySelectorAll('.chips').forEach(function (g) {
    g.addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (!c) return; g.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === c); }); });
  });
  var DEC = { 'Give my life to Jesus': 'Salvation', 'Rededicate my life': 'Rededication', 'Just visiting': 'First-time guest' };
  function net() { $('roff').hidden = P.online(); }
  window.addEventListener('online', function () { net(); send(); });
  window.addEventListener('offline', net); net(); checkEvent();
  P.refreshConfig().then(function (c) { cfg = c; checkEvent(); });

  function send() {
    return P.sync('register').then(function (r) { if (r.sent) P.toast('Saved registrations sent ✓'); }).catch(function () {});
  }
  send();

  $('rf').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('rn').value.trim().replace(/\s+/g, ' '), phone = $('rp').value.replace(/\D/g, '');
    if (name.split(' ').length < 1 || name.length < 2) { $('rerr').textContent = 'Please enter your name'; return; }
    if (phone.replace(/^0+/, '').length < 7) { $('rerr').textContent = 'Please enter a valid phone number'; return; }
    if (!$('rc').checked) { $('rerr').textContent = 'Please tick the box so we can contact you'; return; }
    $('rerr').textContent = '';
    var parts = name.split(' '), dec = document.querySelector('[data-g="decision"] .chip.on');
    var rec = {
      clientId: P.uid(), capturedAt: new Date().toISOString(), first: parts[0], last: parts.slice(1).join(' '),
      cc: $('rcc').value, phone: phone, whatsapp: true, email: $('re').value.trim(), area: $('ra').value.trim(),
      eventCode: code, decision: DEC[dec ? dec.textContent : ''] || 'Salvation', prayer: $('rpr').value.trim(),
      contact: 'WhatsApp', consent: true, website: $('rw').value
    };
    var done = function (msg) {
      $('rf').hidden = true; $('rdone').hidden = false; if (msg) $('rmsg').textContent = msg; window.scrollTo(0, 0);
    };
    var later = function () {
      return P.queueAdd({ clientId: rec.clientId, kind: 'register', record: rec, savedAt: rec.capturedAt })
        .then(function () { done('Your details are saved on this phone and will send automatically when there is internet. Someone from the church will reach out to you soon.'); });
    };
    $('rs').disabled = true;
    if (!P.online() || !P.API) { later().then(function () { $('rs').disabled = false; }); return; }
    P.call('register', { records: [rec] }).then(function (j) {
      var r = j.results[0];
      if (r && !r.ok) { $('rerr').textContent = r.error; return; }
      done();
    }).catch(function (err) { return err.network ? later() : ($('rerr').textContent = err.message); })
      .then(function () { $('rs').disabled = false; });
  });
  $('ragain').onclick = function () { $('rf').reset(); $('rf').hidden = false; $('rdone').hidden = true; $('rn').focus(); };
})();
