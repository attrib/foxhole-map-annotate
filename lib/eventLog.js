import fs from "node:fs";
import { resolve } from "node:path";

import readLastLines from "read-last-lines";

import warapi from "./warapi.js";

const EVENTLOG_FILE = resolve("data/eventlog.json");

class EventLog {
  /** @type{EventLogData[]} */
  lastLogs = [];

  constructor() {
    this.stream = fs.createWriteStream(EVENTLOG_FILE, { flags: "a+" });
    warapi.on(warapi.EVENT_WAR_PREPARE, this.rollover);
    this.stream.on("open", () => {
      void this.getLastLines().then((logs) => {
        this.lastLogs = logs;
      });
    });
  }

  /**
   * Logs an event to the event log
   * @param {EventLogData} data
   * @returns {void}
   */
  logEvent = (data) => {
    data.eventTime = new Date().toISOString();
    if (this.stream.writable) {
      // !! Throws
      this.stream.write(JSON.stringify(data) + "\n");
    }
    if (this.lastLogs.unshift(data) > 200) {
      this.lastLogs = this.lastLogs.slice(0, 200);
    }
  };

  /**
   * Closes up the previous war's event log and starts a new one
   * @param {import("./warapi.js").WarEventData} data
   */
  rollover = ({ oldData, newData }) => {
    const oldWarDir = resolve(`data/war${oldData.warNumber}`);
    // backup old data
    // !! Blocking
    if (!fs.existsSync(oldWarDir)) {
      // !! Throws
      fs.mkdirSync(oldWarDir);
    }
    this.stream.close(() => {
      // !! Blocking
      // !! Throws
      fs.cpSync(EVENTLOG_FILE, `${oldWarDir}/eventlog.json`);
      // !! Blocking
      // !! Throws
      fs.rmSync(EVENTLOG_FILE);
      this.stream = fs.createWriteStream(EVENTLOG_FILE, { flags: "a+" });
    });
  };

  /**
   * Reads the last 200 lines of the event log
   * @returns {Promise<EventLogData[]>}
   */
  getLastLines = async () => {
    return await readLastLines.read(EVENTLOG_FILE, 200).then((lines) => {
      return /** @type{EventLogData[]} */ (
        lines //
          .split("\n") //
          .filter((line) => line.length > 0) //
          .map((line) => {
            try {
              return /** @type{EventLogData} */ (JSON.parse(line));
            } catch (error) {
              console.error(error);
              console.warn(line);
              return null;
            }
          })
          .filter(Boolean)
          .reverse()
      );
    });
  };
}

export default new EventLog();

/**
 * Event Log Data
 * @typedef {object} EventLogData
 * @property {string} [eventTime]
 * @property {string} type
 * @property {string} user
 * @property {string} userId
 * @property {unknown} data
 */
