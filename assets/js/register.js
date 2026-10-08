/* ==========================================================================
   ORBITRA7 — registration page
   multi-step form · validation · payment · submit · success · star field
   ========================================================================== */
(() => {
  'use strict';

  const C = window.ORBITRA7;
  const ORB = window.ORB;
  const byId = (id) => document.getElementById(id);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const TRACKS = {
    1: 'Next-Generation Mobile and Web-Based Geospatial Solutions',
    2: 'Intelligent Geospatial Data Processing Using AI and Machine Learning',
  };
  const YEARS = ['First', 'Second', 'Third', 'Fourth'];
  const BRANCHES = ['AIML', 'AIDS', 'IT', 'CSE', 'ECE', 'EEE', 'EIE', 'CIVIL', 'MECHANICAL'];
  const MEMBER_FIELDS = ['name', 'roll', 'year', 'branch', 'section', 'phone', 'email'];
  const STEP_NAMES = ['Track', 'Team', 'Members', 'Payment'];
  const MAX_SHOT_BYTES = 5 * 1024 * 1024;
  const DRAFT_KEY = 'orbitra7:draft';
  const DONE_KEY = 'orbitra7:registration';

  // Same rules are enforced again by the Apps Script backend.
  const RE = {
    teamName: /^[A-Za-z0-9][A-Za-z0-9 .&'_-]{1,39}$/,
    name: /^[A-Za-z][A-Za-z .'-]{1,59}$/,
    roll: /^[A-Z0-9][A-Z0-9/-]{3,19}$/,
    phone: /^[6-9]\d{9}$/,
    gmail: /^[a-z0-9][a-z0-9._+-]{0,63}@gmail\.com$/,
    utr: /^[A-Z0-9]{10,35}$/,
    section: /^[A-Z0-9][A-Z0-9 -]{0,9}$/,
  };

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } },
  };

  const form = byId('reg-form');
  const panel = byId('form-panel');
  const nextBtn = byId('next');
  const backBtn = byId('back');
  const nextLabel = byId('next-label');
  const formError = byId('form-error');
  const membersEl = byId('members');
  const drop = byId('drop');
  const shotInput = byId('shot');

  let step = 1;
  let busy = false;
  let shotFile = null;
  let previewUrl = '';

  /* ---------- Member cards (5 built once; extra ones hidden so typed data survives size changes) ---------- */
  const field = (id, label, control, extra = '') =>
    `<div class="field"><label class="label" for="${id}">${label}</label>${control}${extra}<p class="err" id="${id}-err" aria-live="polite"></p></div>`;
  const options = (list, placeholder) =>
    `<option value="" selected disabled hidden>${placeholder}</option>` + list.map((v) => `<option value="${v}">${v}</option>`).join('');

  function memberCard(n) {
    const p = `m${n}`;
    const lead = n === 1;
    return `
      <fieldset class="member" id="${p}" hidden>
        <legend class="member__head"><span class="member__no">${n}</span>Member ${n}${lead ? ' <span class="chip chip--leader">Team Leader</span>' : ''}</legend>
        <div class="grid-2">
          ${field(`${p}-name`, 'Full Name', `<input class="input" id="${p}-name" type="text" maxlength="60" autocomplete="${lead ? 'name' : 'off'}" required>`)}
          ${field(`${p}-roll`, 'Roll Number', `<input class="input input--upper" id="${p}-roll" type="text" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" required>`)}
          ${field(`${p}-year`, 'Year of Study', `<select class="select" id="${p}-year" required>${options(YEARS, 'Select year')}</select>`)}
          ${field(`${p}-branch`, 'Branch', `<select class="select" id="${p}-branch" required>${options(BRANCHES, 'Select branch')}</select>`)}
          ${field(`${p}-section`, 'Class Section', `<input class="input input--upper" id="${p}-section" type="text" maxlength="10" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. A" required>`)}
          ${field(`${p}-phone`, 'Phone Number', `<input class="input" id="${p}-phone" type="tel" inputmode="numeric" autocomplete="${lead ? 'tel-national' : 'off'}" placeholder="10-digit mobile number" required>`)}
          ${field(`${p}-email`, 'Gmail Address', `<input class="input" id="${p}-email" type="email" inputmode="email" maxlength="80" autocomplete="${lead ? 'email' : 'off'}" autocapitalize="off" spellcheck="false" placeholder="name@gmail.com" required>`)}
        </div>
      </fieldset>`;
  }
  membersEl.innerHTML = [1, 2, 3, 4, 5].map(memberCard).join('');

  // point every control at its error (and hint) text
  $$('.input, .select', form).forEach((el) => {
    const ids = [el.id + '-err'];
    if (byId(el.id + '-hint')) ids.unshift(el.id + '-hint');
    el.setAttribute('aria-describedby', ids.join(' '));
  });
  shotInput.setAttribute('aria-describedby', 'shot-hint shot-err');

  /* ---------- Reading values ---------- */
  const raw = (id) => (byId(id).value || '').trim();
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const teamSize = () => Number(byId('team-size').value) || 0;
  const track = () => Number(($('input[name="track"]:checked', form) || {}).value) || 0;

  const member = (n) => ({
    name: clean(raw(`m${n}-name`)),
    roll: raw(`m${n}-roll`).toUpperCase().replace(/\s+/g, ''),
    year: byId(`m${n}-year`).value,
    branch: byId(`m${n}-branch`).value,
    phone: raw(`m${n}-phone`).replace(/\D/g, ''),
    email: raw(`m${n}-email`).toLowerCase(),
    section: raw(`m${n}-section`).toUpperCase().replace(/\s+/g, ' '),
  });

  const collect = () => {
    const size = teamSize();
    return {
      track: track(),
      teamSize: size,
      teamName: clean(raw('team-name')),
      members: Array.from({ length: size }, (_, i) => member(i + 1)),
      utr: raw('utr').replace(/\s+/g, '').toUpperCase(),
    };
  };

  /* ---------- Validation ---------- */
  function fieldError(id) {
    switch (id) {
      case 'track': return track() ? '' : 'Please choose a track to continue.';
      case 'team-size': return teamSize() ? '' : 'Select your team size.';
      case 'team-name': {
        const v = clean(raw(id));
        if (!v) return 'Enter a team name.';
        return RE.teamName.test(v) ? '' : "Use 2–40 characters: letters, numbers, spaces and . & ' _ -";
      }
      case 'utr': {
        const v = raw(id).replace(/\s+/g, '').toUpperCase();
        if (!v) return 'Enter the UPI Transaction ID / UTR number.';
        return RE.utr.test(v) ? '' : 'That doesn’t look right. The UTR / UPI Ref No. is usually 12 digits.';
      }
      case 'shot': return shotFile ? '' : 'Upload your payment screenshot.';
    }
    const m = /^m(\d)-(\w+)$/.exec(id);
    if (!m) return '';
    const mem = member(Number(m[1]));
    const v = mem[m[2]];
    switch (m[2]) {
      case 'name': return !v ? 'Enter full name.' : RE.name.test(v) ? '' : 'Use letters, spaces and dots only.';
      case 'roll': return !v ? 'Enter roll number.' : RE.roll.test(v) ? '' : 'Enter a valid roll number (letters and digits, 4–20 characters).';
      case 'year': return v ? '' : 'Select year of study.';
      case 'branch':
        return v ? '' : 'Select branch.';
      case 'section': return !v ? 'Enter class section.' : RE.section.test(v) ? '' : 'Enter a valid section, e.g. A or B.';
      case 'phone': return !v ? 'Enter phone number.' : RE.phone.test(v) ? '' : 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
      case 'email': return !v ? 'Enter Gmail address.' : RE.gmail.test(v) ? '' : 'Enter a valid Gmail address ending with @gmail.com.';
    }
    return '';
  }

  // roll numbers and phone numbers must not repeat within a team
  function duplicates() {
    const out = [];
    const seen = { roll: {}, phone: {} };
    const labels = { roll: 'roll number', phone: 'phone number' };
    for (let n = 1; n <= teamSize(); n++) {
      const mem = member(n);
      for (const k of ['roll', 'phone']) {
        const v = mem[k];
        if (!v) continue;
        if (seen[k][v]) out.push([`m${n}-${k}`, `Same ${labels[k]} as Member ${seen[k][v]}. Each member needs their own.`]);
        else seen[k][v] = n;
      }
    }
    return out;
  }
  const duplicateError = (id) => (duplicates().find(([d]) => d === id) || [])[1] || '';

  function setErr(id, msg) {
    const out = byId(id + '-err');
    if (out) out.textContent = msg || '';
    const el = id === 'shot' ? drop : byId(id);
    if (el) {
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
    if (id === 'shot') drop.classList.toggle('is-invalid', !!msg);
    return !msg;
  }

  function stepFields(s) {
    if (s === 1) return ['track'];
    if (s === 2) return ['team-size', 'team-name'];
    if (s === 4) return ['utr', 'shot'];
    const ids = [];
    for (let n = 1; n <= teamSize(); n++) MEMBER_FIELDS.forEach((f) => ids.push(`m${n}-${f}`));
    return ids;
  }

  function focusField(id) {
    const el = id === 'track' ? $('input[name="track"]', form) : byId(id);
    const target = id === 'track' ? byId('track') : id === 'shot' ? drop : el;
    if (el) el.focus({ preventScroll: true });
    if (target) target.scrollIntoView({ behavior: ORB.reduced ? 'auto' : 'smooth', block: 'center' });
  }

  function validateStep(s, focus = true) {
    let first = null;
    stepFields(s).forEach((id) => {
      if (!setErr(id, fieldError(id)) && !first) first = id;
    });
    if (s === 3) {
      duplicates().forEach(([id, msg]) => {
        if (byId(id + '-err').textContent) return;
        setErr(id, msg);
        if (!first) first = id;
      });
    }
    if (first && focus) focusField(first);
    return !first;
  }

  /* ---------- Team size → member cards, fee, QR ---------- */
  const qrImg = byId('qr-img');
  const saveQr = byId('save-qr');

  function onSizeChange() {
    const size = teamSize();
    $$('.member', membersEl).forEach((card, i) => {
      const show = i < size;
      if (show && card.hidden) {
        card.hidden = false;
        if (step === 3) {
          card.classList.remove('is-new');
          void card.offsetWidth; // restart the entrance animation
          card.classList.add('is-new');
        }
      } else if (!show) {
        card.hidden = true;
      }
    });

    const pay = C.PAYMENT[size];
    byId('fee').hidden = !pay;
    byId('members-count').textContent = `${size} members`;
    if (!pay) return;
    byId('fee-calc').textContent = `₹250 × ${size} members`;
    byId('fee-total').textContent = `₹${pay.amount}`;
    // only the QR that matches the chosen team size is ever shown
    if (qrImg.getAttribute('src') !== pay.qr) qrImg.src = pay.qr;
    qrImg.alt = `UPI QR code to pay ₹${pay.amount} to ${C.UPI_ID}`;
    byId('pay-amount').textContent = `₹${pay.amount}`;
    saveQr.href = pay.download;
    saveQr.setAttribute('download', `ORBITRA7-UPI-QR-${pay.amount}.jpg`);
  }

  /* ---------- Steps ---------- */
  function goTo(n, dir = 0) {
    step = n;
    form.style.setProperty('--dir', dir < 0 ? '-32px' : '32px');
    $$('.step', form).forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    $$('.progress__item', panel).forEach((li, i) => {
      li.classList.toggle('is-done', i + 1 < n);
      li.classList.toggle('is-current', i + 1 === n);
      if (i + 1 === n) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    byId('step-count').textContent = `Step ${n} of 4 · ${STEP_NAMES[n - 1]}`;
    backBtn.hidden = n === 1;
    nextLabel.textContent = n === 4 ? 'Complete Registration' : 'Continue';
    saveDraft();

    if (dir) {
      const top = panel.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.4) panel.scrollIntoView({ behavior: ORB.reduced ? 'auto' : 'smooth', block: 'start' });
      const title = $(`.step[data-step="${n}"] .step__title`, form);
      if (title) title.focus({ preventScroll: true });
    }
  }

  function setBusy(on, label) {
    busy = on;
    nextBtn.disabled = on;
    backBtn.disabled = on;
    nextBtn.classList.toggle('is-busy', on);
    byId('next-spinner').hidden = !on;
    nextLabel.textContent = on ? label : step === 4 ? 'Complete Registration' : 'Continue';
    form.setAttribute('aria-busy', String(on));
  }

  function showFormError(msg) {
    formError.textContent = msg;
    formError.hidden = !msg;
  }

  // Ask the backend early (before payment) whether the team name / roll numbers are free.
  async function checkAvailability(s) {
    const d = collect();
    let r;
    try {
      r = await ORB.post({ action: 'check', teamName: d.teamName, rolls: s === 3 ? d.members.map((m) => m.roll) : [] }, 20000);
    } catch (err) {
      return true; // can't verify right now — the server re-checks on submit
    }
    if (!r || r.success === false) return true;
    if (r.closed) return 'closed';
    let first = null;
    if (r.teamNameTaken) {
      if (step !== 2) goTo(2, -1);
      setErr('team-name', 'This team name is already taken. Please choose another.');
      first = 'team-name';
    } else {
      (r.takenRolls || []).forEach((roll) => {
        d.members.forEach((m, i) => {
          if (m.roll !== roll) return;
          setErr(`m${i + 1}-roll`, 'This roll number is already registered in another team.');
          first = first || `m${i + 1}-roll`;
        });
      });
    }
    if (first) focusField(first);
    return !first;
  }

  async function next() {
    showFormError('');
    if (!validateStep(step)) return;
    if ((step === 2 || step === 3) && ORB.backendReady()) {
      setBusy(true, 'Checking…');
      let ok;
      try { ok = await checkAvailability(step); } finally { setBusy(false); }
      if (ok === 'closed') return showClosed();
      if (!ok) return;
    }
    goTo(step + 1, 1);
  }

  /* ---------- Screenshot ---------- */
  function clearShot() {
    shotFile = null;
    shotInput.value = '';
    drop.classList.remove('has-file');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }

  function onShot(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      clearShot();
      return setErr('shot', 'Please upload a JPG or PNG image.');
    }
    if (file.size > MAX_SHOT_BYTES) {
      clearShot();
      return setErr('shot', 'This image is larger than 5 MB. Please upload a smaller screenshot.');
    }
    shotFile = file;
    setErr('shot', '');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    byId('shot-preview').src = previewUrl;
    byId('shot-name').textContent = `${file.name} · ${(file.size / 1048576).toFixed(1)} MB`;
    drop.classList.add('has-file');
  }

  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-drag'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-drag'); }));
  drop.addEventListener('drop', (e) => onShot(e.dataTransfer.files[0]));

  // Re-encode as JPEG (max 1800px) so uploads stay small and quick on mobile data.
  function toJpegDataUrl(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable image')); };
      img.src = url;
    });
  }

  /* ---------- Submit ---------- */
  async function submit() {
    showFormError('');
    for (let s = 1; s <= 4; s++) {
      if (validateStep(s, false)) continue;
      if (s !== step) goTo(s, -1);
      validateStep(s, true);
      return;
    }
    if (!ORB.backendReady()) {
      showFormError('Registration is not connected to the server yet. Please try again shortly.');
      return;
    }

    setBusy(true, 'Uploading…');
    try {
      const data = collect();
      let screenshot;
      try {
        screenshot = await toJpegDataUrl(shotFile);
      } catch (err) {
        setErr('shot', 'We couldn’t read this image. Please upload a different screenshot.');
        return;
      }
      const res = await ORB.post({ action: 'register', ...data, amount: C.PAYMENT[data.teamSize].amount, screenshot });
      if (res && res.success) {
        showSuccess(res, true);
        return;
      }
      handleServerError(res || {});
    } catch (err) {
      showFormError(err && err.name === 'AbortError'
        ? 'The server took too long to respond. Check your connection and submit again — your details are saved.'
        : 'Couldn’t reach the registration server. Check your connection and try again — your details are saved.');
    } finally {
      setBusy(false);
    }
  }

  function handleServerError(res) {
    const msg = res.message || 'Registration failed. Please try again.';
    const paid = ' You don’t need to pay again — fix this and submit.';
    switch (res.field) {
      case 'closed':
        showClosed(msg);
        return;
      case 'teamName':
        goTo(2, -1);
        setErr('team-name', msg);
        showFormError(msg + paid);
        focusField('team-name');
        return;
      case 'roll': {
        goTo(3, -1);
        let first = null;
        (res.rolls || []).forEach((roll) => {
          for (let n = 1; n <= teamSize(); n++) {
            if (member(n).roll !== roll) continue;
            setErr(`m${n}-roll`, 'This roll number is already registered in another team.');
            first = first || `m${n}-roll`;
          }
        });
        showFormError(msg + paid);
        if (first) focusField(first);
        return;
      }
      case 'track':
        goTo(1, -1);
        break;
      case 'teamSize':
      case 'members':
        goTo(3, -1);
        break;
      case 'utr':
        setErr('utr', msg);
        break;
      case 'screenshot':
        setErr('shot', msg);
        break;
    }
    showFormError(msg);
  }

  /* ---------- Success / closed ---------- */
  function showSuccess(r, fresh) {
    byId('s-team').textContent = r.teamName;
    byId('s-id').textContent = r.teamId || '—';
    byId('s-track').textContent = `Track 0${r.track} · ${TRACKS[r.track] || ''}`;
    byId('s-size').textContent = `${r.teamSize} members`;
    byId('s-amount').textContent = `₹${r.amount}`;

    const wa = byId('wa-link');
    if (/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(r.whatsappLink || '')) {
      wa.href = r.whatsappLink;
      wa.removeAttribute('aria-disabled');
    } else {
      wa.removeAttribute('href');
      wa.setAttribute('aria-disabled', 'true');
      byId('wa-label').textContent = 'Group link coming soon';
    }

    panel.hidden = true;
    byId('reg-head').hidden = true;
    byId('closed').hidden = true;
    byId('success-wrap').hidden = false;
    if (fresh) {
      store.set(DONE_KEY, r);
      store.del(DRAFT_KEY);
    }
    window.scrollTo({ top: 0, behavior: ORB.reduced ? 'auto' : 'smooth' });
    byId('success-title').focus({ preventScroll: true });
  }

  function showClosed(message) {
    if (message) byId('closed-msg').textContent = message;
    panel.hidden = true;
    byId('reg-head').hidden = true;
    byId('closed').hidden = false;
  }

  byId('register-another').addEventListener('click', () => {
    store.del(DONE_KEY);
    location.replace(location.pathname);
  });

  /* ---------- Draft (survives the tab reloading while you pay in a UPI app) ---------- */
  let saveTimer = 0;
  const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 300); };

  function saveDraft() {
    if (panel.hidden) return;
    store.set(DRAFT_KEY, {
      step,
      track: track(),
      teamSize: teamSize(),
      teamName: byId('team-name').value,
      utr: byId('utr').value,
      members: [1, 2, 3, 4, 5].map((n) => {
        const o = {};
        MEMBER_FIELDS.forEach((f) => { o[f] = byId(`m${n}-${f}`).value; });
        return o;
      }),
    });
  }

  function restoreDraft() {
    const d = store.get(DRAFT_KEY);
    if (!d) return 1;
    const t = $(`input[name="track"][value="${Number(d.track)}"]`, form);
    if (t) t.checked = true;
    if (C.PAYMENT[d.teamSize]) byId('team-size').value = String(d.teamSize);
    byId('team-name').value = d.teamName || '';
    byId('utr').value = d.utr || '';
    (d.members || []).slice(0, 5).forEach((m, i) => {
      MEMBER_FIELDS.forEach((f) => { if (typeof m[f] === 'string') byId(`m${i + 1}-${f}`).value = m[f]; });
    });
    return Math.min(Math.max(Number(d.step) || 1, 1), 4);
  }

  /* ---------- Events ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return;
    if (step < 4) next();
    else submit();
  });

  backBtn.addEventListener('click', () => {
    if (busy || step === 1) return;
    showFormError('');
    goTo(step - 1, -1);
  });

  byId('change-size').addEventListener('click', () => {
    goTo(2, -1);
    byId('team-size').focus();
  });

  form.addEventListener('input', (e) => {
    const el = e.target;
    if (/-phone$/.test(el.id)) {
      let d = el.value.replace(/\D/g, '');
      if (d.length > 10 && d.startsWith('91')) d = d.slice(2); // pasted +91 numbers
      if (el.value !== d.slice(0, 10)) el.value = d.slice(0, 10);
    }
    // clear an error as soon as the field becomes valid (new errors wait for blur)
    if (el.id && el.getAttribute('aria-invalid') === 'true' && !fieldError(el.id) && !duplicateError(el.id)) setErr(el.id, '');
    scheduleSave();
  });

  form.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el.matches('.input') || !el.value.trim()) return;
    setErr(el.id, fieldError(el.id) || duplicateError(el.id));
  });

  form.addEventListener('change', (e) => {
    const el = e.target;
    if (el.name === 'track') setErr('track', '');
    if (el.id === 'team-size') onSizeChange();
    if (el.matches('.select')) setErr(el.id, fieldError(el.id));
    if (el === shotInput) onShot(el.files[0]);
    scheduleSave();
  });

  byId('copy-upi').addEventListener('click', async (e) => {
    const label = e.currentTarget.querySelector('[data-label]');
    try {
      await navigator.clipboard.writeText(C.UPI_ID);
      label.textContent = 'Copied!';
    } catch (err) {
      label.textContent = C.UPI_ID;
    }
    setTimeout(() => { label.textContent = 'Copy UPI ID'; }, 2200);
  });

  const modal = byId('example-modal');
  byId('example-thumb').src = C.DEMO_SCREENSHOT;
  byId('example-img').src = C.DEMO_SCREENSHOT;
  byId('see-example').addEventListener('click', () => modal.showModal());
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.close();
  });

  /* ---------- Init ---------- */
  const done = store.get(DONE_KEY);
  if (done && done.teamName) {
    showSuccess(done, false);
  } else {
    let start = restoreDraft();
    const qTrack = new URLSearchParams(location.search).get('track');
    if (qTrack === '1' || qTrack === '2') $(`input[name="track"][value="${qTrack}"]`, form).checked = true;
    onSizeChange();
    for (let s = 1; s < start; s++) {
      if (!validateStep(s, false)) { start = s; break; }
    }
    goTo(start);

    ORB.fetchSeats().then((s) => {
      if (s && s.registered >= s.max && !panel.hidden) showClosed();
    });
  }

  /* ---------- Star field: slow drifting dust + gentle twinkle ---------- */
  const canvas = byId('stars');
  let ctx, W, H, stars = [];
  let raf = 0;
  let lastT = 0;

  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const sg = sprite.getContext('2d');
  const grad = sg.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(225,240,255,.8)');
  grad.addColorStop(1, 'rgba(159,212,255,0)');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 32, 32);

  const rand = (a, b) => a + Math.random() * (b - a);

  function initStars() {
    ({ ctx, w: W, h: H } = ORB.fitCanvas(canvas, 1.5));
    const count = W < 700 ? 110 : 250;
    stars = Array.from({ length: count }, () => {
      const big = Math.random() < 0.08;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        s: big ? rand(5, 8) : rand(2, 4.2), // sprite size in px
        a: rand(0.25, 0.85),
        tw: rand(0.5, 1.6),
        ph: rand(0, Math.PI * 2),
        vx: rand(-4, 4), // px per second
        vy: rand(-3, 2),
      };
    });
  }

  function drawStars(t, dt) {
    ctx.clearRect(0, 0, W, H);
    for (const st of stars) {
      if (dt) {
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        if (st.x < -10) st.x = W + 10; else if (st.x > W + 10) st.x = -10;
        if (st.y < -10) st.y = H + 10; else if (st.y > H + 10) st.y = -10;
      }
      ctx.globalAlpha = st.a * (0.6 + 0.4 * Math.sin(t * 0.001 * st.tw + st.ph));
      ctx.drawImage(sprite, st.x - st.s / 2, st.y - st.s / 2, st.s, st.s);
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    drawStars(t, dt);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf || ORB.reduced || document.hidden) return;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  initStars();
  if (ORB.reduced) drawStars(0, 0); // static sky
  else start();

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  let lastW = innerWidth;
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (Math.abs(innerWidth - lastW) < 40) return; // ignore mobile toolbar show/hide
      lastW = innerWidth;
      initStars();
      if (ORB.reduced) drawStars(0, 0);
    }, 200);
  });
})();
