import fs from "node:fs";
import path from "node:path";

const draftTimeOut = 60000 // 1 minute
const initialTimeOut = 300000 // 5 minutes
const draftFile = path.resolve('data/draftStatus.json')

class DraftStatus {

  active = false
  timeEnd =  null
  draftOrder =  []
  activeDraft = null
  listeners = []
  timer = null
  draftUrl = ''

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
      this.emit()
      return
    }
    this.timeEnd = (new Date()).getTime() + draftTimeOut
    this.emit()
    this.timer = setTimeout(this.nextDraft, draftTimeOut)
  }

  startDraft = () => {
    this.active = true
    this.timeEnd = (new Date()).getTime() + initialTimeOut
    this.activeDraft = null
    this.timer = setTimeout(this.nextDraft, initialTimeOut)
    this.emit()
  }

  stopDraft = () => {
    this.active = false
    this.timeEnd = null
    this.activeDraft = null
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.emit()
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
    fs.writeFileSync(draftFile, JSON.stringify(this.data(), null, 2))
  }

  on = (callback) => {
    this.listeners.push(callback)
  }

  emit = () => {
    for (const listener of this.listeners) {
      listener(this.data())
    }
  }

}

const draftState = new DraftStatus()

if (fs.existsSync(draftFile)) {
  const data = JSON.parse(fs.readFileSync(draftFile, 'utf8'))
  for (const key in data) {
    draftState[key] = data[key]
  }
  if (draftState.active) {
    draftState.timeEnd = (new Date()).getTime() + draftTimeOut
    draftState.timer = setTimeout(draftState.nextDraft, draftTimeOut)
  }
}

export default draftState;
