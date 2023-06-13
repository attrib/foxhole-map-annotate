const fs = require("fs")

const content = fs.readFileSync(__dirname + '/../data/eventlog.json', 'utf8')
const war = JSON.parse(fs.readFileSync(__dirname + '/../data/wardata.json', 'utf8'))
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

//console.log(byEvent)

let csvContent = 'discordId;username;total;featureAdd;featureUpdate;featureDelete;decayUpdate;flag;configChange' + "\n"
let users = []
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
  users.push(line)
  csvContent += line.join(';') + "\n"
}

users = users.sort((a, b) => {
  return b[2] - a[2]
});

//fs.writeFileSync('user.csv', csvContent)

const days = Math.round((war.conquestEndTime - war.conquestStartTime) / 1000 / 60 / 60 / 24)

console.log(`
**World Conquest ${war.warNumber} WE Stats**

World Conquest ${war.warNumber} ended after ${days} days.

Some stats from warden.express side.

We tracked ${eventlog.length} Events by ${users.length} users over this time span. Divided up into:

* ${byEvent.featureAdd} Feature additions
* ${byEvent.featureUpdate} Feature updates
* ${byEvent.featureDelete} Feature deletions
* ${byEvent.decayUpdate} Decay updates

Thank you all for your contributions and using warden.express!

As always special thanks to the mod team and lines maids.

In addition thanks to ${users.slice(0, 3).map((user) => {
  return `<@${user[0]}>`
}).join(', ')} who are responsible for over ${Math.round((users[0][2] + users[1][2] + users[2][2]) / eventlog.length * 100)}% of all the events!
`)