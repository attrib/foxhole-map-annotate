const warapi = require("../lib/warapi")
const fs = require("fs");
const uuid = require("uuid");
const hash = require('object-hash');

const extent = [-2050, 1775]
const conquerFileName = __dirname + '/../data/conquer.json';
const warFileName = __dirname + '/../data/war.json';
const conquer = fs.existsSync(conquerFileName) ? JSON.parse(fs.readFileSync(conquerFileName, 'utf8')) : {
  deactivatedRegions: undefined,
  regions: {},
  features: {},
  version: ''
};
const regions = JSON.parse(fs.readFileSync(__dirname + '/../public/static.json', 'utf8'))
const war = fs.existsSync(warFileName) ? JSON.parse(fs.readFileSync(warFileName, 'utf8')) : {features: [], version: ''};
let blocked = false

const unknownFeatures = []
Object.keys(conquer.features).forEach((id) => {
  const f = conquer.features[id]
  if (f.type && f.type === 'stormCannon') {
    return
  }
  const found = war.features.find((compare) => compare.id === id)
  if (!found) {
    unknownFeatures.push(id)
  }
})
unknownFeatures.forEach((id) => {
  delete conquer.features[id]
})
conquer.version = hash(conquer)

function wait(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

function fetchDeactivatedMaps() {
  return warapi.maps().then((data) => {
    conquer.deactivatedRegions = []
    for (const region of regions.features) {
      if (region.properties.type !== 'Region') {
        continue;
      }
      if (!data.includes(region.id)) {
        conquer.deactivatedRegions.push(region.id)
      }
    }
    conquer.version = hash(conquer)
  })
}

function updateMap() {
  // Do not check map, war is not in progress
  if (warapi.warData.status !== warapi.WAR_IN_PROGRESS || blocked) {
    if (blocked) {
      console.log('updateMap blocked, something currently updates map')
    }
    return new Promise((resolve) => {
      resolve(null)
    })
  }
  if (conquer.deactivatedRegions === undefined) {
    console.log('Missing deactivatedRegions')
    return fetchDeactivatedMaps().then(() => updateMap())
  }
  if (war.features.length === 0) {
    console.log('Missing warFeatures')
    return regenRegions().then(() => updateMap())
  }

  const promises = []
  const changed = [];
  blocked = true

  let waitTimeout = 0
  const allFeatures = [...regions.features, ...war.features]
  const existingStormCannons = {}
  const regionsLoaded = []
  for (const region of regions.features) {
    if (region.properties.type !== 'Region') {
      continue;
    }
    if (conquer.deactivatedRegions.includes(region.id)) {
      continue
    }
    const version = region.id in conquer.regions ? conquer.regions[region.id] : null
    promises.push(wait(waitTimeout).then(() => warapi.dynamicMapETag(region.id, version)).then((data) => {
      if (data === null) {
        return
      }
      if (data.error && data.error === 'Unknown mapId') {
        return
      }
      const fetchTimeStamp = Date.now()
      regionsLoaded.push(region.id)
      conquer.regions[region.id] = data.version
      for (const item of data.mapItems) {
        if (item.iconType in warapi.iconTypes && (warapi.iconTypes[item.iconType].type === 'town' || warapi.iconTypes[item.iconType].type === 'industry' || warapi.iconTypes[item.iconType].type === 'stormCannon' || (warapi.iconTypes[item.iconType].type === 'field' && warapi.iconTypes[item.iconType].icon === 'MapIconFacilityMineOilRig')) ) {
          const x = region.properties.box[0] - item.x * extent[0]
          const y = region.properties.box[1] - item.y * extent[1]
          const type = warapi.iconTypes[item.iconType].type
          const icon = warapi.iconTypes[item.iconType].icon
          const team = warapi.getTeam(item.teamId)
          const flags = item.flags || 0

          const feature = allFeatures.find((compare) => {
            return compare.geometry.coordinates[0] === x && compare.geometry.coordinates[1] === y && compare.properties.type === type
          })
          if (feature) {
            if (!(feature.id in conquer.features) || conquer.features[feature.id].team !== team || conquer.features[feature.id].icon !== icon || conquer.features[feature.id].flags !== flags) {
              const lastTeam = (conquer.features[feature.id].team || '') === '' ? (conquer.features[feature.id].lastTeam || '') : (conquer.features[feature.id].team || '')
              conquer.features[feature.id] = {team, icon, flags, lastChange: fetchTimeStamp, lastTeam: lastTeam}
              changed.push(feature.id)
            }
            if (type === 'stormCannon') {
              if (!(region.id in existingStormCannons)) {
                existingStormCannons[region.id] = []
              }
              existingStormCannons[region.id].push(feature.id)
            }
          } else if (type === 'stormCannon') {
            const foundSC = Object.keys(conquer.features).find((compareKey) => {
              const compare = conquer.features[compareKey]
              return compare.type === 'stormCannon' && compare.coordinates[0] === x && compare.coordinates[1] === y && compare.icon === icon
            })
            const id = foundSC ? foundSC : uuid.v4()
            conquer.features[id] = {
              team,
              icon,
              type,
              notes: warapi.iconTypes[item.iconType].notes,
              coordinates: [x, y],
              region: region.id,
              lastChange: fetchTimeStamp,
              lastTeam: team,
            }
            changed.push(id)
            if (!(region.id in existingStormCannons)) {
              existingStormCannons[region.id] = []
            }
            existingStormCannons[region.id].push(id)
          } else {
            console.log('Unable to find item in static.json', region.id, type, item)
          }
        }
        if (!(item.iconType in warapi.iconTypes)) {
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
    for (const id in conquer.features) {
      if (conquer.features[id].type && conquer.features[id].type === 'stormCannon'
        && regionsLoaded.includes(conquer.features[id].region)
        && !existingStormCannons[conquer.features[id].region]?.includes(id)) {
        destroyedStormCannons.push(id)
        changed.push(id)
      }
    }
    if (changed.length === 0) {
      if (regionsLoaded.length > 0) {
        fs.writeFileSync(conquerFileName, JSON.stringify(conquer, null, 2));
      }
      return null
    }
    const features = {}
    for (const id of changed) {
      features[id] = conquer.features[id]
      if (destroyedStormCannons.includes(id)) {
        features[id].destroyed = true
        delete conquer.features[id]
      }
    }
    conquer.version = hash(conquer)
    fs.writeFileSync(conquerFileName, JSON.stringify(conquer, null, 2));
    return {
      version: conquer.version,
      warVersion: war.version,
      features,
      full: false,
    }
  })
}

function regenRegions() {
  if (conquer.deactivatedRegions === undefined) {
    console.log('Missing deactivatedRegions')
    return fetchDeactivatedMaps().then(() => regenRegions())
  }
  blocked = true
  const promises = []
  // fetch all fields/industries and current state of towns
  let waitTimeout = 0
  for (const region of regions.features) {
    if (region.properties.type !== 'Region') {
      continue;
    }
    if (conquer.deactivatedRegions.includes(region.id)) {
      continue
    }
    promises.push(wait(waitTimeout).then(() => warapi.dynamicMap(region.id)).then((data) => {
      if (data.error && data.error === 'Unknown mapId') {
        return
      }
      conquer.regions[region.id] = null
      for (const item of data.mapItems) {
        if (item.iconType in warapi.iconTypes) {
          const type = warapi.iconTypes[item.iconType].type
          const icon = warapi.iconTypes[item.iconType].icon
          const notes = warapi.iconTypes[item.iconType].notes
          const conquerFlag = warapi.iconTypes[item.iconType].conquer || false
          const name = type === 'town' && icon !== 'MapIconSafehouse'
          const x = region.properties.box[0] - item.x * extent[0]
          const y = region.properties.box[1] - item.y * extent[1]

          if (type === 'stormCannon') {
            continue
          }

          const id = uuid.v4()
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
              notes: notes,
              id: id,
              user: 'World',
              time: '',
              team: '',
              region: region.id,
            }
          }

          if (name) {
            for (const voronoi of regions.features) {
              if (voronoi.properties.type !== 'voronoi') {
                continue;
              }
              if (voronoi.properties.region !== region.id) {
                continue;
              }
              // check if point is inside voronoi
              if (inside([x, y], voronoi.geometry.coordinates[0])) {
                feature.properties.notes = voronoi.properties.notes + ' ' + notes
                if (conquerFlag) {
                  if (feature.properties.voronoi) {
                    console.log('Multiple voronoi', feature.properties.voronoi, voronoi.id, feature.properties)
                  }
                  feature.properties.voronoi = voronoi.id
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

function clearRegions() {
  war.version = ''
  war.features = []
  conquer.regions = {}
  conquer.features = {}
  conquer.version = hash({...conquer, warNumber: warapi.warData.warNumber})
  conquer.deactivatedRegions = undefined
  saveRegions()
}

function saveRegions() {
  war.version = hash(war)
  conquer.version = hash(conquer)
  const json = JSON.stringify(war)
  fs.writeFileSync(__dirname + '/../data/war.json', json);
  fs.writeFileSync(conquerFileName, JSON.stringify(conquer, null, 2));
}

function moveObs({id, angle}) {
  conquer.features[id].angle = angle
  conquer.version = hash(conquer)
  fs.writeFileSync(conquerFileName, JSON.stringify(conquer, null, 2));
  return {
    version: conquer.version,
    warVersion: war.version,
    features: {[id]: conquer.features[id]},
    full: false,
  }
}

module.exports.updateMap = updateMap
module.exports.regenRegions = regenRegions
module.exports.clearRegions = clearRegions
module.exports.moveObs = moveObs
module.exports.getConquerStatus = function () {
  return {
    version: conquer.version,
    features: conquer.features,
    warVersion: war.version,
    requiredVictoryTowns: warapi.warData.requiredVictoryTowns,
    warNumber: warapi.warData.warNumber,
    full: true
  }
}
module.exports.getConquerStatusVersion = function () {
  return conquer.version;
}
module.exports.getWarFeatures = function () {
  return {features: war.features, deactivatedRegions: conquer.deactivatedRegions, version: war.version}
}
module.exports.getPublicWarFeatures = function () {
  return {features: war.features.filter((feature) => {
      return feature.properties.type === 'town';

  }), deactivatedRegions: conquer.deactivatedRegions, version: war.version}
}
module.exports.getWarFeaturesVersion = function () {
  return war.version;
}
module.exports.clearRegionsCache = function () {
  for (const regionId of Object.keys(conquer.regions)) {
    conquer.regions[regionId] = 0
  }
  warapi.eTags = {}
  console.log('cleared region cache')
}

/**
 * https://stackoverflow.com/questions/22521982/js-check-if-point-inside-a-polygon
 * @param point
 * @param vs
 */
function inside(point, vs) {
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html

  const x = point[0], y = point[1];

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1];
    let xj = vs[j][0], yj = vs[j][1];

    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}