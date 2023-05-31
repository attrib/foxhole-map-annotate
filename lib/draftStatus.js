const draftTimeOut = 60000 // 1 minute

class DraftStatus {

  active = false
  timeEnd =  null
  draftOrder =  []
  activeDraft = null
  listeners = []
  timer = null

  nextDraft = () => {
    if (this.timer) {
      clearTimeout(this.timer)
    }

    console.log(this.activeDraft, this.draftOrder.length)
    if (this.activeDraft === null) {
      this.activeDraft = 0
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
    this.timeEnd = (new Date()).getTime() + draftTimeOut
    this.activeDraft = null
    this.nextDraft()
  }

  stopDraft = () => {
    this.active = false
    this.timeEnd = null
    this.activeDraft = null
    this.emit()
  }

  data = () => {
    return {
      active: this.active,
      timeEnd: this.timeEnd,
      draftOrder: this.draftOrder,
      activeDraft: this.activeDraft
    }
  }

  on = (callback) => {
    this.listeners.push(callback)
  }

  emit = () => {
    console.log('emit', this.data())
    for (const listener of this.listeners) {
      listener(this.data())
    }
  }

}

module.exports = new DraftStatus()