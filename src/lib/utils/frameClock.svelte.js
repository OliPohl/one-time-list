// src/lib/utils/frameClock.svelte.js
// The current time, updated on every animation frame while something reads it, for movements that have
// to be smooth (progress borders and bars). Nothing runs while nobody reads it.

import { createSubscriber } from 'svelte/reactivity';

let now = Date.now();

const subscribe = createSubscriber((update) => {
  /** @type {number} */
  let frame;
  const loop = () => {
    now = Date.now();
    update();
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
});

export const frameClock = {
  /** Read it in a `$derived` or an effect to get updates every frame. */
  get now() {
    subscribe();
    return now;
  }
};
