// src/lib/utils/id.js

/**
 * Short random id that `isTaken` doesn't know yet.
 * @param {(id: string) => boolean} [isTaken]
 */
export function uniqueId(isTaken = () => false) {
  let id;
  do {
    id = Math.random().toString(36).substring(2, 8);
  } while (isTaken(id));
  return id;
}
