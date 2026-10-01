(() => {
  const image = document.getElementById('image-page-image');
  const status = document.getElementById('image-page-status');
  const button = document.getElementById('image-page-zoom');
  const viewport = document.querySelector('.image-page-viewport');
  let zoomed = false;
  function fit() {
    if (!image.naturalWidth || image.hidden) return;
    const scale = Math.min(1, Math.max(1, viewport.clientWidth - 32) / image.naturalWidth,
      Math.max(1, viewport.clientHeight - 32) / image.naturalHeight);
    const size = zoomed ? Math.max(1, scale * 2) : scale;
    image.style.width = `${Math.round(image.naturalWidth * size)}px`;
    image.style.height = `${Math.round(image.naturalHeight * size)}px`;
  }
  function zoom() {
    if (button.disabled) return;
    zoomed = !zoomed;
    button.textContent = zoomed ? 'Fit image' : 'Zoom in';
    button.setAttribute('aria-pressed', String(zoomed));
    document.body.classList.toggle('is-zoomed', zoomed);
    fit();
    viewport.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  }
  button.addEventListener('click', zoom);
  image.addEventListener('click', zoom);
  window.addEventListener('resize', fit);
  try {
    const src = new URLSearchParams(location.search).get('src');
    if (!src || !src.startsWith('/') || src.startsWith('//')) throw new Error('Invalid image');
    const url = new URL(src, location.origin);
    if (url.origin !== location.origin || !/^\/(?:assets|tfeaas\/assets|01_VMware_CDF\/images)\/.+\.(?:webp|png|jpe?g|gif|svg|avif)$/i.test(url.pathname)) throw new Error('Invalid image');
    image.addEventListener('load', () => { image.hidden = false; status.hidden = true; button.disabled = false; fit(); });
    image.addEventListener('error', () => { status.textContent = 'This image could not load. Please return to the case study and try again.'; });
    image.src = url.href;
  } catch {
    status.textContent = 'This image link is unavailable. Please return to the portfolio.';
  }
})();
