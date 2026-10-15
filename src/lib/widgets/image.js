// src/lib/widgets/image.js
// Uploaded images for the image widget. They're saved in the browser's storage with the widget, which only holds a
// few megabytes for the whole app, so a photo is made smaller first: at most MAX_SIDE pixels wide and high, as WebP
// (JPEG where the browser can't write WebP). SVGs and GIFs are kept as they are (sharp, animated) while they're small.

/** Longest side of an uploaded image, in pixels. */
const MAX_SIDE = 1600;
/** SVGs and GIFs up to this size (bytes) are kept as they are. */
const KEEP_AS_IS = 512 * 1024;
const QUALITY = 0.85;

/** @param {Blob} blob @returns {Promise<string>} */
function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(/** @type {string} */ (reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** @param {string} src @returns {Promise<HTMLImageElement>} */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The file is not an image the browser can show.'));
    image.src = src;
  });
}

/**
 * An uploaded image file as a data URL to save with the widget, made smaller (see above).
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function imageFileToDataUrl(file) {
  if ((file.type === 'image/svg+xml' || file.type === 'image/gif') && file.size <= KEEP_AS_IS) return readAsDataUrl(file);

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL('image/webp', QUALITY);
    // A browser that can't write WebP gives a PNG instead, often much bigger.
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Whether a typed link can be an image: a web address (http or https). @param {string} text */
export function isImageLink(text) {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
