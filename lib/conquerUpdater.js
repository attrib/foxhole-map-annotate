const warapi = require("../lib/warapi")
const fs = require("fs");
const uuid = require("uuid");

const extent = [-2050,1775]
const conquerFileName = __dirname + '/../data/conquer.json';
const warFileName = __dirname + '/../data/war.json';
const conquer = fs.existsSync(conquerFileName) ? JSON.parse(fs.readFileSync(conquerFileName, 'utf8')) : {deactivatedRegions: undefined, regions: {}, features: {}, version: 0};
const regions = JSON.parse(fs.readFileSync(__dirname + '/../public/static.json', 'utf8'))
const war = fs.existsSync(warFileName) ? JSON.parse(fs.readFileSync(warFileName, 'utf8')) : {features: [], version: 1};

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
    conquer.version++
  })
}

function updateMap() {
  // Do not check map, war is not in progress
  if (warapi.warData.status !== warapi.WAR_IN_PROGRESS) {
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
  let regionVersionChanged = false;

  let waitTimeout = 0
  const allFeatures = [...regions.features, ...war.features]
  const existingStormCannons = {}
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
      conquer.regions[region.id] = data.version
      regionVersionChanged = true
      for (const item of data.mapItems) {
        if (item.iconType in warapi.iconTypes && (warapi.iconTypes[item.iconType].type === 'town' || warapi.iconTypes[item.iconType].type === 'industry' || warapi.iconTypes[item.iconType].type === 'stormCannon')) {
          const x = region.properties.box[0] - item.x * extent[0]
          const y = region.properties.box[1] - item.y * extent[1]
          const type = warapi.iconTypes[item.iconType].type
          const icon = warapi.iconTypes[item.iconType].icon
          const team = warapi.getTeam(item.teamId)

          const feature = allFeatures.find((compare) => {
            return compare.geometry.coordinates[0] === x && compare.geometry.coordinates[1] === y && compare.properties.type === type
          })
          if (feature) {
            if (!(feature.id in conquer.features) || conquer.features[feature.id].team !== team || conquer.features[feature.id].icon !== icon) {
              conquer.features[feature.id] = {team, icon, flags: item.flags || 0}
              changed.push(feature.id)
            }
            if (type === 'stormCannon') {
              if (!(region.id in existingStormCannons)) {
                existingStormCannons[region.id] = []
              }
              existingStormCannons[region.id].push(feature.id)
            }
          }
          else if (type === 'stormCannon') {
            const id = uuid.v4()
            conquer.features[id] = {
              team,
              icon,
              type,
              notes: warapi.iconTypes[item.iconType].notes,
              coordinates: [x, y],
              region: region.id,
            }
            changed.push(id)
            if (!(region.id in existingStormCannons)) {
              existingStormCannons[region.id] = []
            }
            existingStormCannons[region.id].push(id)
          }
          else {
            console.log('Unable to find item in static.json', region.id, type, item)
          }
        }
        if (!(item.iconType in warapi.iconTypes)) {
          console.log('Unkown type ' + item.iconType, item)
        }
      }
    }).catch((e) => {console.log('warapi connection issue', e)}))
    waitTimeout += 100
  }

  return Promise.all(promises).then(() => {
    const destroyedStormCannons = []
    for (const id in conquer.features) {
      if (conquer.features[id].type && conquer.features[id].type === 'stormCannon'
          && conquer.features[id].region in existingStormCannons
          && !existingStormCannons[conquer.features[id].region]?.includes(id)) {
        destroyedStormCannons.push(id)
        changed.push(id)
      }
    }
    if (changed.length === 0) {
      if (regionVersionChanged) {
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
    conquer.version++;
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
  const promises = []
  // fetch all fields/industries and current state of towns
  conquer.version += 2
  war.version++
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

          if (type === 'field' || type === 'industry') {
            const id = uuid.v4()
            war.features.push({
              type: 'Feature',
              id: id,
              geometry: {
                type: 'Point',
                coordinates: [
                  region.properties.box[0] - item.x * extent[0],
                  region.properties.box[1] - item.y * extent[1]
                ]
              },
              properties: {
                type: type,
                icon: icon,
                notes: notes,
                id: id,
                user: 'World',
                time: '',
                team: '',
              }
            })
          }
        }
        else {
          console.log('Unkown type ' + item.iconType, item)
        }
      }
    }).catch((e) => {console.log('warapi connection issue', e)}))
    waitTimeout += 100
  }
  return Promise.all(promises).then(() => {
    saveRegions()
  })
}

function clearRegions() {
  war.version = 1
  war.features = []
  conquer.version = 1
  conquer.regions = {}
  conquer.features = {}
  conquer.deactivatedRegions = undefined
  saveRegions()
}

function saveRegions() {
  const json = JSON.stringify(war)
  fs.writeFileSync(__dirname + '/../data/war.json', json);
  fs.writeFileSync(conquerFileName, JSON.stringify(conquer, null, 2));
}

module.exports.updateMap = updateMap
module.exports.regenRegions = regenRegions
module.exports.clearRegions = clearRegions
module.exports.getConquerStatus = function() {
  return {version: conquer.version, features: conquer.features, warVersion: war.version, full: true}
}
module.exports.getWarFeatures = function () {
  return {features: war.features, deactivatedRegions: conquer.deactivatedRegions, version: war.version}
}
module.exports.getConquerStatusVersion = function() {
  return conquer.version;
}
