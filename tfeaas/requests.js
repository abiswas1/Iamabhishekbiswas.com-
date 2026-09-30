(() => {
  const form = document.getElementById('case-request-form');
  if (!form) return;
  const API = 'https://abhishek-biswas-design.abhishek25789.chatgpt.site/api/tfe';
  const storageKey = 'tfe-request-receipt-v1';
  const gate = document.getElementById('case-access');
  const card = gate.querySelector('.case-access-card');
  const intro = document.getElementById('case-access-intro');
  const passwordForm = document.getElementById('case-access-form');
  const password = document.getElementById('case-password');
  const modeToggle = document.getElementById('case-access-mode');
  const description = document.getElementById('case-access-description');
  const availability = document.getElementById('case-request-availability');
  const section = document.getElementById('case-request-online');
  const status = document.getElementById('case-request-message');
  const button = form.querySelector('[type="submit"]');
  const buttonLabel = document.getElementById('case-request-label');
  const feedback = document.getElementById('case-request-feedback');
  const title = document.getElementById('case-request-feedback-title');
  const copy = document.getElementById('case-request-feedback-copy');
  const enterPassword = document.getElementById('case-request-enter-password');
  const emailFallback = gate.querySelector('.case-access-request');
  const preview = new URLSearchParams(location.search).get('request-preview') === '1';
  const states = {
    pending: ['Request sent.', 'I’ll review your request and email you once approved.'],
    approved: ['Access approved.', 'Check your email for the password, then enter it to continue.'],
    declined: ['Request reviewed.', 'I’m unable to share this project at the moment. You’re welcome to email me about my work.'],
    expired: ['Check your email.', 'This request status is no longer available. If you received a password, enter it below. Otherwise, email me for access.']
  };
  let enabled = false, configReady = false, receipt = null, timer, checking = false, lastCheck = 0;
  let passwordMode = location.hash === '#case-password';
  let requestId = crypto.randomUUID(), submittedValues = '';
  function message(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  function save() {
    try {
      if (receipt) sessionStorage.setItem(storageKey, JSON.stringify(receipt));
      else sessionStorage.removeItem(storageKey);
    } catch { /* Status still works while this page remains open. */ }
  }
  function render(moveFocus = false) {
    const completed = Boolean(receipt);
    card.classList.toggle('has-request-state', completed);
    intro.hidden = completed;
    if (moveFocus) passwordMode = false;
    section.hidden = completed || passwordMode || !(enabled || preview || !configReady);
    passwordForm.hidden = !passwordMode;
    feedback.hidden = !completed;
    enterPassword.hidden = passwordMode;
    modeToggle.hidden = completed || (configReady && !enabled && !preview);
    modeToggle.textContent = passwordMode ? 'Request access instead' : 'Already have a password?';
    modeToggle.setAttribute('aria-expanded', String(passwordMode));
    description.textContent = passwordMode ? 'Enter your password to continue.' : 'This project is in development. Request access to see the details.';
    emailFallback.hidden = false;
    gate.setAttribute('aria-labelledby', completed ? title.id : 'case-access-title');
    if (!completed) {
      return;
    }
    const state = states[receipt.status] || states.pending;
    if (title.textContent !== state[0]) title.textContent = state[0];
    if (copy.textContent !== state[1]) copy.textContent = state[1];
    if (moveFocus) {
      if (!gate.hidden) {
        feedback.scrollIntoView({ block: 'start', behavior: 'auto' });
        title.focus({ preventScroll: true });
      }
    }
  }
  function schedule() {
    clearTimeout(timer);
    if (receipt?.status === 'pending' && !document.hidden && !gate.hidden) timer = setTimeout(checkStatus, 20000);
  }
  async function checkStatus() {
    clearTimeout(timer);
    if (!receipt || receipt.status !== 'pending' || document.hidden || gate.hidden || checking) return;
    if (receipt.expiresAt <= Date.now()) {
      receipt.status = 'expired'; save(); render(); return;
    }
    if (Date.now() - lastCheck < 5000) { schedule(); return; }
    checking = true;
    lastCheck = Date.now();
    const current = receipt;
    try {
      const response = await fetch(API + '/request-status', {
        headers: { Authorization: 'Receipt ' + current.token }, cache: 'no-store', credentials: 'omit',
        referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000)
      });
      if (receipt !== current) return;
      if ([401, 410].includes(response.status)) current.status = 'expired';
      else if (response.ok) {
        const result = await response.json();
        if (receipt !== current) return;
        if (['pending', 'approved', 'declined'].includes(result.status)) current.status = result.status;
      }
      save(); render();
    } catch { /* Keep the confirmed submission; email remains the source of access. */ }
    finally { checking = false; schedule(); }
  }
  function showPassword(event) {
    passwordMode = true;
    render();
    if (event?.detail?.focus === false) return;
    passwordForm.scrollIntoView({ block: 'start', behavior: 'auto' });
    password.focus({ preventScroll: true });
  }
  enterPassword.addEventListener('click', showPassword);
  modeToggle.addEventListener('click', () => {
    if (!passwordMode) showPassword();
    else {
      passwordMode = false; render();
      section.scrollIntoView({ block: 'start', behavior: 'auto' });
      document.getElementById('case-request-email').focus({ preventScroll: true });
    }
  });
  document.addEventListener('case-show-password', showPassword);
  addEventListener('hashchange', () => { if (location.hash === '#case-password' && !gate.hidden) showPassword(); });
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    if (stored && typeof stored.token === 'string' && stored.token.length < 2048 && Number.isFinite(stored.expiresAt) && Object.hasOwn(states, stored.status)) {
      receipt = stored;
      if (receipt.expiresAt <= Date.now()) receipt.status = 'expired';
    }
  } catch { /* No saved request. */ }
  render();
  if (passwordMode) showPassword();
  fetch(API + '/request-config', { cache: 'no-store', credentials: 'omit' })
    .then(response => { if (!response.ok) throw new Error('unavailable'); return response.json(); })
    .then(config => {
      configReady = true;
      enabled = config.enabled === true;
      button.disabled = !enabled;
      if (!enabled && !preview) passwordMode = true;
      availability.hidden = enabled;
      availability.textContent = enabled ? '' : 'Online requests are unavailable. Email me for access.';
      render();
      if (preview && !enabled) message('Preview only: email delivery is being connected. Please use the email link below for now.');
      checkStatus();
    })
    .catch(() => {
      configReady = true;
      button.disabled = true;
      if (!preview) passwordMode = true;
      availability.hidden = false;
      availability.textContent = 'Online requests are unavailable. Email me for access.';
      render();
      if (preview) message('Online requests are unavailable. Please use the email link below.', true);
      schedule();
    });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!enabled || button.disabled || receipt) return;
    const input = Object.fromEntries(new FormData(form));
    const values = JSON.stringify(input);
    if (submittedValues && submittedValues !== values) requestId = crypto.randomUUID();
    submittedValues = values;
    button.disabled = true;
    buttonLabel.textContent = 'Sending request…';
    form.setAttribute('aria-busy', 'true');
    message('Sending your request to Abhishek…');
    try {
      const response = await fetch(API + '/request-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, requestId }), credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again or use the email link below.');
      receipt = { token: result.receipt, expiresAt: result.expiresAt, status: result.status };
      save();
      form.reset();
      message('');
      render(true);
      schedule();
    } catch (error) {
      message(error instanceof TypeError ? 'Couldn’t confirm your request. Try again or use the email link below.' : error.message, true);
      button.disabled = false;
      buttonLabel.textContent = 'Request access';
    } finally { form.setAttribute('aria-busy', 'false'); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else checkStatus(); });
  addEventListener('focus', checkStatus);
  addEventListener('pageshow', checkStatus);
  addEventListener('pagehide', () => clearTimeout(timer));
  document.addEventListener('case-content-ready', () => {
    if (gate.hidden) {
      clearTimeout(timer);
      receipt = null; save();
      passwordMode = false;
      requestId = crypto.randomUUID(); submittedValues = '';
      button.disabled = !enabled; buttonLabel.textContent = 'Request access';
      form.reset(); message(''); render();
    } else checkStatus();
  });
})();
