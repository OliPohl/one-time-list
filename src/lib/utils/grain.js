// src/lib/utils/grain.js
// Film grain texture as an SVG image (feTurbulence noise turned into speckles of one color).
// The image is rendered once by the browser and then tiled, so it's cheap to use on animated elements.

export const GRAIN_SIZE = 240;

/**
 * @param {string} [hex] color of the speckles, "#rrggbb"
 * @param {number} [opacity] multiplies the speckle alpha
 */
export function grainDataUri(hex = '#ffffff', opacity = 1) {
  const [r, g, b] = [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${GRAIN_SIZE}' height='${GRAIN_SIZE}'>
<filter id='f' color-interpolation-filters='sRGB'>
<feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3' stitchTiles='stitch'/>
<feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${2.2 * opacity} 0 0 0 ${-0.9 * opacity}'/>
</filter>
<rect width='100%' height='100%' filter='url(#f)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** For CSS: `background-image` or `mask-image`. @param {string} [hex] @param {number} [opacity] */
export const grainUrl = (hex, opacity) => `url("${grainDataUri(hex, opacity)}")`;
