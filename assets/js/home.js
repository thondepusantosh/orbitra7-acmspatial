/* ==========================================================================
   ORBITRA7 — homepage
   countdown · seats bar · live timeline · parallax · comets
   ========================================================================== */
(() => {
  'use strict';

  const C = window.ORBITRA7;
  const ORB = window.ORB;
  const $ = (id) => document.getElementById(id);
  const START = Date.parse(C.EVENT_START);
  const END = Date.parse(C.EVENT_END);
  const MAX = C.MAX_TEAMS || 35;

  /* ---------- Countdown ---------- */
  const cd = $('countdown');
  const cells = {};
  cd.querySelectorAll('[data-unit]').forEach((el) => { cells[el.dataset.unit] = el; });
  const shown = {};
  const pad = (n) => String(n).padStart(2, '0');

  function renderCountdown() {
    const now = Date.now();
    if (now >= START) {
      $('countdown-cap').hidden = true;
      cd.hidden = true;
      const live = $('countdown-live');
      live.hidden = false;
      live.querySelector('[data-label]').textContent = now >= END ? 'ORBITRA7 has wrapped up — thank you!' : 'Hackathon is Live!';
      live.querySelector('.pulse').hidden = now >= END;
      return;
    }
    const s = Math.floor((START - now) / 1000);
    const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    for (const k in v) {
      if (shown[k] !== v[k]) cells[k].textContent = pad((shown[k] = v[k]));
    }
  }
  (function tick() {
    renderCountdown();
    if (Date.now() < END) setTimeout(tick, 1000 - (Date.now() % 1000) + 10);
  })();

  /* ---------- Event-day timeline: highlight the active slot ---------- */
  const slots = document.querySelectorAll('.tl__item[data-start]');
  function renderTimeline() {
    const now = Date.now();
    slots.forEach((li) => {
      const s = Date.parse(li.dataset.start);
      const e = Date.parse(li.dataset.end);
      li.classList.toggle('is-active', now >= s && now < e);
      li.classList.toggle('is-done', now >= e);
    });
  }
  renderTimeline();
  setInterval(renderTimeline, 30000);

  /* ---------- Problem statements: locked until release, then downloadable ---------- */
  const PS = C.PROBLEM_STATEMENTS || {};
  const PS_RELEASE = Date.parse(PS.RELEASE || '2026-10-09T18:00:00+05:30');
  const psBox = document.querySelector('.ps');
  let psLast = '';

  function renderProblems() {
    const now = Date.now();
    const released = now >= PS_RELEASE;
    const links = { 1: (PS.TRACK_1 || '').trim(), 2: (PS.TRACK_2 || '').trim() };
    const anyLive = released && (links[1] || links[2]);
    const countdown = $('ps-countdown');

    if (!released) {
      const s = Math.floor((PS_RELEASE - now) / 1000);
      const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
      countdown.hidden = false;
      countdown.textContent = d > 0 ? `Unlocks in ${d}d ${h}h ${m}m` : `Unlocks in ${h}h ${m}m ${s % 60}s`;
    } else {
      countdown.hidden = true;
    }

    const state = `${released}|${links[1]}|${links[2]}`;
    if (state === psLast) return;
    psLast = state;

    psBox.classList.toggle('is-live', !!anyLive);
    $('ps-status').querySelector('.ps__status-icon').textContent = anyLive ? '✅' : '📢';
    $('ps-status-title').textContent = anyLive ? 'Problem statements are live!' : released ? 'Releasing today' : 'Releasing on 9th October 2026, 6:00 PM';
    $('ps-status-sub').textContent = anyLive
      ? 'Download the problem statement for your track below.'
      : released ? 'The files are being uploaded. Check back here shortly.' : 'The download buttons below unlock here automatically.';

    document.querySelectorAll('[data-ps-track]').forEach((card) => {
      const link = links[card.dataset.psTrack];
      const live = released && !!link;
      const old = card.querySelector('[data-ps-btn]');
      const btn = document.createElement(live ? 'a' : 'span');
      btn.className = 'btn ps__btn ' + (live ? 'btn--primary' : 'is-locked');
      btn.setAttribute('data-ps-btn', '');
      if (live) {
        btn.href = link;
        if (/^https?:/i.test(link)) { btn.target = '_blank'; btn.rel = 'noopener noreferrer'; } else btn.setAttribute('download', '');
      } else {
        btn.setAttribute('aria-disabled', 'true');
      }
      btn.innerHTML = `<svg class="icon icon--sm" aria-hidden="true"><use href="#i-${live ? 'download' : 'lock'}"/></svg><span>${live ? 'Download PDF' : released ? 'Coming shortly' : 'Unlocks 9 Oct, 6 PM'}</span>`;
      old.replaceWith(btn);
      card.querySelector('[data-ps-meta]').textContent = live ? 'Problem statement · ready to download' : 'Problem statement · PDF';
    });
  }
  if (psBox) {
    renderProblems();
    setInterval(renderProblems, 1000);
  }

  /* ---------- Seats: the count isn't shown, but Register buttons close once all slots are taken ---------- */
  function renderSeats(registered, max) {
    if (registered < max) return;
    $('cta-left').textContent = 'All 35 slots are taken. Thank you for the overwhelming response!';
    closeRegistrations();
  }

  function closeRegistrations() {
    document.querySelectorAll('[data-register]').forEach((el) => {
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('tabindex', '-1');
      el.classList.add('is-disabled');
      const label = el.querySelector('[data-label]');
      if (label && el.dataset.closedLabel) label.textContent = el.dataset.closedLabel;
    });
  }

  const SEATS_KEY = 'orbitra7:seats';
  try {
    const cached = JSON.parse(sessionStorage.getItem(SEATS_KEY));
    if (cached) renderSeats(cached.registered, cached.max);
  } catch (err) { /* storage unavailable */ }

  ORB.fetchSeats().then((s) => {
    if (!s) return;
    renderSeats(s.registered, s.max);
    try { sessionStorage.setItem(SEATS_KEY, JSON.stringify(s)); } catch (err) { /* ignore */ }
  });

  if (ORB.reduced) return; // everything below is motion

  /* ---------- Parallax: background drifts slower than content, follows the mouse slightly ---------- */
  const move = $('bg-move');
  const dim = $('bg-dim');
  const tgt = { x: 0, y: 0, p: 0, d: 0 };
  const cur = { x: 0, y: 0, p: 0, d: 0 };
  let praf = 0;

  function readScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    tgt.p = max > 0 ? scrollY / max : 0;
    tgt.d = Math.min(scrollY / innerHeight, 1);
  }
  function kick() { if (!praf) praf = requestAnimationFrame(step); }
  function step() {
    praf = 0;
    let moving = false;
    for (const k in cur) {
      const delta = tgt[k] - cur[k];
      if (Math.abs(delta) > 0.0004) { cur[k] += delta * 0.085; moving = true; } else cur[k] = tgt[k];
    }
    const y = -cur.y * 10 - cur.p * innerHeight * 0.05;
    move.style.transform = `translate3d(${(-cur.x * 16).toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    dim.style.opacity = (cur.d * 0.38).toFixed(3);
    if (moving) kick();
  }
  addEventListener('scroll', () => { readScroll(); kick(); }, { passive: true });
  addEventListener('resize', () => { readScroll(); kick(); }, { passive: true });
  if (ORB.finePointer) {
    addEventListener('pointermove', (e) => {
      tgt.x = e.clientX / innerWidth - 0.5;
      tgt.y = e.clientY / innerHeight - 0.5;
      kick();
    }, { passive: true });
  }
  readScroll();
  kick();

  /* ---------- Comets (lightweight canvas, idle between passes) ---------- */
  const canvas = $('comets');
  let ctx, W, H;
  let craf = 0;
  let lastT = 0;
  const comets = [];
  const rand = (a, b) => a + Math.random() * (b - a);

  function fit() { ({ ctx, w: W, h: H } = ORB.fitCanvas(canvas, 1.5)); }
  fit();
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(fit, 200); });

  function spawn(small) {
    const ang = (small ? rand(12, 24) : rand(20, 34)) * (Math.PI / 180); // below horizontal, heading left
    const crossMs = small ? rand(3000, 3800) : rand(2200, 3000);
    const speed = (Math.hypot(W, H) * 0.95) / crossMs; // px per ms
    const c = {
      x: W * rand(small ? 0.35 : 0.6, 1.05),
      y: H * rand(-0.06, small ? 0.3 : 0.2),
      vx: -Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      len: small ? rand(80, 130) : rand(190, 290),
      w: small ? 1 : 1.7,
      a: small ? 0.45 : 0.95,
      age: 0,
    };
    // life ends once the tail has left the screen
    c.life = Math.min((c.x + c.len) / -c.vx, (H + c.len - c.y) / c.vy);
    comets.push(c);
    if (!craf) { lastT = performance.now(); craf = requestAnimationFrame(frame); }
  }

  function drawComet(c) {
    const a = c.a * Math.max(0, Math.min(1, c.age / 280, (c.life - c.age) / 500));
    const sp = Math.hypot(c.vx, c.vy);
    const ux = c.vx / sp;
    const uy = c.vy / sp;
    const tx = c.x - ux * c.len;
    const ty = c.y - uy * c.len;

    // soft wide glow, then a bright narrow core
    for (const [wMul, aMul] of [[3.2, 0.22], [1, 1]]) {
      const nx = -uy * c.w * wMul;
      const ny = ux * c.w * wMul;
      const g = ctx.createLinearGradient(c.x, c.y, tx, ty);
      g.addColorStop(0, `rgba(238,247,255,${a * aMul})`);
      g.addColorStop(0.2, `rgba(159,212,255,${a * aMul * 0.45})`);
      g.addColorStop(1, 'rgba(159,212,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(c.x + nx, c.y + ny);
      ctx.lineTo(tx, ty);
      ctx.lineTo(c.x - nx, c.y - ny);
      ctx.closePath();
      ctx.fill();
    }
    const r = c.w * 7;
    const hg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    hg.addColorStop(0, `rgba(255,255,255,${a})`);
    hg.addColorStop(0.3, `rgba(200,232,255,${a * 0.5})`);
    hg.addColorStop(1, 'rgba(159,212,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(t) {
    const dt = Math.min(t - lastT, 50);
    lastT = t;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.age >= c.life) comets.splice(i, 1);
      else drawComet(c);
    }
    ctx.globalCompositeOperation = 'source-over';
    craf = comets.length ? requestAnimationFrame(frame) : 0;
  }

  // main comet every 8–12 s; a fainter one now and then
  (function scheduleMain() {
    setTimeout(() => { if (!document.hidden) spawn(false); scheduleMain(); }, rand(8000, 12000));
  })();
  (function scheduleSmall() {
    setTimeout(() => { if (!document.hidden && Math.random() < 0.65) spawn(true); scheduleSmall(); }, rand(14000, 30000));
  })();
  setTimeout(() => { if (!document.hidden) spawn(false); }, 2200);
})();
