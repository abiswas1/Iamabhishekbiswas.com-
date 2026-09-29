// Mirror the homepage's accessible tap-to-highlight icon interaction.
document.querySelectorAll('.expected-impact-grid .impact-icon').forEach(button => {
  button.addEventListener('click', () => {
    button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  });
});
