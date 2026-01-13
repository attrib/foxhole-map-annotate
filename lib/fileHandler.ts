import fs from "node:fs";

const timers: Record<string, string> = {};

/**
 * Synthetic delay to debounce file writes
 */
export function delayedSave(file: string, data: unknown, delay: number = 1000, formatted: boolean = true): void {
  const formattedData: string = formatted ? JSON.stringify(data, null, 2) : JSON.stringify(data);

  if (file in timers) {
    timers[file] = formattedData;
    return;
  }

  timers[file] = formattedData;

  setTimeout(() => {
    try {
      fs.writeFileSync(file, dataToWrite, "utf-8");
    } catch (err) {
      console.error("Error writing file:", err);
    } finally {
      delete timers[file];
    }
  }, delay);
}
