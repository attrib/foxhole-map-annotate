import fs from "node:fs";
import path from "node:path";
import EventEmitter from "node:events";

import { delayedSave } from "./fileHandler.js";

const draftTimeOut = 60_000 // 1 minute
const initialTimeOut = 300_000 // 5 minutes
const draftFile = path.resolve('data/draftStatus.json')

class DraftStatus extends EventEmitter {
  /** @type{boolean} */
  active;
  /** @type{?number} */
  timeEnd;
  /** @type{DraftEntry[]} */
  draftOrder;
  /** @type{?number} */
  activeDraft;
  /** @type{?NodeJS.Timeout} */
  timer;
  /** @type{string} */
  draftUrl;

  constructor() {
    super();
    this.active = false;
    this.timeEnd = null;
    this.draftOrder = [];
    this.activeDraft = null;
    this.timer = null;
    this.draftUrl = "";
  }

  nextDraft = (confirmed = false) => {
    if (this.timer) {
      clearTimeout(this.timer)
    }

    if (this.activeDraft === null) {
      this.activeDraft = 0
    }
    else if (!confirmed) {
      // not confirmed, has a chance again
      const lastDraft = this.draftOrder.splice(this.activeDraft, 1)
      this.draftOrder.splice(this.activeDraft + 1, 0, ...lastDraft)
    }
    else {
      this.activeDraft++
    }
    if (this.activeDraft >= this.draftOrder.length) {
      this.active = false
      this.timeEnd = null
      this.activeDraft = null
      this.emit("draftUpdate")
      return
    }
    this.timeEnd = (new Date()).getTime() + draftTimeOut
    this.emit("draftUpdate")
    this.timer = setTimeout(this.nextDraft, draftTimeOut)
  }

  startDraft = () => {
    this.active = true
    this.timeEnd = (new Date()).getTime() + initialTimeOut
    this.activeDraft = null
    this.timer = setTimeout(this.nextDraft, initialTimeOut)
    this.emit("draftUpdate")
  }

  stopDraft = () => {
    this.active = false
    this.timeEnd = null
    this.activeDraft = null
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.emit("draftUpdate")
  }

  data = () => {
    return {
      active: this.active,
      timeEnd: this.timeEnd,
      draftOrder: this.draftOrder,
      activeDraft: this.activeDraft,
      draftUrl: this.draftUrl,
    }
  }

  save = () => {
    delayedSave(draftFile, this.data())
  }

  /**
   * @param {"draftUpdate" | symbol | (string & NonNullable<object>)} eventName
   * @param {(arg0: DraftData) => void} callback
   */
  on(eventName, callback) {
    return super.on(eventName, callback);
  }

  /**
   * @param {"draftUpdate" | symbol | (string & NonNullable<object>)} eventName
   */
  emit(eventName) {
    return super.emit(eventName, this.data);
  }
}

const draftState = new DraftStatus()

try {
  const data = await fs.promises.readFile(draftFile, "utf8");
  try {
    const parsed = /** @type{DraftData} */ (JSON.parse(data));
    draftState.active = parsed.active;
    draftState.timeEnd = parsed.timeEnd;
    draftState.draftOrder = parsed.draftOrder;
    draftState.activeDraft = parsed.activeDraft;
    draftState.draftUrl = parsed.draftUrl;
    if (draftState.active) {
      if (draftState.timer !== null) {
        clearTimeout(draftState.timer);
        draftState.timer = null;
      }
      draftState.timeEnd = Date.now() + draftTimeOut;
      draftState.timer = setTimeout(draftState.nextDraft, draftTimeOut);
    }
  } catch (error) {
    console.warn(
      "[Draft Status]: Failed to parse draft status file",
      error
    );
  }
} catch (error) {
  console.warn("[Draft Status]: No stored draft status file");
}

export default draftState;

/**
 * Draft Data
 * @typedef {object} DraftData
 * @property {boolean} active
 * @property {?number} timeEnd
 * @property {DraftEntry[]} draftOrder
 * @property {?number} activeDraft
 * @property {string} draftUrl
 */

/**
 * Draft Entry
 * @typedef {object} DraftEntry
 * @property {?string} discordId
 * @property {?string} userId
 * @property {string} name
 */