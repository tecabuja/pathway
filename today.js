/* Pathway: Today, the first screen. A live greeting (clock, verse, a scene for the time of day) and cards for what needs this person now. */
(function () {
  var P = window.Pathway, T = P.T, esc = P.esc, $ = function (id) { return document.getElementById(id); };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var VERSES = ['This is the day the Lord has made; let us rejoice and be glad in it. Ps 118:24', 'His mercies are new every morning. Lam 3:23', 'Come, follow me, and I will make you fishers of men. Matt 4:19',
    'Be still, and know that I am God. Ps 46:10', 'The Lord is my shepherd; I shall not want. Ps 23:1', 'I can do all things through Christ who strengthens me. Phil 4:13', 'Let your light shine before others. Matt 5:16'];
  var FORCE = null;
  function part(h) { return h < 5 ? 'night' : h < 10 ? 'dawn' : h < 16 ? 'day' : h < 19 ? 'evening' : 'night'; }
  function svg(p) {
    var W = 1000, birds = '<g style="animation:fly 18s linear infinite"><path d="M0 0q5-5 10 0q5-5 10 0" stroke="#fff" fill="none" stroke-width="1.6"/><path d="M26 8q4-4 8 0q4-4 8 0" stroke="#fff" fill="none" stroke-width="1.4"/></g>';
    var cloud = function (y, d, s, o) { return '<g style="animation:drift ' + d + 's linear infinite;animation-delay:-' + o + 's"><g transform="translate(0,' + y + ') scale(' + s + ')" fill="#fff" opacity=".85"><ellipse cx="30" cy="20" rx="30" ry="14"/><ellipse cx="55" cy="14" rx="22" ry="14"/><ellipse cx="75" cy="22" rx="20" ry="11"/></g></g>'; };
    var hills = '<path d="M0 145 Q200 105 420 135 T1000 125 V170 H0Z" fill="rgba(0,0,0,.18)"/>', open = '<svg viewBox="0 0 ' + W + ' 170" preserveAspectRatio="xMaxYMid slice">';
    if (p === 'dawn') return '<div class="sky" style="background:linear-gradient(180deg,#F7B267,#F4845F 55%,#F25C54)"></div>' + open + '<g style="animation:rise 3s ease-out both"><circle cx="860" cy="135" r="34" fill="#FFE29A"/><circle cx="860" cy="135" r="50" fill="#FFE29A" opacity=".25"/></g>' + birds + hills + '</svg>';
    if (p === 'day') return '<div class="sky" style="background:linear-gradient(180deg,#4FA3E3,#8CCBF2)"></div>' + open + '<g style="transform-origin:880px 46px;animation:spin 40s linear infinite"><g fill="#FFD54F">' + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return '<rect x="877" y="4" width="6" height="14" rx="3" transform="rotate(' + a + ' 880 46)"/>'; }).join('') + '</g></g><circle cx="880" cy="46" r="24" fill="#FFD54F"/>' + cloud(60, 60, .8, 5) + cloud(25, 80, .6, 40) + hills + '</svg>';
    if (p === 'evening') return '<div class="sky" style="background:linear-gradient(180deg,#5B3C88,#E0607E 55%,#F9A26C)"></div>' + open + '<circle cx="640" cy="148" r="40" fill="#FFB86B" opacity=".9"/><g style="animation:wave 4s linear infinite"><path d="M0 145 ' + new Array(36).join('q15 -5 30 0 ') + 'V170 H0Z" fill="rgba(20,40,80,.45)"/></g>' +
      '<g style="transform-origin:860px 145px;animation:bob 3s ease-in-out infinite"><path d="M815 141 h80 l-12 14 h-56z" fill="#3B2A1F"/><rect x="853" y="113" width="3" height="28" fill="#3B2A1F"/><path d="M856 115 l22 22 h-22z" fill="#F4E9D8"/><circle cx="832" cy="129" r="5" fill="#3B2A1F"/><rect x="829" y="134" width="6" height="8" fill="#3B2A1F"/><path d="M835 133 L795 95" stroke="#3B2A1F" stroke-width="2"/><path d="M795 95 Q792 125 788 145" stroke="#fff" stroke-width=".8" fill="none" opacity=".8"/></g>' + birds + '</svg>';
    var st = ''; for (var i = 0; i < 40; i++) st += '<circle cx="' + (i * 89 % W) + '" cy="' + (8 + i * 37 % 110) + '" r="' + (i % 3 ? 1.2 : 1.8) + '" fill="#fff" style="animation:tw ' + (2 + i % 4) + 's ease-in-out infinite;animation-delay:-' + (i % 5) + 's"/>';
    return '<div class="sky" style="background:linear-gradient(180deg,#0B1D3A,#1F3A68)"></div>' + open + st + '<circle cx="880" cy="44" r="22" fill="#F4F1DE"/><circle cx="890" cy="38" r="20" fill="#14294B"/>' + hills + '</svg>';
  }
  function scene(name) {
    var n = new Date(), h = FORCE == null ? n.getHours() : FORCE, p = part(h), g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return '<div class="scene" id="scene" title="Tap to see other times of day">' + svg(p) + '<div class="txt"><div class="clock" id="clk">' + n.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</div>' +
      '<div class="gr">' + g + ', ' + esc(P.firstName(name) || 'friend') + ' ' + { dawn: '🌅', day: '☀️', evening: '🌇', night: '🌙' }[p] + '</div><div class="vs">' + n.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + VERSES[n.getDate() % VERSES.length] + '</div></div></div>';
  }
  setInterval(function () { var c = $('clk'); if (c) c.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }, 1000);
  function card(icon, bg, title, sub, go, attr) { return '<div class="card click act" ' + (attr || 'data-go="' + go + '"') + ' style="margin-bottom:10px"><div class="ic" style="background:' + bg + '">' + icon + '</div><div style="flex:1;min-width:0"><b>' + title + '</b><span>' + sub + '</span></div><span class="muted" style="font-size:20px">›</span></div>'; }
  var MON = function (d) { return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
  P.views.today = { title: 'Today', icon: ICON, render: function (v) {
    var u = T.user(), gone = T.guard(), saved = T.saved('today');
    var draw = function (d) {
      if (gone()) return;
      var h = scene(u.name), need = '', more = '', t = u.title || u.role, ticks = u.ticks || [];
      if (d.count && d.count.services.length) {
        var tot = d.count.services.reduce(function (s, x) { return s + x.total; }, 0), last = d.count.services[d.count.services.length - 1];
        h += '<div class="card click act" data-go="count" style="background:linear-gradient(135deg,var(--teal-d),var(--teal));color:#fff;border:0;margin-bottom:12px"><div class="ic" style="background:rgba(255,255,255,.15)">🔢</div><div style="flex:1"><b style="font-size:16px">Today’s count: ' + tot + '</b><span style="color:#fff;opacity:.85">' + esc(last.name) + ' · Round ' + last.round + ' · ' + last.done + '/' + last.of + ' sections' + (last.locked ? ' · locked' : '') + '</span></div><span style="font-size:20px">›</span></div>';
      } else if (d.canHead && new Date().getDay() === 0) h += '<div class="card" style="text-align:center;border:2px solid var(--gold)"><b style="font-size:18px">It’s Sunday</b><p class="small muted">Start today’s ushering count.</p><button class="btn gold" data-go="count">Start counting</button></div>';
      if (d.online) h += '<div class="kpis" style="margin-bottom:12px"><div class="card click" data-go="online"><div class="small muted">Online now</div><div style="font-size:26px;font-weight:800"><span class="odot"></span> ' + d.online.now + '</div><div class="small muted">' + d.online.app + ' on the phone app</div></div>' +
        (d.online.never ? '<div class="card click" data-go="online"><div class="small muted">Never signed in</div><div style="font-size:26px;font-weight:800">' + d.online.never + '</div><div class="small" style="color:var(--red)">Help them start ›</div></div>' : '') + '</div>';
      if (d.decide) need += card('✅', 'var(--gold-l)', d.decide + ' request' + (d.decide > 1 ? 's' : '') + ' waiting for you', 'Approve, decline or ask a question', 'requests');
      if (d.pins) need += card('🔑', 'var(--gold-l)', d.pins + ' PIN request' + (d.pins > 1 ? 's' : ''), 'People who forgot their PIN or are new', '', 'data-admin="pins"');
      if (d.tasks) need += card('📞', 'var(--red-l)', d.tasks + ' follow-up' + (d.tasks > 1 ? 's' : '') + ' due', 'Call or WhatsApp them today', 'tasks');
      if (d.prayers) need += card('🙏', 'var(--red-l)', d.prayers + ' new prayer request' + (d.prayers > 1 ? 's' : '') + ' this week', 'Only pastors can see these', 'people');
      (d.forms || []).forEach(function (f) { need += card('🗳️', 'var(--teal-l)', esc(f.title), (f.type === 'RSVP' ? 'Are you coming?' : 'Waiting for your answer') + (f.closes ? ' · closes ' + MON(f.closes) : ''), '', 'data-href="' + esc(/^https?:/.test(f.link) ? f.link : P.appBase() + 'answer.html?f=' + f.id) + '"'); });
      (d.grid || []).forEach(function (x) { need += card('📋', 'var(--teal-l)', 'Your part: ' + esc(x.description), MON(x.date) + ' · ' + esc(x.start) + (x.status === 'Notified' ? ' · please confirm' : ''), 'home'); });
      (d.duties || []).forEach(function (x) { need += card('⭐', 'var(--gold-l)', 'On duty: ' + esc(x.dept), MON(x.sunday) + ' · ' + esc(x.status), 'home'); });
      (d.games || []).forEach(function (g) { more += card('🎮', 'var(--teal-l)', esc(g.title) + ' is live', 'Join with PIN ' + esc(g.pin), '', 'data-href="play.html?pin=' + esc(g.pin) + '"'); });
      (d.birthdays || []).filter(function (b) { return b.inDays === 0; }).forEach(function (b) { more += card('🎂', 'var(--gold-l)', 'Birthday today: ' + esc(b.name), b.phone ? 'Tap to send a WhatsApp wish' : esc(b.group || ''), '', b.phone ? 'data-href="' + esc(P.waLink(b.phone, P.fill('Happy birthday {first}! 🎂🎉 We thank God for your life. From all of us at {church}.', b))) + '"' : 'data-go="messages"'); });
      (d.events || []).forEach(function (e) { more += card('🗓️', 'var(--teal-l)', esc(e.title), MON(e.start) + (e.time ? ' · ' + esc(e.time) : '') + (e.venue ? ' · ' + esc(e.venue) : ''), 'calendar'); });
      if (d.unread) more = card('🔔', 'var(--teal-l)', d.unread + ' new notice' + (d.unread > 1 ? 's' : ''), 'Tap the bell at the top to read them', '', 'data-bellgo="1"') + more;
      h += need ? '<div class="sec">Needs you</div>' + need : '<div class="card" style="margin-bottom:10px"><b>You’re all caught up ✨</b><div class="small muted">Nothing waiting for you right now.</div></div>';
      if (more) h += '<div class="sec">Coming up</div>' + more;
      h += '<div class="sec">Shortcuts</div><div class="tiles">' + P.navFor().slice(1, 9).map(function (k) { var it = P.views[k] ? [P.views[k].title] : [k]; return '<button class="tile" data-go="' + k + '"><span>' + esc(it[0]) + '</span></button>'; }).join('') + '</div>';
      v.innerHTML = h;
    };
    if (saved) draw(saved); else T.loading(v);
    T.api('today').then(function (d) { T.cache('today', d); P.badges = P.badges || {}; P.badges.unread = d.unread; P.badges.decide = d.decide; P.badges.duty = d.duty; P.app.nav(); draw(d); })
      .catch(function (e) { if (!saved && !gone()) T.fail(v, e); });
  } };
  document.addEventListener('click', function (e) {
    if (e.target.closest('#scene')) { var o = [7, 12, 18, 22], c = FORCE == null ? -1 : o.indexOf(FORCE); FORCE = o[(c + 1) % 4]; P.app.render(); P.toast(['Morning 🌅', 'Afternoon ☀️', 'Evening: fishers of men 🌇', 'Night 🌙'][(c + 1) % 4]); return; }
    if (e.target.closest('[data-bellgo]')) { var b = document.getElementById('bell'); if (b) b.click(); }
  });
})();
