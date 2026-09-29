(() => {
  const hero = document.querySelector('.illustration');
  const wisps = [...document.querySelectorAll('.coffee-steam-wisp')];
  if (!hero || !wisps.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let visible = true;
  let phase = 0;
  let previousTime = null;

  function draw() {
    wisps.forEach((wisp) => {
      const seed = Number(wisp.dataset.seed);
      const height = Number(wisp.dataset.height);
      const left = [], right = [];
      // Broad tapered ribbons: curls travel upward while their base stays on the lid opening.
      for (let i = 0; i <= 48; i++) {
        const s = i / 48;
        const wave = Math.sin(s * Math.PI * 2.1 - phase * Math.PI * 2 + seed);
        const center = Math.sin(s * Math.PI / 2) * (wave * (2 + s * 1.8) + (seed - 1.1) * 1.4);
        const width = (0.18 + Math.pow(Math.sin(Math.PI * s), 0.8) * 1.35) * (1 - s * 0.3);
        left.push(`${(center - width).toFixed(3)},${(-s * height).toFixed(3)}`);
        right.push(`${(center + width).toFixed(3)},${(-s * height).toFixed(3)}`);
      }
      wisp.setAttribute('d', `M${left.join(' L')} L${right.reverse().join(' L')} Z`);
    });
  }

  function tick(time) {
    if (previousTime !== null) phase = (phase + (time - previousTime) / 5600) % 1;
    previousTime = time;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    previousTime = null;
    draw();
    if (!reducedMotion.matches && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(hero);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  sync();
})();
