(() => {
  document.documentElement.classList.add('media-ready');
  document.querySelectorAll('.media-stage img').forEach(image => {
    const stage = image.closest('.media-stage');
    const status = stage.querySelector('.media-status');
    const loaded = () => {
      if (image.naturalWidth > 0) {
        stage.classList.add('is-loaded');
        stage.classList.remove('is-error');
      }
    };
    const failed = () => {
      if (image.dataset.fallback && !image.dataset.triedFallback) {
        image.dataset.triedFallback = 'true';
        image.src = image.dataset.fallback;
        return;
      }
      stage.classList.remove('is-loaded');
      stage.classList.add('is-error');
      if (status) status.textContent = 'Image unavailable. Open the image to retry ↗';
    };
    image.addEventListener('load', loaded);
    image.addEventListener('error', failed);
    if (image.complete) image.naturalWidth ? loaded() : failed();
  });
})();
