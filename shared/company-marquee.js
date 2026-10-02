(() => {
  const viewport = document.querySelector('.company-marquee');
  if (!viewport || viewport.dataset.enhanced) return;
  const track = viewport.querySelector('.company-track');
  const group = track.querySelector('.company-group');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  viewport.dataset.enhanced = 'true';

  // Keep an identical cycle on each side for browsing in either direction.
  function copyGroup() {
    const copy = group.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('img').forEach(image => { image.alt = ''; });
    return copy;
  }
  track.prepend(copyGroup());
  track.append(copyGroup());

  let cycleWidth = 0;
  let position = 0;
  let programmaticPosition = 0;
  let frame = 0;
  let previousTime = null;
  let coastFrame = 0;
  let coastTime = 0;
  let coastVelocity = 0;
  let inView = false;
  let touching = false;
  let drag = null;
  let pausedUntil = 0;
  let resumeTimer;
  let settleTimer;

  const keyboardFocused = () => viewport.matches(':focus-visible');
  const canPlay = () => cycleWidth > 0 && inView && !document.hidden &&
    !reducedMotion.matches && !touching && !drag && !coastFrame &&
    !keyboardFocused() && performance.now() >= pausedUntil;

  function setPosition(nextPosition) {
    position = nextPosition;
    viewport.scrollLeft = nextPosition;
    programmaticPosition = viewport.scrollLeft;
  }
  function normalize() {
    if (!cycleWidth || touching || drag || coastFrame) return;
    const phase = ((viewport.scrollLeft % cycleWidth) + cycleWidth) % cycleWidth;
    setPosition(cycleWidth + phase);
  }
  function stop() {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(coastFrame);
    frame = 0;
    coastFrame = 0;
    coastVelocity = 0;
    previousTime = null;
  }
  function tick(time) {
    frame = 0;
    if (!canPlay()) { previousTime = null; return; }
    if (previousTime !== null) {
      // The speed stays consistent across screen sizes; no catch-up after a pause.
      const distance = Math.min(time - previousTime, 50) * .022;
      const phase = (position + distance) % cycleWidth;
      setPosition(cycleWidth + phase);
    }
    previousTime = time;
    frame = requestAnimationFrame(tick);
  }
  function play() {
    if (!frame && canPlay()) {
      position = viewport.scrollLeft;
      frame = requestAnimationFrame(tick);
    }
  }
  function coast(time) {
    coastFrame = 0;
    if (!inView || document.hidden || reducedMotion.matches || touching || drag || keyboardFocused()) return;
    // Time-based friction feels the same on 60 Hz and 120 Hz displays.
    const elapsed = Math.min(time - coastTime, 50);
    const decay = Math.exp(-elapsed / 260);
    const next = position + coastVelocity * 260 * (1 - decay);
    const phase = ((next % cycleWidth) + cycleWidth) % cycleWidth;
    setPosition(cycleWidth + phase);
    coastVelocity *= decay;
    coastTime = time;
    if (Math.abs(coastVelocity) > .015) coastFrame = requestAnimationFrame(coast);
    else { coastVelocity = 0; play(); }
  }
  function startCoast(velocity) {
    if (reducedMotion.matches || !inView || document.hidden || Math.abs(velocity) < .04) return;
    clearTimeout(settleTimer);
    coastVelocity = Math.max(-2.4, Math.min(2.4, velocity));
    coastTime = performance.now();
    coastFrame = requestAnimationFrame(coast);
  }
  function pauseForBrowsing() {
    stop();
    pausedUntil = performance.now() + 2800;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { normalize(); play(); }, 2800);
  }
  function settle() {
    clearTimeout(settleTimer);
    // Recenter only after native touch/trackpad momentum has finished.
    settleTimer = setTimeout(normalize, 180);
  }
  function measure() {
    const phase = cycleWidth ? ((viewport.scrollLeft % cycleWidth) + cycleWidth) % cycleWidth / cycleWidth : 0;
    cycleWidth = group.getBoundingClientRect().width;
    setPosition(cycleWidth * (1 + phase));
    play();
  }

  viewport.addEventListener('pointerdown', event => {
    if (!cycleWidth || event.pointerType !== 'mouse' || event.button !== 0) return;
    event.preventDefault();
    pauseForBrowsing();
    drag = { id: event.pointerId, x: event.clientX, time: performance.now(), velocity: 0 };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const now = performance.now();
    const distance = drag.x - event.clientX;
    const elapsed = Math.max(1, Math.min(now - drag.time, 50));
    const velocity = Math.max(-2.4, Math.min(2.4, distance / elapsed));
    // Follow the pointer directly; only the release glides. Reversing the drag takes over immediately.
    const blend = 1 - Math.exp(-elapsed / 40);
    drag.velocity = Math.sign(velocity) !== Math.sign(drag.velocity)
      ? velocity : drag.velocity + (velocity - drag.velocity) * blend;
    drag.time = now;
    drag.x = event.clientX;
    const phase = (((position + distance) % cycleWidth) + cycleWidth) % cycleWidth;
    setPosition(cycleWidth + phase);
    pauseForBrowsing();
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const idle = performance.now() - drag.time;
    // A held or cancelled drag stops exactly where it was left; only a fresh release coasts.
    const velocity = event.type === 'pointerup' && idle < 100
      ? drag.velocity * Math.exp(-idle / 80) : 0;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    pauseForBrowsing();
    startCoast(velocity);
    if (!coastFrame) settle();
  }
  viewport.addEventListener('pointerup', finishDrag);
  viewport.addEventListener('pointercancel', finishDrag);
  viewport.addEventListener('lostpointercapture', finishDrag);
  viewport.addEventListener('dragstart', event => event.preventDefault());

  // Let the browser provide native swiping, momentum and vertical page scrolling.
  viewport.addEventListener('touchstart', () => {
    touching = true;
    pauseForBrowsing();
  }, { passive: true });
  function finishTouch(event) {
    touching = event.touches.length > 0;
    pauseForBrowsing();
    settle();
  }
  viewport.addEventListener('touchend', finishTouch, { passive: true });
  viewport.addEventListener('touchcancel', finishTouch, { passive: true });
  viewport.addEventListener('wheel', event => {
    if (!event.deltaX && !event.shiftKey) return;
    pauseForBrowsing();
    // Native horizontal trackpads work directly; Shift + wheel supports a mouse.
    if (event.shiftKey && !event.deltaX) {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1;
      setPosition(viewport.scrollLeft + event.deltaY * unit);
      settle();
    }
  }, { passive: false });
  viewport.addEventListener('scroll', () => {
    if (Math.abs(viewport.scrollLeft - programmaticPosition) < 1) return;
    pauseForBrowsing();
    settle();
  }, { passive: true });
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    pauseForBrowsing();
    if (event.key === 'Home') setPosition(cycleWidth);
    else if (event.key === 'End') setPosition(2 * cycleWidth - viewport.clientWidth);
    else setPosition(viewport.scrollLeft + (event.key === 'ArrowRight' ? 140 : -140));
    normalize();
  });
  viewport.addEventListener('focusin', () => { if (keyboardFocused()) stop(); });
  viewport.addEventListener('focusout', () => setTimeout(play, 0));
  reducedMotion.addEventListener('change', () => { stop(); play(); });
  document.addEventListener('visibilitychange', () => { stop(); play(); });
  new ResizeObserver(measure).observe(viewport);
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    stop();
    play();
  }).observe(viewport);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', measure);
  measure();
})();
