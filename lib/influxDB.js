const {InfluxDB, Point} = require('@influxdata/influxdb-client')
const onFinished = require('on-finished');
const warapi = require('./warapi')

const token = process.env.INFLUXDB_TOKEN
const url = process.env.INFLUXDB_URL
const org = process.env.INFLUXDB_ORG

const client = new InfluxDB({url, token})

const middleWareClient = client.getWriteApi(org, 'middleware', 'ns')

let waitForWrite = null

function writePoint(point) {
  middleWareClient.writePoint(point)
  if (waitForWrite === null) {
    waitForWrite = setTimeout(flush, 15000)
  }
}

function flush() {
  waitForWrite = null
  middleWareClient.flush().catch((e) => {
    console.log('Error while flushing points', e)
  })
}

module.exports.middleware = function(req, res, next){
  req._START_TIME = new Date()
  onFinished(res, function(err){
    if(err){
      console.error(err);
    }
    const point = new Point('response_time')
      .tag('url', req.originalUrl)
      .tag('method', req.method)
      .tag('responseStatus', res.statusCode)
      .intField('duration', Date.now() - req._START_TIME.getTime())
      .timestamp(req._START_TIME)

    writePoint(point)
  })
  next()
}

module.exports.writePoint = function(point) {
  point.tag('war', warapi.warData.warNumber)
  writePoint(point)
}