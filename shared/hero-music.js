(() => {
  const root = document.querySelector('.hero-music');
  if (!root || new URLSearchParams(location.search).get('music-preview') !== '1') return;
  // UI preview only: no source is loaded and no playback is represented as real audio.
  root.hidden = false;
  const player = root;
  const play = root.querySelector('.music-play');
  const stop = root.querySelector('.music-stop');
  const volume = root.querySelector('.music-volume');
  const popover = root.querySelector('.music-volume-popover');
  const mute = root.querySelector('.music-mute');
  const range = root.querySelector('.music-volume-range');
  const status = root.querySelector('.music-sr-status');
  const more = root.querySelector('.music-more');
  let state = 'stopped';
  let savedVolume = 35;

  function paintPlayback(next) {
    state = next;
    player.dataset.state = state;
    const playing = state === 'playing';
    play.querySelector('.music-play-symbol').hidden = playing;
    play.querySelector('.music-pause-symbol').hidden = !playing;
    play.querySelector('.music-equalizer').hidden = !playing;
    play.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    play.title = playing ? 'Pause preview (no audio)' : 'Play preview (no audio)';
    stop.disabled = state === 'stopped';
    status.textContent = `${playing ? 'Playing preview' : state === 'paused' ? 'Paused preview' : 'Stopped; returned to the beginning'}. No audio is attached.`;
  }
  function paintVolume() {
    const level = Number(range.value);
    const silent = level === 0;
    if (level > 0) savedVolume = level;
    range.style.setProperty('--music-volume-fill', `${level}%`);
    range.setAttribute('aria-valuetext', `${level} percent`);
    mute.setAttribute('aria-pressed', String(silent));
    mute.setAttribute('aria-label', silent ? 'Unmute music' : 'Mute music');
    mute.title = silent ? 'Unmute' : 'Mute';
    volume.setAttribute('aria-label', `Adjust volume, ${silent ? 'muted' : `${level} percent`}`);
    root.querySelectorAll('.music-audible-symbol').forEach(icon => { icon.hidden = silent; });
    root.querySelectorAll('.music-muted-symbol').forEach(icon => { icon.hidden = !silent; });
  }
  function showVolume(open) {
    popover.hidden = !open;
    volume.setAttribute('aria-expanded', String(open));
  }
  function showControls(open) {
    more.hidden = !open;
    play.setAttribute('aria-expanded', String(open));
    if (!open) showVolume(false);
  }
  play.addEventListener('click', () => {
    paintPlayback(state === 'playing' ? 'paused' : 'playing');
    showControls(true);
  });
  stop.addEventListener('click', () => { paintPlayback('stopped'); showControls(false); play.focus({preventScroll:true}); });
  volume.addEventListener('click', () => showVolume(popover.hidden));
  range.addEventListener('input', paintVolume);
  mute.addEventListener('click', () => { range.value = Number(range.value) === 0 ? String(savedVolume) : '0'; paintVolume(); });
  document.addEventListener('click', event => {
    if (!root.contains(event.target)) showControls(false);
    else if (!root.querySelector('.music-volume-wrap').contains(event.target)) showVolume(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!popover.hidden) { showVolume(false); volume.focus({preventScroll:true}); }
    else if (!more.hidden) { showControls(false); play.focus({preventScroll:true}); }
  });
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) showControls(false); });
  window.addEventListener('pagehide', () => { paintPlayback('stopped'); showControls(false); });
  paintPlayback('stopped');
  paintVolume();
})();
