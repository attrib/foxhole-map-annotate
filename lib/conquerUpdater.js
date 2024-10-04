import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { resolve } from "node:path";
import { hash } from "node:crypto";

import warApi from "../lib/warapi.js";
import {delayedSave} from "./fileHandler.js";

const extent = /** @type{const} */ ([-2046, 1777]);
const conquerFileName = process.env.NODE_ENV !== 'test' ? resolve('data/conquer.json') :  resolve('data/conquer.test.json');
const warFileName = process.env.NODE_ENV !== 'test' ? resolve('data/war.json') : resolve('data/war.test.json');
const staticFileName = resolve('public/static.json');
const conquer = /** @type{ConquerData} */ (fs.existsSync(conquerFileName) && process.env.NODE_ENV !== 'test' ? JSON.parse(fs.readFileSync(conquerFileName, 'utf8')) : {
  deactivatedRegions: undefined,
  regions: {},
  features: {},
  version: ''
});
const regions = /** @type{StaticFile} */ (JSON.parse(fs.readFileSync(staticFileName, 'utf8')))
const war = /** @type{WarFeatures} */ (fs.existsSync(warFileName) && process.env.NODE_ENV !== 'test' ? JSON.parse(fs.readFileSync(warFileName, 'utf8')) : {features: [], version: ''});
let blocked = false

/** @type{string[]} */
const unknownFeatures = []

Object.entries(conquer.features).forEach(([id, feature]) => {
  if ("type" in feature && feature.type === "stormCannon") {
    return;
  }
  const found = war.features.find((compare) => compare.id === id)
  if (!found) {
    unknownFeatures.push(id)
  }
})
unknownFeatures.forEach((id) => {
  delete conquer.features[id]
})
conquer.version = hash("sha1", JSON.stringify(conquer))

/**
 * Common wait time function. See node:timers/promises.setTimeout
 * @param {number} time
 * @returns {Promise<void>}
 */
