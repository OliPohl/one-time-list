// src/lib/sounds.js
// Small synthesized sound effects (Web Audio API, no audio files).
// Browsers only allow audio after a user interaction, so the context is unlocked on the first one.

/** @type {AudioContext | undefined} */
let context;

/** @param {boolean} [create] false only reuses an already unlocked context */
function getContext(create = true) {
  if (!context) {
    if (!create) return undefined;
    const AudioContextClass = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (!AudioContextClass) return undefined;
    context = new AudioContextClass();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

/** True when sounds can play now (or right after the context resumes during a user interaction). */
function canPlay(/** @type {AudioContext | undefined} */ audio) {
  if (!audio) return false;
  return audio.state === 'running' || Boolean(navigator.userActivation?.isActive);
}

/** Creates the audio context on the first user interaction so later sounds can play. */
export function unlockAudio() {
  const unlock = () => {
    getContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/**
 * Plays a single note with a soft attack and decay.
 * @param {AudioContext} audio
 * @param {number} frequency
 * @param {number} start seconds from now
 * @param {number} duration seconds
 * @param {{type?: OscillatorType, volume?: number}} [options]
 */
function note(audio, frequency, start, duration, { type = 'sine', volume = 0.2 } = {}) {
  const time = audio.currentTime + start;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.05);
}

/** Short rising two-note chime for a completed task. */
export function playComplete() {
  const audio = getContext();
  if (!audio || !canPlay(audio)) return;

  note(audio, 880, 0, 0.25, { type: 'triangle' });
  note(audio, 1318.5, 0.1, 0.45, { type: 'triangle' });
}

/** Three quick beeps for a finished timer or a ringing alarm. */
export function playAlarm() {
  // Alarms fire without a user interaction, so they never create the context themselves.
  const audio = getContext(false);
  if (!audio || !canPlay(audio)) return;

  for (let i = 0; i < 3; i++) {
    note(audio, 1046.5, i * 0.22, 0.18, { type: 'square', volume: 0.08 });
  }
}
