import { createFluid } from './contact-liquid-engine.js?v=252';

function attachFluid(section, compact = false) {
  if (!section || section.dataset.liquidReady) return;
  section.dataset.liquidReady = 'true';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
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
  let bounds;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const enabled = () => !failed && visible && !document.hidden &&
    finePointer.matches && !reducedMotion.matches;

  function stop() {
    cancelAnimationFrame(frame);frame = 0;lastFrame = 0;
    canvas.classList.remove('is-flowing');
    cursor = target = head = null;
  }
  function measure() {
    bounds = section.getBoundingClientRect();
    if (fluid && bounds.width && bounds.height) fluid.resize(bounds.width, bounds.height);
  }
  function initialize() {
    if (fluid) return true;
    try {
      fluid = createFluid(canvas, { compact });
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
    const elapsed = lastFrame ? time - lastFrame : 1000 / 60;
    // Cap high-refresh displays to 60 fps, with bounded simulation resolution.
    if (elapsed < 15) { frame = requestAnimationFrame(render);return; }
    lastFrame = time;
    const dt = Math.min(elapsed / 1000, 1 / 30);
    const strokes = [];
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
    if (event.pointerType !== 'mouse' || !enabled()) return;
    cursor = { x: event.clientX, y: event.clientY };track();
  }
  function release() {
    cursor = null;target = head ? { ...head } : null;
    runUntil = Math.min(runUntil, performance.now() + (compact ? 800 : 2800));
  }

  section.addEventListener('pointerenter', follow, { passive: true });
  section.addEventListener('pointermove', follow, { passive: true });
  section.addEventListener('pointerleave', release);
  section.addEventListener('pointercancel', release);
  window.addEventListener('scroll', () => { if (cursor) track(); }, { passive: true });
  new ResizeObserver(() => { if (fluid && enabled()) measure(); }).observe(section);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) stop();
  }).observe(section);
  reducedMotion.addEventListener('change', stop);
  finePointer.addEventListener('change', stop);
  document.addEventListener('visibilitychange', stop);
  window.addEventListener('pagehide', stop);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();failed = true;fluid = null;stop();
  });
  canvas.addEventListener('webglcontextrestored', () => { failed = false; });
}

attachFluid(document.querySelector('#contact.contact'));
document.querySelectorAll('.portfolio-header .portfolio-contact').forEach(button => attachFluid(button, true));