function wait(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

/**
 * Fetches the maps from the API and then updates the Conquer Data with deactivated regions.
 * @returns {Promise<void>}
 */
function fetchDeactivatedMaps() {
  return warApi.maps().then((data) => {
    if (data === null) {
      console.info("fetchDeactivatedMaps: No data returned from API");
      return;
    }
    conquer.deactivatedRegions = []
    for (const region of regions.features) {
      if (region.properties.type !== 'Region') {
        continue;
      }
      if (!data.includes(region.id)) {
        conquer.deactivatedRegions.push(region.id)
      }
    }
    conquer.version = hash("sha1", JSON.stringify(conquer))
  })
}

/**
 * Updates all the map data and returns the changed features
 * @returns {Promise<?UpdateMapData>}
 */
export async function updateMap() {
  // Do not check map, war is not in progress
  if (!warApi.isWarInProgress()) {
    return null;
  }

  // Another function is holding the blocking lock
  if (blocked) {
    console.log('updateMap blocked, something currently updates map')
    return null;
  }

  if (conquer.deactivatedRegions === null) {
    console.log('Missing deactivatedRegions')
    await fetchDeactivatedMaps();
    await updateMap();
    return null;
  }

  if (war.features.length === 0) {
    console.log('Missing warFeatures')
    await regenRegions();
    await updateMap();
    return null;
  }

  /**
   * An array of all the regions async update promises, to be spaced out by 100ms.
   * @type{Promise<void>[]}
   */
  const promises = []

  /**
   * An array of all the changed features IDs.
   * @type{(WarFeatureObject['id'] | StaticFileFeature['id'])[]}
   */
  const changed = [];
  blocked = true

  let waitTimeout = 0

  /**
   * All the features to compare against. Taken from the public/static.json and data/war.json files.
   */
  const allFeatures = [...regions.features, ...war.features]

  /**
   * A map of all regions with an array of storm cannons in that region.
   * @type{Partial<Record<HexName, (WarFeatureObject['id'] | StaticFileFeature['id'])[]>>}
   */
  const existingStormCannons = {}

  /**
   * An array of the regions that have been detected as loaded.
   * @type{HexName[]}
   */
  const regionsLoaded = []

  for (const region of regions.features) {
    if (!isRegionFeatureObject(region) || !isActiveRegionFeature(region)) {
      continue;
    }
    const version = conquer.regions[region.id] ?? null;
    promises.push(wait(waitTimeout).then(() => warApi.dynamicMapETag(region.id, version)).then((data) => {
      if (data === null) {
        return
      }
      const fetchTimeStamp = data.lastUpdated
      regionsLoaded.push(region.id)
      conquer.regions[region.id] = data.version
      for (const item of data.mapItems) {
        if ((warApi.isIconTypeOfType(item.iconType, "town", "industry", "stormCannon") || warApi.isIconTypeOfIcon(item.iconType, "MapIconFacilityMineOilRig")) ) {
          const x = region.properties.box[0] - item.x * extent[0]
          const y = region.properties.box[1] - item.y * extent[1]
          const type = warApi.iconTypes[item.iconType].type
          const icon = warApi.iconTypes[item.iconType].icon
          const team = warApi.getTeam(item.teamId)
          const flags = item.flags || 0

          const feature = allFeatures.find((compare) => {
            return compare.geometry.coordinates[0] === x && compare.geometry.coordinates[1] === y && compare.properties.type === type
          })
          if (feature) {
            const conquerFeature = conquer.features[feature.id];
            if (conquerFeature === undefined || conquerFeature.team !== team || conquerFeature.icon !== icon || ("flags" in conquerFeature && conquerFeature.flags !== flags)) {
              const lastTeam = (conquer.features[feature.id]?.team || '') === '' ? (conquer.features[feature.id]?.lastTeam || '') : (conquer.features[feature.id]?.team || '')
              const lastChange = team !== (conquer.features[feature.id]?.team || '') ? fetchTimeStamp : (conquer.features[feature.id]?.lastChange || fetchTimeStamp);
              conquer.features[feature.id] = {team, icon, flags, lastChange, lastTeam}
              changed.push(feature.id)
            }
            if (type === 'stormCannon') {
              const existingStormCannonsInRegion = existingStormCannons[region.id];
              if (existingStormCannonsInRegion === undefined) {
                existingStormCannons[region.id] = [feature.id]
              } else {
                existingStormCannonsInRegion.push(feature.id)
              }
            }
          } else if (type === 'stormCannon') {
            const foundSC = Object.entries(conquer.features).find(([, entry]) => {
              return isConquerStormCannonFeature(entry) &&entry.coordinates[0] === x && entry.coordinates[1] === y && entry.icon === icon
            })
            const id = (foundSC && conquer.features[foundSC[0]]?.team === team) ? foundSC[0] : randomUUID()
            if (!(foundSC && conquer.features[foundSC[0]]?.team === team)) {
              conquer.features[id] = {
                team,
                icon,
                type,
                notes: warApi.iconTypes[item.iconType].notes,
                coordinates: [x, y],
                region: region.id,
                lastChange: fetchTimeStamp,
                lastTeam: team,
              }
              changed.push(id)
            }
            const existingStormCannonsInRegion = existingStormCannons[region.id];
            if (existingStormCannonsInRegion === undefined) {
              existingStormCannons[region.id] = [id]
            } else {
              existingStormCannonsInRegion.push(id)
            }
          } else {
            console.log('Unable to find item in static.json', region.id, type, item)
          }
        }
        if (!warApi.isIconType(item.iconType)) {
          console.log('Unkown type on map ' + region.id + ' ' + item.iconType, item)
        }
      }
    }).catch((e) => {
      console.log('warapi connection issue', e)
    }))
    waitTimeout += 100
  }

  return Promise.all(promises).then(() => {
    blocked = false
    const destroyedStormCannons = []
    for (const [id, entry] of Object.entries(conquer.features)) {
      if ("type" in entry && entry.type === 'stormCannon'
        && regionsLoaded.includes(entry.region)
        && !existingStormCannons[entry.region]?.includes(id)) {
        destroyedStormCannons.push(id)
        changed.push(id)
      }
    }
    if (changed.length === 0) {
      if (regionsLoaded.length > 0) {
        delayedSave(conquerFileName, conquer)
      }
      return null
    }
    /** @type{ConquerData["features"]} */
    const features = {}
    for (const id of changed) {
      const changedFeature = conquer.features[id];
      if (changedFeature !== undefined) {
        if (isConquerStormCannonFeature(changedFeature) && destroyedStormCannons.includes(id)) {
          changedFeature.destroyed = true;
          delete conquer.features[id];
        }
        features[id] = changedFeature
      }
    }
    conquer.version = hash("sha1", JSON.stringify(conquer))
    delayedSave(conquerFileName, conquer)
    return {
      version: conquer.version,
      warVersion: war.version,
      features,
      full: false,
    }
  })
}

/**
 * Regenerate the regions
 * @returns {Promise<void>}
 */
export async function regenRegions() {
  if (conquer.deactivatedRegions === null) {
    console.log('Missing deactivatedRegions')
    return fetchDeactivatedMaps().then(() => regenRegions())
  }
  blocked = true
  const promises = []
  // fetch all fields/industries and current state of towns
  let waitTimeout = 0
  for (const region of regions.features) {
    if (!isRegionFeatureObject(region)) {
      continue;
    }
    if (!isActiveRegionFeature(region)) {
      continue
    }
    promises.push(wait(waitTimeout).then(() => warApi.dynamicMap(region.id)).then((data) => {
      if (data === null) {
        return
      }
      conquer.regions[region.id] = null
      for (const item of data.mapItems) {
        if (warApi.isIconType(item.iconType)) {
          if (warApi.isIconTypeOfType(item.iconType, "stormCannon")) {
            continue
          }

          const type = warApi.iconTypes[item.iconType].type
          const icon = warApi.iconTypes[item.iconType].icon
          const notes = warApi.iconTypes[item.iconType].notes
          const conquerFlag = warApi.isIconTypeOfConquerType(item.iconType) ? warApi.iconTypes[item.iconType].conquer : false
          const name = warApi.isIconTypeOfType(item.iconType, "town") && !warApi.isIconTypeOfIcon(item.iconType, "MapIconSafehouse")
          const x = region.properties.box[0] - item.x * extent[0]
          const y = region.properties.box[1] - item.y * extent[1]

          const id = randomUUID()
          /** @type{WarFeatureObject} */
          const feature = {
            type: 'Feature',
            id: id,
            geometry: {
              type: 'Point',
              coordinates: [x, y]
            },
            properties: {
              type: type,
              icon: icon,
              notes: `${notes}`,
              id: id,
              user: 'World',
              time: '',
              team: '',
              region: region.id,
            }
          }

          if (name) {
            for (const voronoi of regions.features) {
              // Maybe refactor this to not filter each time?
              if (!isVoronoiFeatureObject(voronoi)) {
                continue;
              }
              if (voronoi.properties.region !== region.id) {
                continue;
              }
              // check if point is inside voronoi
              if (inside([x, y], voronoi.geometry.coordinates[0])) {
                feature.properties.notes = voronoi.properties.notes + ' ' + notes
                if (conquerFlag) {
                  if ("voronoi" in feature.properties) {
                    console.log('Multiple voronoi', feature.properties.voronoi, voronoi.id, feature.properties)
                  }
                  Object.assign(feature.properties, { voronoi: voronoi.id })
                }
              }
            }
          }

          war.features.push(feature)
        } else {
          console.log('Unkown type ' + item.iconType, item)
        }
      }
    }).catch((e) => {
      console.log('warapi connection issue', e)
    }))
    waitTimeout += 100
  }
  return Promise.all(promises).then(() => {
    blocked = false
    saveRegions()
  })
}

/**
 * Clear the regions and war files
 * TODO: Make this async?
 * @returns {void}
 */
export function clearRegions() {
  war.version = ''
  war.features = []
  conquer.regions = {}
  conquer.features = {}
  conquer.version = hash("sha1", JSON.stringify({...conquer, warNumber: warApi.warData.warNumber}));
  conquer.deactivatedRegions = null
  saveRegions()
}

/**
 * Save the conquer and war files
 * @returns {void}
 */
function saveRegions() {
  war.version = hash("sha1", JSON.stringify(war))
  conquer.version = hash("sha1", JSON.stringify(conquer))
  delayedSave(warFileName, war)
  delayedSave(conquerFileName, conquer)
}

/**
 * Update the position of an observation tower and save changes
 * @param {import("./featureLoader.js").UserMapFeature} param0 
 * @returns {ConquerStatus}
 */
export function moveObs({id, angle}) {
  const conquerFeature = conquer.features[id];
  if (conquerFeature !== undefined && !isConquerStormCannonFeature(conquerFeature)) {
    conquerFeature.angle = angle;
    conquer.version = hash("sha1", JSON.stringify(conquer))
    delayedSave(conquerFileName, conquer)
    return {
      version: conquer.version,
      warVersion: war.version,
      features: {[id]: conquerFeature },
      full: false,
    }
  }
  throw new Error("Invalid ID passed to moveObs");
}

/**
 * Get the Conquer Status
 * @returns {ConquerStatus}
 */
export function getConquerStatus() {
  return {
    version: conquer.version,
    features: conquer.features,
    warVersion: war.version,
    requiredVictoryTowns: warApi.warData.requiredVictoryTowns,
    warNumber: warApi.warData.warNumber,
    full: true
  }
}

/**
 * Get the Conquer Status hashed version string
 * @returns {ConquerData['version']}
 */
export function getConquerStatusVersion() {
  return conquer.version;
}

/**
 * Get the WarFeatures for the private API
 * @returns {WarFeatureCollection}
 */
export function getWarFeatures() {
  return {features: war.features, deactivatedRegions: conquer.deactivatedRegions, version: war.version}
}

/**
 * Get the WarFeatures for the public API
 * @returns {WarFeatureCollection}
 */
export function getPublicWarFeatures() {
  return {features: war.features.filter((feature) => {
      return feature.properties.type === 'town';

  }), deactivatedRegions: conquer.deactivatedRegions, version: war.version}
}

/**
 * Get the WarFeatures hashed version string
 * @returns {WarFeatures['version']}
 */
export function getWarFeaturesVersion() {
  return war.version;
}

/**
 * Wipe the region cache and eTags
 * @returns {void}
 */
export function clearRegionsCache() {
  for (const regionId of /** @type{(keyof typeof conquer.regions)[]} */ (Object.keys(conquer.regions))) {
    conquer.regions[regionId] = 0
  }
  warApi.eTags = {}
  console.log('cleared region cache')
}

/**
 * Taken from {@link https://stackoverflow.com/questions/22521982/js-check-if-point-inside-a-polygon StackOverflow}
 * @param {Point} point
 * @param {Point[]} vs
 */
export function inside(point, vs) {
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html

  const x = point[0], y = point[1];

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    // Casting here, it's quick and dirty and bad
    let xi = /** @type{number} */ (vs[i]?.[0]);
    let yi = /** @type{number} */ (vs[i]?.[1]);
    let xj = /** @type{number} */ (vs[j]?.[0]);
    let yj = /** @type{number} */ (vs[j]?.[1]);

    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Helper function to type guard a {@link StaticFileFeature} type to an {@link RegionFeatureObject} type.
 * @param {StaticFileFeature} value
 * @returns {value is RegionFeatureObject}
 */
function isRegionFeatureObject(value) {
  return value.properties.type === "Region";
}

/**
 * Check if object is a {@link VoronoiFeatureObject}
 * @param {StaticFileFeature} value
 * @returns {value is VoronoiFeatureObject}
 */
function isVoronoiFeatureObject(value) {
  return value.properties.type === "voronoi";
}

/**
 * Check if a region hex is part of the active map
 * @param {RegionFeatureObject} value
 * @returns {boolean}
 */
function isActiveRegionFeature(value) {
  if (conquer.deactivatedRegions === null) {
    throw new Error("Deactivated regions not loaded");
  }
  return !conquer.deactivatedRegions.includes(value.id);
}

/**
 * Check if conquer feature is a storm cannon
 * @param {ConquerFeature | ConquerFeatureStormCannon} value
 * @returns {value is ConquerFeatureStormCannon}
 */
function isConquerStormCannonFeature(value) {
  return "type" in value && value.type === "stormCannon";
}

/**
 * Websocket angle update data
 * @typedef {object} MoveObsData
 * @property {string} id
 * @property {number} angle 
 */

/**
 * A point on the map
 * @typedef {[number, number]} Point
 */

/**
 * A polygon on the map
 * @typedef {Point[]} Polygon
 */

/**
 * Foxhole team name
 * @typedef {"Warden" | "Colonial" | ""} Team
 */

/**
 * Conquer Feature
 * @typedef {object} ConquerFeature
 * @property {number} flags
 * @property {string} icon
 * @property {number} lastChange
 * @property {string} lastTeam
 * @property {Team} team
 * @property {number} [angle]
 */

/**
 * Map Hex name
 * @typedef {import("../lib/warapi.js").HexName} HexName
 */

/**
 * Conquer Feature with Storm Cannon
 * @typedef {object} ConquerFeatureStormCannon
 * @property {Point} coordinates
 * @property {string} icon
 * @property {number} lastChange
 * @property {string} lastTeam
 * @property {string} notes
 * @property {HexName} region
 * @property {Team} team
 * @property {"stormCannon"} type
 * @property {boolean} [destroyed]
 */

/**
 * Conquer Data
 * @typedef {object} ConquerData
 * @property {?Partial<HexName>[]} deactivatedRegions
 * @property {Partial<Record<HexName, ?number>>} regions
 * @property {Record<string, ConquerFeature | ConquerFeatureStormCannon>} features
 * @property {string} version
 */

/**
 * Region Geometry Object
 * @typedef {object} RegionGeometryObject
 * @property {"Polygon"} type
 * @property {[[Point, Point, Point, Point, Point, Point]]} coordinates
 */

/**
 * Region Properties Object
 * @typedef {object} RegionPropertiesObject
 * @property {"Region"} type
 * @property {string} notes
 * @property {HexName} id
 * @property {Point} box
 */

/**
 * Region Feature Object
 * @typedef {object} RegionFeatureObject
 * @property {"Feature"} type
 * @property {RegionGeometryObject} geometry
 * @property {RegionPropertiesObject} properties
 * @property {HexName} id
 */

/**
 * Major Feature Geometry Object
 * @typedef {object} MajorFeatureGeometryObject
 * @property {"Point"} type
 * @property {Point} coordinates
 */

/**
 * Major Feature Properties Object
 * @typedef {object} MajorFeaturePropertiesObject
 * @property {string} id
 * @property {"Major"} type
 * @property {string} notes
 * @property {HexName} region
 */

/**
 * Major Feature Object
 * @typedef {object} MajorFeatureObject
 * @property {"Feature"} type
 * @property {MajorFeatureGeometryObject} geometry
 * @property {MajorFeaturePropertiesObject} properties
 * @property {(string & NonNullable<object>)} id
 */

/**
 * Minor Feature Geometry Object
 * @typedef {object} MinorFeatureGeometryObject
 * @property {"Point"} type
 * @property {Point} coordinates
 */

/**
 * Minor Feature Properties Object
 * @typedef {object} MinorFeaturePropertiesObject
 * @property {string} id
 * @property {"Minor"} type
 * @property {string} notes
 * @property {HexName} region
 */

/**
 * Minor Feature Object
 * @typedef {object} MinorFeatureObject
 * @property {"Feature"} type
 * @property {MinorFeatureGeometryObject} geometry
 * @property {MinorFeaturePropertiesObject} properties
 * @property {(string & NonNullable<object>)} id
 */

/**
 * Voronoi Geometry Object
 * @typedef {object} VoronoiGeometryObject
 * @property {"Polygon"} type
 * @property {[Point[]]} coordinates
 */

/**
 * Voronoi Properties Object
 * @typedef {object} VoronoiPropertiesObject
 * @property {string} notes
 * @property {HexName} region
 * @property {"voronoi"} type
 */

/**
 * Voronoi Feature Object
 * @typedef {object} VoronoiFeatureObject
 * @property {"Feature"} type
 * @property {VoronoiGeometryObject} geometry
 * @property {VoronoiPropertiesObject} properties
 * @property {(string & NonNullable<object>)} id
 */

/**
 * Static File Feature
 * @typedef {RegionFeatureObject | MajorFeatureObject | MinorFeatureObject | VoronoiFeatureObject} StaticFileFeature
 */

/**
 * JSON Static File data
 * @typedef {object} StaticFile
 * @property {"FeatureCollection"} type
 * @property {StaticFileFeature[]} features
 */

/**
 * War Feature Type
 * @typedef {"town" | "industry" | "field"} WarFeatureType
 */

/**
 * War Feature Geometry Object
 * @typedef {object} WarFeatureBasicGeometryObject
 * @property {"Point"} type
 * @property {Point} coordinates
 */

/**
 * War Feature Properties Object
 * @typedef {object} WarFeatureBasicPropertiesObject
 * @property {WarFeatureType} type
 * @property {string} icon
 * @property {string} notes
 * @property {string} id
 * @property {string} user
 * @property {string} time
 * @property {Team} team
 * @property {HexName} region
 */

/**
 * War Feature Object
 * @typedef {object} WarFeatureBasicObject
 * @property {"Feature"} type
 * @property {string} id
 * @property {WarFeatureBasicGeometryObject} geometry
 * @property {WarFeatureBasicPropertiesObject} properties
 */

/**
 * War Feature Geometry Object
 * @typedef {object} WarFeatureConquestGeometry
 * @property {"Point"} type
 * @property {Point} coordinates
 */

/**
 * War Features Conquest Properties
 * @typedef {object} WarFeaturesConquestProperties
 * @property {WarFeatureType} type
 * @property {string} icon
 * @property {string} notes
 * @property {string} id
 * @property {string} user
 * @property {string} time
 * @property {Team} team
 * @property {HexName} region
 * @property {string} voronoi
 *
 */

/**
 * War Features Conquest Object
 * @typedef {object} WarFeatureConquestObject
 * @property {"Feature"} type
 * @property {string} id
 * @property {WarFeatureConquestGeometry} geometry
 * @property {WarFeaturesConquestProperties} properties
 */

/**
 * War Feature Object
 * @typedef {WarFeatureConquestObject | WarFeatureBasicObject} WarFeatureObject
 */

/**
 * War Features JSON File
 * @typedef {object} WarFeatures
 * @property {(WarFeatureConquestObject | WarFeatureObject)[]} features
 * @property {string} version
 */

/**
 * War Features Collection
 * @typedef {object} WarFeatureCollection
 * @property {WarFeatures['features']} features
 * @property {ConquerData['deactivatedRegions']} deactivatedRegions
 * @property {WarFeatures['version']} version
 */

/**
 * Partial conquer status
 * @typedef {object} PartialConquerStatus
 * @property {ConquerData['version']} version
 * @property {ConquerData['features']} features
 * @property {WarFeatures['version']} warVersion
 * @property {false} full
 */

/**
 * Complete conquer status
 * @typedef {object} FullConquerStatus
 * @property {ConquerData['version']} version
 * @property {ConquerData['features']} features
 * @property {WarFeatures['version']} warVersion
 * @property {number} requiredVictoryTowns
 * @property {number} warNumber
 * @property {true} full
 */

/**
 * The Current Conquer Status
 * @typedef {PartialConquerStatus | FullConquerStatus} ConquerStatus
 */

/**
 * Update Map Data
 * @typedef {object} UpdateMapData
 * @property {ConquerData['version']} version
 * @property {WarFeatures['version']} warVersion
 * @property {ConquerData['features']} features
 * @property {boolean} full
 */