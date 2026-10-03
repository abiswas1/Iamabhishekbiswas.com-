/* Native scrolling keeps touch and trackpad gestures under browser control. */
(() => {
  document.querySelectorAll('[data-testimonials-carousel]').forEach((root) => {
    if (root.dataset.carouselReady) return;
    const track = root.querySelector('.testimonials-track');
    const slides = Array.from(root.querySelectorAll('.feedback-quote'));
    const controls = root.querySelector('.testimonials-controls');
    const previous = root.querySelector('[data-testimonials-prev]');
    const next = root.querySelector('[data-testimonials-next]');
    const pagination = root.querySelector('.testimonials-pagination');
    const status = root.querySelector('.testimonials-status');
    if (!track || slides.length < 2 || !controls || !previous || !next || !pagination || !status) return;
    root.dataset.carouselReady = 'true';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0;
    let target = 0;
    let settling;
    let previousWidth = 0;

    const perView = () => Math.max(1, Math.min(slides.length, Number(getComputedStyle(root).getPropertyValue('--testimonial-per-view')) || 1));
    const maxIndex = () => slides.length - perView();
    const offset = (index) => slides[index].offsetLeft - slides[0].offsetLeft;
    const clamp = (index) => Math.max(0, Math.min(maxIndex(), index));

    function updatePagination() {
      const count = maxIndex() + 1;
      if (pagination.children.length !== count) {
        pagination.replaceChildren();
        for (let index = 0; index < count; index++) {
          const indicator = document.createElement('button');
          const end = index + perView();
          indicator.type = 'button';
          indicator.className = 'testimonials-indicator';
          indicator.setAttribute('aria-label', perView() === 1
            ? `Show testimonial ${index + 1} of ${slides.length}`
            : `Show testimonials ${index + 1} to ${end} of ${slides.length}`);
          indicator.setAttribute('aria-controls', track.id);
          indicator.addEventListener('click', () => goTo(index));
          pagination.append(indicator);
        }
      }
      Array.from(pagination.children).forEach((indicator, index) => {
        if (index === current) indicator.setAttribute('aria-current', 'true');
        else indicator.removeAttribute('aria-current');
      });
    }

    function update(announce = false) {
      let nearest = 0;
      let distance = Infinity;
      for (let i = 0; i <= maxIndex(); i++) {
        const candidate = Math.abs(track.scrollLeft - offset(i));
        if (candidate < distance) { distance = candidate; nearest = i; }
      }
      current = nearest;
      const end = Math.min(slides.length, current + perView());
      updatePagination();
      previous.setAttribute('aria-disabled', String(current === 0));
      next.setAttribute('aria-disabled', String(current === maxIndex()));
      if (announce) {
        target = current;
        const message = end === current + 1 ? `Testimonial ${end} of ${slides.length}.` : `Testimonials ${current + 1} to ${end} of ${slides.length}.`;
        if (status.textContent !== message) status.textContent = message;
      }
    }

    function goTo(index, instant = false) {
      target = clamp(index);
      track.scrollTo({ left: offset(target), behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
      if (instant || reducedMotion.matches) update(true);
    }

    previous.addEventListener('click', () => { if (previous.getAttribute('aria-disabled') !== 'true') goTo(target - 1); });
    next.addEventListener('click', () => { if (next.getAttribute('aria-disabled') !== 'true') goTo(target + 1); });
    controls.addEventListener('keydown', (event) => {
      const key = event.key;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
      event.preventDefault();
      goTo(key === 'Home' ? 0 : key === 'End' ? maxIndex() : target + (key === 'ArrowRight' ? 1 : -1));
    });
    track.addEventListener('scroll', () => {
      update();
      clearTimeout(settling);
      settling = setTimeout(() => update(true), 180);
    }, { passive: true });
    track.addEventListener('scrollend', () => { clearTimeout(settling); update(true); });
    function resize() {
      if (Math.abs(track.clientWidth - previousWidth) < 1) return;
      previousWidth = track.clientWidth;
      goTo(clamp(current), true);
      update();
    }
    controls.hidden = false;
    root.classList.add('is-enhanced');
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(track);
    else window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pageshow', () => { update(); target = current; });
    resize();
    update();
  });
})();
