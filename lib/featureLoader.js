const fs = require("fs");
const {trackUpdater, iconUpdater, featureUpdater} = require("./updater");
const hash = require('object-hash');

const FEATURE_FILE = __dirname + '/../data/features.json'

function loadFeatures() {
  if (!fs.existsSync(FEATURE_FILE)) {
    return loadOldFeatures()
  }
  const content = fs.readFileSync(FEATURE_FILE, 'utf8')
  const parsed = JSON.parse(content)
  return featureUpdater(parsed)
}

function loadOldFeatures() {
  let tracks, icons;
  const trackFileName = __dirname + '/../data/tracks.json';
  const iconFileName = __dirname + '/../data/icons.json';
  if (fs.existsSync(trackFileName)) {
    tracks = JSON.parse(fs.readFileSync(trackFileName, 'utf8'));
    tracks = trackUpdater(tracks)
  }
  else {
    tracks = {
      type: 'FeatureCollection',
      features: [],
    }
  }
  if (fs.existsSync(iconFileName)) {
    icons = JSON.parse(fs.readFileSync(iconFileName, 'utf8'));
    icons = iconUpdater(icons)
  }
  else {
    icons = {
      type: 'FeatureCollection',
      features: [],
    }
  }
  const features = {
    type: 'FeatureCollection',
    features: [...tracks.features, ...icons.features],
  }
  saveFeatures(features)
  if (features.features.length > 0) {
    fs.rmSync(trackFileName)
    fs.rmSync(iconFileName)
  }
  return featureUpdater(features)
}

function saveFeatures(features) {
  features.hash = hash(features)
  fs.writeFile(FEATURE_FILE, JSON.stringify(features), err => {
    if (err) {
      console.error(err);
    }
  });
}

module.exports = {loadFeatures, saveFeatures}