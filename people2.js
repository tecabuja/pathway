/* Pathway step 9: Who's online, PIN requests, and the approval-route builder (Super Admin). */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
  var ONF = 'Online';
  P.views.online = { title: 'Who’s online', icon: ICON, render: function (v) {
    T.loading(v); var gone = T.guard();
    T.api('online').then(function (d) {
      if (gone()) return;
      var list = ONF === 'Online' ? d.people.filter(function (p) { return p.online; }) : d.people.filter(function (p) { return !p.online; });
      var ago = function (m) { return m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' days'; };
      v.innerHTML = '<div class="kpis" style="margin-bottom:12px"><div class="card" style="margin:0"><div class="small muted">Online now</div><b style="font-size:26px"><span class="odot"></span> ' + d.online + '</b><div class="small muted">' + d.app + ' phone app · ' + (d.online - d.app) + ' web</div></div>' +
        '<div class="card" style="margin:0"><div class="small muted">Active this week</div><b style="font-size:26px">' + d.week + '</b></div><div class="card" style="margin:0"><div class="small muted">Never signed in</div><b style="font-size:26px">' + d.never.length + '</b></div></div>' +
        '<div class="seg" style="margin-bottom:12px">' + ['Online', 'Recently', 'Never signed in'].map(function (k) { return '<button class="' + (ONF === k ? 'on' : '') + '" data-onf="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        (ONF === 'Never signed in' ? '<div class="card">' + (d.never.map(function (p) { return '<div class="row"><div class="meta"><b>' + esc(p.name) + '</b><span>' + esc([p.title, p.unit].filter(String).join(' · ')) + '</span></div>' + (p.phone ? '<a class="btn sm wa" target="_blank" rel="noopener" href="' + P.waLink(p.phone, P.fill('Hi {first}, you can now use Pathway, our church app: ' + P.appBase() + ' Sign in with your name and the PIN you were given. Forgot it? Tap "Forgot PIN" on the sign-in page.', p)) + '">Invite</a>' : '') + '</div>'; }).join('') || '<div class="muted small">Everyone has signed in 🎉</div>') + '</div>' :
          '<div class="card">' + (list.map(function (p) { return '<div class="row"><span class="odot' + (p.online ? '' : ' off') + '"></span><div class="meta"><b>' + esc(p.name) + '</b><span>' + esc([p.title, p.unit].filter(String).join(' · ')) + ' · ' + (p.device === 'App' ? '📱 Phone app' : '💻 Web') + (p.online ? ' · active now' : ' · last seen ' + ago(p.mins) + ' ago') + '</span></div><button class="btn ghost sm" data-chatwith="' + esc(p.name) + '">💬</button></div>'; }).join('') || '<div class="muted small">Nobody here right now.</div>') + '</div>') +
        '<p class="small muted">Super Admins and pastors see everyone; leaders see their own team; members see online dots in chat only. Anyone can hide their status in Appearance &amp; account.</p>';
    }).catch(function (e) { if (!gone()) T.fail(v, e); });
  } };
  // ---------- PIN requests (Super Admin; leaders for their own members) ----------
  P.adminPins = function (box, gone) {
    return T.api('pinList').then(function (d) {
      if (gone && gone()) return;
      box.innerHTML = '<p class="small muted">People who tapped “Forgot PIN” or “First time” and had no email for a code. Check it is really them (a quick call helps), then approve: they choose their own PIN on their phone.</p>' +
        (d.requests.map(function (r) { return '<div class="card"><div class="row" style="padding:0"><div class="av">' + esc(T.ini(r.name)) + '</div><div class="meta"><b>' + esc(r.name) + '</b><span>' + esc(r.kind) + ' · ' + esc(r.about) + ' · ' + T.fmt(r.created) + '</span></div></div>' +
          '<div class="small" style="margin:8px 0">Phone given: <b>' + esc(r.phone) + '</b> ' + (r.match ? '<span class="tag green">matches their record</span>' : '<span class="tag red">does not match</span>') + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn ghost sm" href="' + P.telLink(r.phone) + '">📞 Call to confirm</a><button class="btn sm" data-pinok="' + esc(r.id) + '">Approve</button><button class="btn ghost sm" data-pinno="' + esc(r.id) + '" style="color:var(--red)">Decline</button></div></div>'; }).join('') || '<div class="card muted">No PIN requests waiting.</div>');
    });
  };
  // ---------- approval routes (Super Admin) ----------
  var R = { data: null, type: '', edit: null };
  P.adminRules = function (box, gone) {
    return T.api('rulesGet').then(function (d) {
      if (gone && gone()) return; R.data = d; R.type = R.type && d.types.indexOf(R.type) >= 0 ? R.type : d.types[0]; R.edit = null; drawRules(box);
    });
  };
  function rulesFor(t) { return JSON.parse(JSON.stringify(R.data.rules.filter(function (r) { return r.type === t; }))); }
  function sentence(r) {
    var a = r.steps.filter(function (s) { return s.mode !== 'inform'; }).map(function (s) { return s.label; }), i = r.steps.filter(function (s) { return s.mode === 'inform'; }).map(function (s) { return s.label; });
    return (r.who === 'Anyone' ? 'Anyone’s' : (/^[AEIOU]/.test(r.who) ? 'An ' : 'A ') + r.who + '’s') + ' ' + R.type.toLowerCase() + ' request goes to ' + (a.join(r.one ? ' (the first approval is enough), then ' : ', then ') || 'nobody') + (i.length ? '. ' + i.join(', ') + (i.length > 1 ? ' are' : ' is') + ' told' : '') + '.';
  }
  function drawRules(box) {
    box = box || $('abox'); var d = R.data; R.edit = R.edit || rulesFor(R.type);
    var fixed = (d.fixed.filter(function (f) { return f.type === R.type; })[0] || { steps: [] }).steps;
    box.innerHTML = '<p class="small muted">Who approves each kind of request, depending on who is asking. Mark a step <b>Inform only</b> when someone just needs to know (for example, so someone in church knows where a person is). Tick <b>One approval is enough</b> when one yes is all that is needed.</p>' +
      '<div class="tools"><select class="inp" id="rtype" style="width:auto">' + T.opts(d.types, R.type) + '</select><span class="sp" style="flex:1"></span><button class="btn sm" id="rsave">Save ' + esc(R.type) + ' routes</button></div>' +
      R.edit.map(function (r, i) {
        return '<div class="card"><div class="small muted" style="font-weight:800">IF THE PERSON ASKING IS</div><div style="display:flex;gap:8px;margin:6px 0 10px"><select class="inp" data-rwho="' + i + '">' + T.opts(d.requesters, r.who) + '</select><button class="btn ghost sm" data-rdel="' + i + '" style="color:var(--red)" aria-label="Remove rule">✕</button></div>' +
          '<div class="small muted" style="font-weight:800">STEPS</div>' + r.steps.map(function (s, j) {
            return '<div style="display:flex;gap:6px;align-items:center;margin:6px 0"><b style="width:18px">' + (j + 1) + '.</b><input class="inp" list="rwho" data-rl="' + i + ',' + j + '" value="' + esc(s.label) + '" style="flex:1"><select class="inp" data-rm="' + i + ',' + j + '" style="width:auto">' + T.opts([{ v: 'approve', l: 'Approves' }, { v: 'inform', l: 'Inform only' }], s.mode) + '</select><button class="btn ghost sm" data-rsdel="' + i + ',' + j + '" aria-label="Remove step">✕</button></div>';
          }).join('') + '<button class="btn ghost sm" data-radd="' + i + '">＋ Add a step</button>' +
          '<label class="chk"><input type="checkbox" data-rone="' + i + '"' + (r.one ? ' checked' : '') + '> One approval is enough (later steps are just told)</label>' +
          '<div style="background:var(--teal-l);border-radius:12px;padding:9px 11px;font-size:12.5px;margin-top:10px">💡 ' + esc(sentence(r)) + '</div></div>';
      }).join('') + '<datalist id="rwho">' + d.who.map(function (w) { return '<option value="' + esc(w) + '">'; }).join('') + '<option value="Any one of: Resident Pastor, Assistant Resident Pastor"></datalist>' +
      '<button class="btn ghost" style="width:100%" id="rnew">＋ Add a rule for another kind of person</button>' +
      '<p class="small muted">No rule for someone? ' + (fixed.length ? 'They follow the older fixed steps: ' + esc(fixed.join(' → ')) + '.' : 'It goes to the Resident Pastor.') + ' A step is skipped if it would land on the person asking. You can type a person’s name, an approver title, or several people separated by commas (whoever answers first decides).</p>';
  }
  document.addEventListener('change', function (e) {
    var t = e.target, x; if (!R.edit || !t.closest('#abox')) return;
    if (t.id === 'rtype') { R.type = t.value; R.edit = null; drawRules(); return; }
    if ((x = t.dataset.rwho) != null) { R.edit[+x].who = t.value; drawRules(); return; }
    if (t.dataset.rl) { var a = t.dataset.rl.split(','); R.edit[+a[0]].steps[+a[1]].label = t.value.trim(); drawRules(); return; }
    if (t.dataset.rm) { var b = t.dataset.rm.split(','); R.edit[+b[0]].steps[+b[1]].mode = t.value; drawRules(); return; }
    if ((x = t.dataset.rone) != null) { R.edit[+x].one = t.checked; drawRules(); }
  });
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-onf]'))) { ONF = x.dataset.onf; P.app.render(); return; }
    if ((x = t.closest('[data-chatwith]'))) { if (P.openChatWith) P.openChatWith(x.dataset.chatwith); else P.app.go('chat'); return; }
    if ((x = t.closest('[data-pinok]')) || (x = t.closest('[data-pinno]'))) {
      var ok = !!x.dataset.pinok; if (!ok && !window.confirm('Decline this request?')) return; T.busy(x, true);
      T.api('pinDecide', { id: x.dataset.pinok || x.dataset.pinno, approve: ok }).then(function () { P.toast(ok ? 'Approved: they can now choose their PIN' : 'Declined'); P.app.render(); }).catch(function (e2) { T.busy(x, false); P.toast(e2.message); }); return;
    }
    if (!R.edit || !t.closest('#abox')) return;
    if (t.id === 'rnew') { var used = R.edit.map(function (r) { return r.who; }), who = R.data.requesters.filter(function (w) { return used.indexOf(w) < 0; })[0] || 'Anyone'; R.edit.push({ type: R.type, who: who, steps: [{ label: 'Resident Pastor', mode: 'approve' }], one: true }); drawRules(); return; }
    if ((x = t.closest('[data-rdel]'))) { R.edit.splice(+x.dataset.rdel, 1); drawRules(); return; }
    if ((x = t.closest('[data-radd]'))) { R.edit[+x.dataset.radd].steps.push({ label: 'Resident Pastor', mode: 'inform' }); drawRules(); return; }
    if ((x = t.closest('[data-rsdel]'))) { var c = x.dataset.rsdel.split(','); R.edit[+c[0]].steps.splice(+c[1], 1); drawRules(); return; }
    if (t.id === 'rsave') { T.busy(t, true); T.api('rulesSave', { type: R.type, rules: R.edit }).then(function () { P.toast('Saved ✓'); return T.api('rulesGet'); }).then(function (d) { R.data = d; R.edit = null; drawRules(); }).catch(function (e2) { T.busy(t, false); P.toast(e2.message); }); }
  });
})();
