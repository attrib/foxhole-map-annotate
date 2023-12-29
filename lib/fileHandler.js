import fs from "node:fs";

/** @type{Record<string, NodeJS.Timeout>} */
const timers = {};

/**
 * Synthetic delay to debounce file writes
 * @param {string} file
 * @param {unknown} data
 * @param {number} delay
 * @param {boolean} formatted
 * @returns {void}
 */
export function delayedSave(file, data, delay = 1000, formatted = true) {
  if (file in timers) {
    return;
  }
  timers[file] = setTimeout(() => {
    // !! Blocking
    fs.writeFile(
      file,
      // !! Throws
      formatted ? JSON.stringify(data, null, 2) : JSON.stringify(data),
      (err) => {
        delete timers[file];
        if (err) {
          console.error(err);
        }
      }
    );
  }, delay);
}
