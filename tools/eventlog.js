const fs = require("fs")

const content = fs.readFileSync(__dirname + '/../data/eventlog.json', 'utf8')
const eventlog = []

for (let line of content.split("\n")) {
  if (line.length > 0) {
    eventlog.push(JSON.parse(line))
  }
}

console.log('Events: ' + eventlog.length)

const byEvent = {}
const byUser = {}
for (let line of eventlog) {
  if (!(line.userId in byUser)) {
    byUser[line.userId] = {
      id: line.userId,
      events: {},
      total: 0,
      name: line.user
    }
  }
  if (!(line.type in byUser[line.userId].events)) {
    byUser[line.userId].events[line.type] = 0
  }
  byUser[line.userId].events[line.type]++
  byUser[line.userId].total++

  if (!(line.type in byEvent)) {
    byEvent[line.type] = 0
  }
  byEvent[line.type]++
}

console.log(byEvent)

let csvContent = 'discordId;username;total;featureAdd;featureUpdate;featureDelete;decayUpdate;flag;configChange' + "\n"
for (let userId in byUser) {
  const user = byUser[userId]
  let line = [
    userId,
    user.name,
    user.total,
    user.events.featureAdd || 0,
    user.events.featureUpdate || 0,
    user.events.featureDelete || 0,
    user.events.decayUpdate || 0,
    user.events.flag || 0,
    user.events.configChange || 0,
  ]
  csvContent += line.join(';') + "\n"
}

fs.writeFileSync('user.csv', csvContent)