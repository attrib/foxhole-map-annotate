const fs = require("fs");
const {featureUpdater} = require("./updater");
const hash = require('object-hash');

const FEATURE_FILE = __dirname + '/../data/features.json'

function loadFeatures() {
  if (!fs.existsSync(FEATURE_FILE)) {
    return defaultFeatures()
  }
  const content = fs.readFileSync(FEATURE_FILE, 'utf8')
  const parsed = JSON.parse(content)
  return featureUpdater(parsed)
}

function defaultFeatures() {
  if (!fs.existsSync(__dirname + '/../data/defaultFeatures.json')) {
    return {
      type: 'FeatureCollection',
      features: [],
    }
  }
  const content = fs.readFileSync(__dirname + '/../data/defaultFeatures.json', 'utf8')
  const parsed = JSON.parse(content)
  parsed.features.forEach((feature) => {
    feature.properties.time = (new Date()).toISOString()
  })
  return featureUpdater(parsed)
}

function saveFeatures(features) {
  features.hash = hash(features)
  fs.writeFile(FEATURE_FILE, JSON.stringify(features), err => {
    if (err) {
      console.error(err);
    }
  });
}

module.exports = {loadFeatures, saveFeatures, defaultFeatures}