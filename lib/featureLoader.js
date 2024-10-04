import fs from "node:fs";
import { resolve } from "node:path";
import { hash } from "node:crypto";

import { featureUpdater } from "./updater.js";
import { delayedSave } from "./fileHandler.js";

const FEATURE_FILE = resolve('data/features.json')

export function loadFeatures() {
  if (!fs.existsSync(FEATURE_FILE)) {
    return defaultFeatures()
  }
  const content = fs.readFileSync(FEATURE_FILE, 'utf8')
  const parsed = /** @type{UserMapFeatures} */ (JSON.parse(content))
  return featureUpdater(parsed)
}

/**
 * Load the default user map features from the file system
 * @returns {UserMapFeatures}
 */
export function defaultFeatures() {
  if (!fs.existsSync(resolve('data/defaultFeatures.json'))) {
    return {
      type: "FeatureCollection",
      features: [],
      hash: ""
    }
  }
  const content = fs.readFileSync(resolve('data/defaultFeatures.json'), 'utf8')
  const parsed = /** @type{UserMapFeatures} */ (JSON.parse(content));
  parsed.features.forEach((feature) => {
    feature.properties.time = (new Date()).toISOString()
  })
  return featureUpdater(parsed)
}

/**
 * Saves the features to the file system
 * @param {UserMapFeatures} features 
 * @returns {void}
 */
export function saveFeatures(features) {
  features.hash = hash("sha1", JSON.stringify(features))
  return delayedSave(FEATURE_FILE, features, 10_000, false)
}

/**
 * User Map Features JSON File
 * @typedef {object} UserMapFeatures
 * @property {"FeatureCollection"} type
 * @property {UserMapFeature[]} features
 * @property {string} hash
 */

/**
 * User Map Feature Properties
 * @typedef {object} UserMapFeatureProperties
 * @property {string} [time]
 * @property {string} user
 * @property {string} userId
 * @property {?string} discordId
 * @property {string} notes
 * @property {string} [color]
 * @property {string} [clan]
 * @property {string} [lineType]
 * @property {string} id
 * @property {string} muser
 * @property {string} muserId
 * @property {string} type
 * @property {string[]} flags
 */

/**
 * User Map Feature Geometry
 * @typedef {object} UserMapFeatureGeometry
 */

/**
 * User Map Feature
 * @typedef {object} UserMapFeature
 * @property {"Feature"} type
 * @property {UserMapFeatureProperties} properties
 * @property {UserMapFeatureGeometry} geometry
 * @property {string} id
 * @property {number} [angle]
 */