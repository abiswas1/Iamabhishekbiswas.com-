(() => {
  const imagePath = /\.(?:avif|webp|png|jpe?g|gif|svg)(?:[?#]|$)/i;
  let viewer, picture, viewport, caption, status, zoomButton, closeButton;
  let opener, zoomed = false, previousOverflow = '';

  function imageLink(target) {
    const link = target.closest?.('a');
    if (!link || link.hasAttribute('download') || !link.querySelector('img')) return null;
    const href = link.getAttribute('href') || '';
    return link.hasAttribute('data-full-image') || imagePath.test(href) || href.startsWith('blob:') || link.hasAttribute('data-private-href') ? link : null;
  }

  function sizeImage() {
    if (!viewer?.open || !picture.naturalWidth || !picture.naturalHeight) return;
    const fit = Math.min(1, Math.max(1, viewport.clientWidth - 32) / picture.naturalWidth,
      Math.max(1, viewport.clientHeight - 32) / picture.naturalHeight);
    const scale = zoomed ? Math.max(1, fit * 2) : fit;
    picture.style.width = `${Math.round(picture.naturalWidth * scale)}px`;
    picture.style.height = `${Math.round(picture.naturalHeight * scale)}px`;
    picture.hidden = false;
    picture.classList.toggle('is-zoomed', zoomed);
    zoomButton.disabled = false;
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.querySelector('span').textContent = zoomed ? 'Fit image' : 'Zoom in';
    status.textContent = zoomed ? 'Scroll or swipe to explore the image.' : '';
  }

  function toggleZoom() {
    if (zoomButton.disabled) return;
    zoomed = !zoomed;
    sizeImage();
    viewport.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  }

  function createViewer() {
    viewer = document.createElement('dialog');
    viewer.className = 'image-viewer';
    viewer.setAttribute('aria-label', 'Image preview');
    viewer.innerHTML = `
      <div class="image-viewer-shell">
        <div class="image-viewer-toolbar">
          <span class="image-viewer-status" role="status" aria-live="polite"></span>
          <button class="image-viewer-zoom" type="button" aria-pressed="false" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6m-3-3v6"/></svg><span>Zoom in</span>
          </button>
          <button class="image-viewer-close" type="button" aria-label="Close image preview" autofocus>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="image-viewer-viewport" tabindex="0" aria-label="Image. Use the zoom button to enlarge; scroll to explore.">
          <div class="image-viewer-canvas"><img class="image-viewer-picture" alt="" hidden></div>
        </div>
        <p class="image-viewer-caption"></p>
      </div>`;
    document.body.append(viewer);
    picture = viewer.querySelector('img');
    viewport = viewer.querySelector('.image-viewer-viewport');
    caption = viewer.querySelector('.image-viewer-caption');
    status = viewer.querySelector('.image-viewer-status');
    zoomButton = viewer.querySelector('.image-viewer-zoom');
    closeButton = viewer.querySelector('.image-viewer-close');
    zoomButton.addEventListener('click', toggleZoom);
    picture.addEventListener('click', toggleZoom);
    closeButton.addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => {
      picture.removeAttribute('src');
      picture.hidden = true;
      picture.alt = '';
      caption.textContent = '';
      document.documentElement.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    });
    picture.addEventListener('load', () => { if (viewer.open) sizeImage(); });
    picture.addEventListener('error', () => {
      if (!viewer.open || !picture.hasAttribute('src')) return;
      picture.hidden = true;
      zoomButton.disabled = true;
      status.textContent = 'This image could not load. Close the preview and try again.';
    });
    window.addEventListener('resize', sizeImage);
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = imageLink(event.target);
    if (!link) return;
    // A protected image only opens after the authenticated loader has supplied its blob URL.
    if (link.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
    if (!viewer) createViewer();
    if (typeof viewer.showModal !== 'function') return;
    event.preventDefault();
    const thumbnail = link.querySelector('img');
    opener = link;
    zoomed = false;
    picture.hidden = true;
    picture.style.removeProperty('width');
    picture.style.removeProperty('height');
    zoomButton.disabled = true;
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.querySelector('span').textContent = 'Zoom in';
    status.textContent = 'Loading image…';
    caption.textContent = link.closest('figure')?.querySelector('figcaption')?.textContent.trim() || thumbnail.alt || '';
    picture.alt = thumbnail.alt || 'Case study image';
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    viewer.showModal();
    closeButton.focus({ preventScroll: true });
    viewport.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    picture.src = link.dataset.fullImage || link.href;
    if (picture.complete && picture.naturalWidth) sizeImage();
  });

  function prepareLinks() {
    // Locking or session expiry removes the private content and closes its preview too.
    if (viewer?.open && opener && !opener.isConnected) viewer.close();
    document.querySelectorAll('a[href], a[data-private-href]').forEach(link => {
      if (!imageLink(link)) return;
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-label', `Enlarge image: ${link.querySelector('img').alt || 'Case study image'}`);
    });
  }
  prepareLinks();
  document.addEventListener('case-content-ready', prepareLinks);
})();
