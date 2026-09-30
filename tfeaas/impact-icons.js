// Mirror the homepage's accessible tap-to-highlight icon interaction.
document.addEventListener('click', event => {
  const button = event.target.closest('.expected-impact-grid .impact-icon');
  if (button) button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
});
