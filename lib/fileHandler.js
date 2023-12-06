import fs from "node:fs";


const timers = {}

export function delayedSave(file, data, delay = 1000, formatted = true) {
  if (file in timers) {
    return
  }
  timers[file] = setTimeout(() => {
    fs.writeFile(file, formatted ? JSON.stringify(data, null, 2) : JSON.stringify(data), err => {
      delete timers[file]
      if (err) {
        console.error(err);
      }
    });
  }, delay);
}