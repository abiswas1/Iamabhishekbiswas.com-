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
  let inView = false;
  let touching = false;
  let drag = null;
  let pausedUntil = 0;
  let resumeTimer;
  let settleTimer;

  const keyboardFocused = () => viewport.matches(':focus-visible');
  const canPlay = () => cycleWidth > 0 && inView && !document.hidden &&
    !reducedMotion.matches && !touching && !drag &&
    !keyboardFocused() && performance.now() >= pausedUntil;

  function setPosition(nextPosition) {
    position = nextPosition;
    viewport.scrollLeft = nextPosition;
    programmaticPosition = viewport.scrollLeft;
  }
  function normalize() {
    if (!cycleWidth || touching || drag) return;
    const phase = ((viewport.scrollLeft % cycleWidth) + cycleWidth) % cycleWidth;
    setPosition(cycleWidth + phase);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
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
    drag = { id: event.pointerId, x: event.clientX };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const position = viewport.scrollLeft + drag.x - event.clientX;
    drag.x = event.clientX;
    const phase = ((position % cycleWidth) + cycleWidth) % cycleWidth;
    setPosition(cycleWidth + phase);
    pauseForBrowsing();
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    pauseForBrowsing();
    settle();
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
