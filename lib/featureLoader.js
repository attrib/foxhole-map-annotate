import fs from "node:fs";
import path from "node:path";

import hash from "object-hash";

import { featureUpdater } from "./updater.js";

const FEATURE_FILE = path.resolve('data/features.json')

export function loadFeatures() {
  if (!fs.existsSync(FEATURE_FILE)) {
    return defaultFeatures()
  }
  const content = fs.readFileSync(FEATURE_FILE, 'utf8')
  const parsed = JSON.parse(content)
  return featureUpdater(parsed)
}

export function defaultFeatures() {
  if (!fs.existsSync(path.resolve('data/defaultFeatures.json'))) {
    return {
      type: 'FeatureCollection',
      features: [],
    }
  }
  const content = fs.readFileSync(path.resolve('data/defaultFeatures.json'), 'utf8')
  const parsed = JSON.parse(content)
  parsed.features.forEach((feature) => {
    feature.properties.time = (new Date()).toISOString()
  })
  return featureUpdater(parsed)
}

export function saveFeatures(features) {
  features.hash = hash(features)
  fs.writeFile(FEATURE_FILE, JSON.stringify(features), err => {
    if (err) {
      console.error(err);
    }
  });
}
