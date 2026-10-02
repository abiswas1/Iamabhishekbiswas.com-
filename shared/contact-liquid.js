import { createFluid } from './contact-liquid-engine.js?v=253';

function attachFluid(section, compact = false) {
  if (!section || section.dataset.liquidReady) return;
  section.dataset.liquidReady = 'true';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const touchScreen = matchMedia('(hover: none), (pointer: coarse)');
  const canvas = document.createElement('canvas');
  canvas.className = compact ? 'contact-liquid contact-liquid-button' : 'contact-liquid';
  canvas.setAttribute('aria-hidden', 'true');
  section.prepend(canvas);

  let fluid = null;
  let failed = false;
  let visible = false;
  let frame = 0;
  let lastFrame = 0;
  let runUntil = 0;
  let cursor = null;
  let target = null;
  let head = null;
  let activePointer = null;
  let ambientUntil = 0;
  let ambientHead = null;
  let scrollY = window.scrollY;
  let bounds;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const enabled = () => !failed && visible && !document.hidden &&
    !reducedMotion.matches;

  function stop() {
    cancelAnimationFrame(frame);frame = 0;lastFrame = 0;
    canvas.classList.remove('is-flowing');
    cursor = target = head = null;
    activePointer = null;ambientUntil = 0;ambientHead = null;
  }
  function measure() {
    bounds = section.getBoundingClientRect();
    if (fluid && bounds.width && bounds.height) fluid.resize(bounds.width, bounds.height);
  }
  function initialize() {
    if (fluid) return true;
    try {
      fluid = createFluid(canvas, { compact, mobile: touchScreen.matches });
      if (!fluid) { failed = true;return false; }
      measure();return true;
    } catch {
      // Unsupported graphics leave the original CSS gradient fully usable.
      fluid?.dispose();fluid = null;failed = true;stop();return false;
    }
  }
  function render(time) {
    frame = 0;
    if (!enabled() || time > runUntil || !fluid) { stop();return; }
    const elapsed = lastFrame ? time - lastFrame : 1000 / (touchScreen.matches ? 30 : 60);
    // Touch screens use a lighter, 30 fps simulation; desktop keeps its 60 fps feel.
    if (elapsed < (touchScreen.matches ? 30 : 15)) { frame = requestAnimationFrame(render);return; }
    lastFrame = time;
    const dt = Math.min(elapsed / 1000, 1 / 30);
    const strokes = [];
    if (touchScreen.matches && !cursor && time < ambientUntil) {
      const t = time / 1000;
      const point = {
        x: .5 + .29 * Math.sin(t * 1.15),
        y: .5 + (compact ? .19 : .28) * Math.sin(t * 1.65 + .7)
      };
      if (ambientHead) strokes.push({ ...point,
        dx: clamp(point.x - ambientHead.x, -.03, .03),
        dy: clamp(point.y - ambientHead.y, -.03, .03)
      });
      ambientHead = point;
    } else ambientHead = null;
    if (target && head) {
      const old = { ...head };
      const follow = 1 - Math.exp(-dt / (compact ? .032 : .045));
      head.x += (target.x - head.x) * follow;
      head.y += (target.y - head.y) * follow;
      const dx = head.x - old.x, dy = head.y - old.y;
      const distance = Math.hypot(dx * bounds.width / bounds.height, dy);
      if (distance > .00015) {
        const count = Math.min(4, Math.max(1, Math.ceil(distance / .035)));
        for (let i = 1; i <= count; i++) strokes.push({
          x: old.x + dx * i / count, y: old.y + dy * i / count,
          dx: clamp(dx / count, -.05, .05), dy: clamp(dy / count, -.05, .05)
        });
      }
    }
    fluid.step(dt, strokes);fluid.display();
    canvas.classList.add('is-flowing');
    frame = requestAnimationFrame(render);
  }
  function track() {
    if (!cursor || !enabled()) return;
    measure();
    if (!bounds.width || !bounds.height || cursor.x < bounds.left || cursor.x > bounds.right ||
      cursor.y < bounds.top || cursor.y > bounds.bottom) { release();return; }
    target = {
      x: clamp((cursor.x - bounds.left) / bounds.width, 0, 1),
      y: 1 - clamp((cursor.y - bounds.top) / bounds.height, 0, 1)
    };
    if (!initialize()) return;
    if (!head) head = { ...target };
    runUntil = performance.now() + (compact ? 2200 : 7500);
    if (!frame) frame = requestAnimationFrame(render);
  }
  function follow(event) {
    if (!enabled() || (event.pointerType !== 'mouse' && event.pointerId !== activePointer)) return;
    cursor = { x: event.clientX, y: event.clientY };track();
  }
  function wake(duration = 3000) {
    if (!touchScreen.matches || !enabled() || !initialize()) return;
    const now = performance.now();
    ambientUntil = Math.max(ambientUntil, now + duration);
    runUntil = Math.max(runUntil, ambientUntil + (compact ? 700 : 1600));
    if (!frame) frame = requestAnimationFrame(render);
  }
  function press(event) {
    if (event.pointerType === 'mouse' || event.isPrimary === false || !enabled()) return;
    activePointer = event.pointerId;follow(event);
    // A stationary tap still stirs the surface. Native clicks and scrolling remain untouched.
    if (head) head.x = clamp(head.x - .025, 0, 1);
  }
  function release() {
    cursor = null;target = head ? { ...head } : null;
    activePointer = null;
    runUntil = Math.min(runUntil, performance.now() + (compact ? 800 : 2800));
  }
  function releaseTouch(event) {
    if (event.pointerId !== activePointer) return;
    release();wake(compact ? 700 : 1200);
  }

  section.addEventListener('pointerenter', follow, { passive: true });
  section.addEventListener('pointermove', follow, { passive: true });
  section.addEventListener('pointerdown', press, { passive: true });
  section.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') release();
    else releaseTouch(event);
  }, { passive: true });
  window.addEventListener('pointerup', releaseTouch, { passive: true });
  window.addEventListener('pointercancel', releaseTouch, { passive: true });
  window.addEventListener('scroll', () => {
    const moved = Math.abs(window.scrollY - scrollY);scrollY = window.scrollY;
    if (cursor) track();
    if (!compact && moved > 1) wake(900);
  }, { passive: true });
  new ResizeObserver(() => { if (fluid && enabled()) measure(); }).observe(section);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) stop();
    else wake();
  }).observe(section);
  function resume() { stop();wake(); }
  reducedMotion.addEventListener('change', resume);
  touchScreen.addEventListener('change', resume);
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', () => wake());
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();failed = true;fluid = null;stop();
  });
  canvas.addEventListener('webglcontextrestored', () => { failed = false;wake(); });
}

attachFluid(document.querySelector('#contact.contact'));
document.querySelectorAll('.portfolio-header .portfolio-contact').forEach(button => attachFluid(button, true));
