const fs = require("fs");
const warapi = require('./warapi')
const readLastLines = require('read-last-lines');

const EVENTLOG_FILE = __dirname + '/../data/eventlog.json'

class EventLog {

  lastLogs = []

  constructor() {
    this.stream = fs.createWriteStream(EVENTLOG_FILE, {flags: 'a+'});
    warapi.on(warapi.EVENT_WAR_PREPARE, this.rollover)
    this.getLastLines().then((logs) => {
      this.lastLogs = logs
    })
  }

  logEvent = (data) => {
    data.eventTime = (new Date()).toISOString();
    if (this.stream.writable) {
      this.stream.write(JSON.stringify(data) + "\n");
    }
    if (this.lastLogs.unshift(data) > 200) {
      this.lastLogs = this.lastLogs.slice(0, 200)
    }
  }

  rollover = ({oldData, newData}) => {
    const oldWarDir = __dirname + `/../data/war${oldData.warNumber}`
    // backup old data
    if (!fs.existsSync(oldWarDir)) {
      fs.mkdirSync(oldWarDir)
    }
    this.stream.close(() => {
      fs.cpSync(EVENTLOG_FILE, oldWarDir + '/eventlog.json')
      fs.rmSync(EVENTLOG_FILE)
      this.stream = fs.createWriteStream(EVENTLOG_FILE, {flags: 'a+'});
    })
  }

  getLastLines = () => {
    return readLastLines.read(EVENTLOG_FILE, 200).then((lines) => {
      lines = lines.split("\n")
      lines = lines.filter((line) => line.length > 0)
      return lines.map((line) => {
        try {
          return JSON.parse(line)
        } catch (e) {
          return line;
        }
      }).reverse()
    })
  }

}

module.exports = new EventLog()