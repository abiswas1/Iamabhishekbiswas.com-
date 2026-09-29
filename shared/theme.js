(() => {
  const key = 'portfolio-color-theme';
  const root = document.documentElement;
  let theme = 'light';
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch (_) {}
  // Runs in the head so the saved theme is selected before the page is painted.
  root.dataset.theme = theme;

  function apply(next, persist = false) {
    theme = next === 'light' ? 'light' : 'dark';
    root.dataset.theme = theme;
    const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.setAttribute('aria-label', label);
      button.title = label;
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#111b19' : '#f4f5f1';
    if (persist) { try { localStorage.setItem(key, theme); } catch (_) {} }
  }
  function ready() {
    apply(theme);
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.addEventListener('click', () => apply(theme === 'dark' ? 'light' : 'dark', true));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  // Back/forward cache restores skip DOMContentLoaded; another page may have changed the preference.
  window.addEventListener('pageshow', () => {
    let saved = theme;
    try { const value = localStorage.getItem(key); if (value === 'light' || value === 'dark') saved = value; } catch (_) {}
    apply(saved);
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue === 'dark' ? 'dark' : 'light');
  });
})();
