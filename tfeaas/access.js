(() => {
  const gate = document.getElementById('case-access');
  if (!gate) return;
  const API = 'https://abhishek-biswas-design.abhishek25789.chatgpt.site/api/tfe';
  const storageKey = 'tfe-private-session-v1';
  const form = document.getElementById('case-access-form');
  const password = document.getElementById('case-password');
  const submit = form.querySelector('[type="submit"]');
  const visibility = document.getElementById('case-password-visibility');
  const submitLabel = document.getElementById('case-unlock-label');
  const message = document.getElementById('case-access-message');
  const content = document.getElementById('case-private-content');
  const sessionBar = document.getElementById('case-access-session');
  const nav = document.querySelector('.case-navigation-links');
  const lockedNav = nav.innerHTML;
  const publicLinks = [...nav.children].slice(0, 3).map(link => link.outerHTML).join('');
  const chapters = [['research', 'Discovery'], ['market', 'AWS and IBM Cloud'], ['phase-one', 'Phase 1'], ['validation', 'Validation'], ['phase-two', 'Phase 2 · AI'], ['value', 'Impact'], ['reflection', 'Reflection']];
  let session, expiryTimer, controller, observer, generation = 0;
  const blobs = new Map();
  let queue = [], running = 0;
  let requestedHash = location.hash;
  const stored = () => { try { return JSON.parse(sessionStorage.getItem(storageKey)); } catch { return null; } };
  function status(text, error = false) { message.textContent = text; message.dataset.error = String(error); }
  function busy(value) { submit.disabled = value; submitLabel.textContent = value ? 'Unlocking…' : 'Unlock case study'; form.setAttribute('aria-busy', String(value)); }
  function lock(text = '', moveFocus = false) {
    generation++;
    session = null;
    clearTimeout(expiryTimer);
    controller?.abort();
    observer?.disconnect();
    queue.splice(0).forEach(task => task.reject(new DOMException('Locked', 'AbortError')));
    for (const promise of blobs.values()) promise.then(url => URL.revokeObjectURL(url)).catch(() => {});
    blobs.clear();
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
    content.replaceChildren();
    content.hidden = true;
    sessionBar.hidden = true;
    gate.hidden = false;
    nav.innerHTML = lockedNav;
    navChanged();
    status(text);
    if (text || moveFocus) document.dispatchEvent(new CustomEvent('case-show-password', { detail: { focus: moveFocus } }));
  }
  function navChanged() { document.dispatchEvent(new Event('case-content-ready')); }
  function pump() {
    while (running < 4 && queue.length) {
      const task = queue.shift();
      running++;
      task.run().then(task.resolve, task.reject).finally(() => { running--; pump(); });
    }
  }
  const enqueue = run => new Promise((resolve, reject) => { queue.push({ run, resolve, reject }); pump(); });
  async function privateFetch(path) {
    if (!session || session.expiresAt <= Date.now()) { lock('Your access has expired. Enter the password to continue.'); throw new Error('expired'); }
    const response = await fetch(API + path, { headers: { Authorization: `Bearer ${session.token}` }, cache: 'no-store', credentials: 'omit', signal: controller.signal, referrerPolicy: 'no-referrer' });
    if (response.status === 401) { lock('Your access has expired. Enter the password to continue.'); throw new Error('expired'); }
    if (!response.ok) throw new Error('unavailable');
    return response;
  }
  function asset(name) {
    if (!blobs.has(name)) {
      const current = generation;
      const promise = enqueue(async () => {
        const response = await privateFetch('/assets/' + encodeURIComponent(name));
        const blob = await response.blob();
        if (current !== generation) throw new DOMException('Locked', 'AbortError');
        return URL.createObjectURL(blob);
      });
      blobs.set(name, promise);
      promise.catch(() => { if (blobs.get(name) === promise) blobs.delete(name); });
    }
    return blobs.get(name);
  }
  async function loadImage(image) {
    if (image.dataset.privateLoading) return;
    image.dataset.privateLoading = 'true';
    const current = generation;
    const stage = image.closest('.media-stage');
    const link = image.closest('a[data-private-href]');
    const mediaStatus = stage?.querySelector('.media-status');
    try {
      let url;
      try { url = await asset(image.dataset.privateSrc); }
      catch (error) {
        if (!session || !image.dataset.privateFallback || error.name === 'AbortError') throw error;
        url = await asset(image.dataset.privateFallback);
      }
      if (current !== generation) return;
      image.onload = () => { stage?.classList.add('is-loaded'); stage?.classList.remove('is-error'); };
      image.onerror = () => { stage?.classList.add('is-error'); if (mediaStatus) mediaStatus.textContent = 'This image could not load. Lock the case study, then enter the password again to retry.'; };
      image.src = url;
      if (link) { link.href = link.dataset.privateHref === image.dataset.privateSrc ? url : await asset(link.dataset.privateHref); link.removeAttribute('aria-disabled'); }
    } catch {
      if (current !== generation) return;
      stage?.classList.add('is-error');
      if (mediaStatus) { mediaStatus.textContent = 'This image could not load. Lock the case study, then enter the password again to retry.'; mediaStatus.removeAttribute('aria-hidden'); }
    }
  }
  async function reveal(nextSession, scroll) {
    if (!nextSession?.token || !Number.isFinite(nextSession.expiresAt) || nextSession.expiresAt <= Date.now()) throw new Error('expired');
    controller?.abort();
    controller = new AbortController();
    session = nextSession;
    const current = ++generation;
    const response = await privateFetch('/content');
    const html = await response.text();
    if (current !== generation) return;
    content.innerHTML = html; // Same-owner HTML returned only by the authenticated API.
    content.hidden = false;
    gate.hidden = true;
    sessionBar.hidden = false;
    nav.innerHTML = publicLinks + chapters.map(([id, title]) => `<a href="#${id}">${title}</a>`).join('');
    try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* Unlock works with storage disabled. */ }
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(() => lock('Your access has expired. Enter the password to continue.'), Math.max(0, session.expiresAt - Date.now()));
    window.initializeCaseMedia?.(content);
    navChanged();
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { observer.unobserve(entry.target); loadImage(entry.target); }
    }), { rootMargin: '600px' });
    content.querySelectorAll('[data-private-href]').forEach(link => link.setAttribute('aria-disabled', 'true'));
    content.querySelectorAll('img[data-private-src]').forEach(image => observer.observe(image));
    if (scroll) {
      const target = content.querySelector(`[id="${CSS.escape(requestedHash.slice(1))}"]`) || document.getElementById('research');
      target?.scrollIntoView({ block: 'start' });
      const heading = target?.querySelector('h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
  }
  visibility.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    visibility.textContent = show ? 'Hide' : 'Show';
    visibility.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    visibility.setAttribute('aria-pressed', String(show));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    busy(true);
    status('Checking access…');
    password.removeAttribute('aria-invalid');
    try {
      const response = await fetch(API + '/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: password.value }), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      const result = await response.json();
      if (!response.ok) { password.setAttribute('aria-invalid', String(response.status === 401)); throw new Error(result.error || 'Unable to unlock. Please try again.'); }
      status('Opening the case study…');
      await reveal(result, true);
      password.value = '';
      password.type = 'password';
      visibility.textContent = 'Show';
      visibility.setAttribute('aria-label', 'Show password');
      visibility.setAttribute('aria-pressed', 'false');
    } catch (error) {
      lock();
      status(error.message === 'unavailable' || error instanceof TypeError ? 'Unable to load the case study. Please try again or request access by email.' : error.message, true);
    } finally { busy(false); }
  });
  document.getElementById('case-lock').addEventListener('click', () => lock('Case study locked.', true));
  addEventListener('hashchange', () => {
    if (!session && chapters.some(([id]) => location.hash === '#' + id)) {
      requestedHash = location.hash;
      document.dispatchEvent(new Event('case-show-password'));
    }
  });
  const expireIfNeeded = () => { if (session && session.expiresAt <= Date.now()) lock('Your access has expired. Enter the password to continue.'); };
  addEventListener('pageshow', expireIfNeeded);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) expireIfNeeded(); });
  const previous = stored();
  if (previous?.expiresAt > Date.now()) {
    busy(true);
    status('Restoring your access…');
    reveal(previous, Boolean(requestedHash && requestedHash !== '#case-access')).catch(() => lock('Please enter the password to continue.')).finally(() => busy(false));
  } else {
    lock();
    if (chapters.some(([id]) => requestedHash === '#' + id)) gate.scrollIntoView({ block: 'start' });
  }
})();
