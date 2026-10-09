// src/lib/utils/syncAnimations.js
// Every endless animation (blinking borders, bars, buttons, sidebar rows) runs on one shared clock,
// so things that blink together stay in step no matter when they appeared.

/** @param {AnimationEvent} event */
function align(event) {
  const target = /** @type {Element} */ (event.target);
  for (const animation of target.getAnimations()) {
    // Animations that end (fades, drop-ins) keep their own start.
    if (animation.effect?.getTiming().iterations !== Infinity) continue;
    // A start time of 0 lines the animation up with the page's timeline, the same phase for all of them.
    animation.startTime = 0;
  }
}

/** Starts aligning animations, returns a function that stops it. */
export function syncAnimations() {
  document.addEventListener('animationstart', align);
  return () => document.removeEventListener('animationstart', align);
}
