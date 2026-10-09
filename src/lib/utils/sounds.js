// src/lib/utils/sounds.js
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

/** @type {BiquadFilterNode | undefined} */
let softener;

/** Low-pass filter shared by all notes, takes the harsh top off the tones. @param {AudioContext} audio */
function output(audio) {
  if (!softener) {
    softener = audio.createBiquadFilter();
    softener.type = 'lowpass';
    softener.frequency.value = 2200;
    softener.Q.value = 0.5;
    softener.connect(audio.destination);
  }
  return softener;
}

/**
 * Plays a soft bell-like note: a sine tone plus a quiet overtone, slow fade in and long fade out.
 * @param {AudioContext} audio
 * @param {number} frequency
 * @param {number} start seconds from now
 * @param {number} duration seconds until the note has faded out
 * @param {number} [volume]
 * @param {AudioNode} [destination]
 */
function note(audio, frequency, start, duration, volume = 0.12, destination = output(audio)) {
  const time = audio.currentTime + start;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  gain.connect(destination);

  // Fundamental plus a faint octave for warmth.
  for (const [multiple, level] of [[1, 1], [2, 0.15]]) {
    const oscillator = audio.createOscillator();
    const partGain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency * multiple;
    partGain.gain.value = level;
    oscillator.connect(partGain).connect(gain);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
  }
}

/** Gentle rising two-note chime for a completed task. */
export function playComplete() {
  const audio = getContext();
  if (!audio || !canPlay(audio)) return;

  note(audio, 523.25, 0, 0.9); // C5
  note(audio, 783.99, 0.12, 1.3); // G5
}

/**
 * Soft three-note chime for a finished timer or a ringing alarm.
 * @returns {() => void} stops the chime right away (a very short fade, so it doesn't click)
 */
export function playAlarm() {
  // Alarms fire without a user interaction, so they never create the context themselves.
  const audio = getContext(false);
  if (!audio || !canPlay(audio)) return () => {};

  // The notes play through their own volume control, so stopping can mute them all at once.
  const chime = audio.createGain();
  chime.connect(output(audio));

  note(audio, 659.25, 0, 1.2, undefined, chime); // E5
  note(audio, 783.99, 0.3, 1.2, undefined, chime); // G5
  note(audio, 1046.5, 0.6, 1.8, undefined, chime); // C6

  return () => {
    chime.gain.cancelScheduledValues(audio.currentTime);
    chime.gain.setTargetAtTime(0, audio.currentTime, 0.015);
    setTimeout(() => chime.disconnect(), 200);
  };
}
