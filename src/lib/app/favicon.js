// src/lib/app/favicon.js
// The tab's icon in the colors of what's shown (AppShell): the book of src/lib/assets/favicon.svg, its cover in the
// accent color, the check in the wave color. favicon.svg is the icon until the app has loaded.

/** @param {string} cover @param {string} check */
function faviconSvg(cover, check) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M14 4h38a6 6 0 0 1 6 6v44a6 6 0 0 1-6 6H14a8 8 0 0 1-8-8V12a8 8 0 0 1 8-8z" fill="${cover}" stroke="#1e1e1e" stroke-width="4.5"/>
  <rect x="17" y="4" width="4.5" height="56" fill="#1e1e1e"/>
  <path d="M40 4h10v14l-5-4.5-5 4.5z" fill="#1e1e1e"/>
  <path d="M28 32.5l6.5 6.5L47 25.5" fill="none" stroke="${check}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/**
 * Shows the icon in the colors `element` has (its `--accent` and `--wave`).
 * @param {Element} element
 */
export function showFavicon(element) {
  const style = getComputedStyle(element);
  const cover = style.getPropertyValue('--accent').trim();
  const check = style.getPropertyValue('--wave').trim();
  const link = /** @type {HTMLLinkElement | null} */ (document.querySelector('link[rel="icon"]'));
  if (!link || !cover || !check) return;
  const href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(cover, check))}`;
  if (link.href !== href) link.href = href;
}
