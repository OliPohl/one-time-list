// src/lib/pages/whiteboard/embeds.js
// Web embeds on a whiteboard (a YouTube video, ...). Excalidraw loads YouTube from youtube.com, which sets cookies;
// here YouTube videos load from youtube-nocookie.com instead, YouTube's own privacy-enhanced player. See
// `renderEmbeddable` in Whiteboard.svelte.

/** YouTube links as Excalidraw recognizes them (its RE_YOUTUBE): the kind of link, the id, a start time. */
const RE_YOUTUBE =
  /^(?:http(?:s)?:\/\/)?(?:www\.)?youtu(?:be\.com|\.be)\/(embed\/|watch\?v=|shorts\/|playlist\?list=|embed\/videoseries\?list=)?([a-zA-Z0-9_-]+)(?:\?t=|&t=|\?start=|&start=)?([a-zA-Z0-9_-]+)?[^\s]*$/;

/**
 * The address of a YouTube link's player on youtube-nocookie.com, like Excalidraw's for youtube.com. Null for a link
 * that isn't YouTube's.
 * @param {string | null} link
 */
export function youtubeNoCookie(link) {
  const match = link?.match(RE_YOUTUBE);
  if (!match?.[2]) return null;
  const start = match[3] ? `?start=${match[3]}` : '';
  const playlist = match[1] === 'playlist?list=' || match[1] === 'embed/videoseries?list=';
  return playlist
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${match[2]}${start.replace('?', '&')}`
    : `https://www.youtube-nocookie.com/embed/${match[2]}${start}`;
}
