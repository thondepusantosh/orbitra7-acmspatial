/* ==========================================================================
   ORBITRA7 — shared behaviour (homepage + registration)
   ========================================================================== */
(() => {
  'use strict';

  const C = window.ORBITRA7 || {};
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const ORB = (window.ORB = { reduced, finePointer });

  /* ---------- Backend (Google Apps Script Web App) ---------- */
  ORB.backendReady = () => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(C.APPS_SCRIPT_URL || '');

  async function request(url, init, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...init, redirect: 'follow', signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  ORB.get = () => {
    const url = new URL(C.APPS_SCRIPT_URL);
    url.searchParams.set('t', Date.now()); // bypass caches
    return request(url, { method: 'GET' }, 15000);
  };

  // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight.
  ORB.post = (data, timeout = 90000) =>
    request(C.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
    }, timeout);

  ORB.fetchSeats = async () => {
    if (!ORB.backendReady()) return null;
    try {
      const r = await ORB.get();
      const max = Number(r.max) || C.MAX_TEAMS || 35;
      return { registered: Math.min(Number(r.registered) || 0, max), max };
    } catch (err) {
      return null;
    }
  };

  /* ---------- Canvas helper ---------- */
  ORB.fitCanvas = (canvas, maxDpr = 2) => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  };

  /* ---------- Scroll reveal ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Floating nav shrinks on scroll ---------- */
  const nav = document.getElementById('nav');
  if (nav) {
    let scrolled = false;
    const onScroll = () => {
      const s = window.scrollY > 24;
      if (s !== scrolled) nav.classList.toggle('is-scrolled', (scrolled = s));
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Specular sheen follows the pointer ---------- */
  if (finePointer && !reduced) {
    let raf = 0;
    let last = null;
    document.addEventListener('pointermove', (e) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const card = last.target.closest && last.target.closest('[data-sheen]');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (((last.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (((last.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      });
    }, { passive: true });
  }

  /* ---------- Disabled links ---------- */
  document.addEventListener('click', (e) => {
    if (e.target.closest('a[aria-disabled="true"]')) e.preventDefault();
  });

  /* ---------- Page cross-fade (fallback for browsers without cross-document View Transitions) ---------- */
  if (!reduced && !('PageRevealEvent' in window)) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-transition]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.getAttribute('aria-disabled') === 'true') return;
      e.preventDefault();
      root.classList.add('is-leaving');
      setTimeout(() => { location.href = a.href; }, 280);
    });
    addEventListener('pageshow', (e) => {
      if (e.persisted) root.classList.remove('is-leaving');
    });
  }
})();
