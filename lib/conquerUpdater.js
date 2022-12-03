const regions = require(__dirname + '/../public/regions.json')
const warapi = require("../lib/warapi")
const fs = require("fs");
const uuid = require("uuid");

const extent = [-2050,1775]
const conquerFileName = __dirname + '/../data/conquer.json';
const conquer = fs.existsSync(conquerFileName) ? require(conquerFileName) : {regions: {}, features: {}, version: 0};

function updateMap() {
  // Do not check map, war is not in progress
  if (warapi.warData.status !== warapi.WAR_IN_PROGRESS) {
    return new Promise((resolve) => {
      resolve(null)
    })
  }

  const promises = []
  const changed = [];
  let regionVersionChanged = false;

  for (const region of regions.features) {
    if (region.properties.type !== 'Region') {
      continue;
    }
    const version = region.id in conquer.regions ? conquer.regions[region.id] : null
    promises.push(warapi.dynamicMapETag(region.id, version).then((data) => {
      if (data === null) {
        return
      }
      if (data.error && data.error === 'Unknown mapId') {
        conquer.regions[region.id] = 'DEACTIVATED'
        return
      }
      conquer.regions[region.id] = data.version
      regionVersionChanged = true
      for (const item of data.mapItems) {
        if (item.iconType in warapi.iconTypes && (warapi.iconTypes[item.iconType].type === 'town' || warapi.iconTypes[item.iconType].type === 'industry')) {
          const x = region.properties.box[0] - item.x * extent[0]
          const y = region.properties.box[1] - item.y * extent[1]
          const type = warapi.iconTypes[item.iconType].type
          const icon = warapi.iconTypes[item.iconType].icon

          const feature = Object.values(regions.features).find((compare) => {
            return compare.geometry.coordinates[0] === x && compare.geometry.coordinates[1] === y && compare.properties.type === type
          })
          if (feature) {
            const team = warapi.getTeam(item.teamId)
            if (!(feature.id in conquer.features) || conquer.features[feature.id].team !== team || conquer.features[feature.id].icon !== icon) {
              conquer.features[feature.id] = {team, icon}
              changed.push(feature.id)
            }
          }
          else {
            console.log('Unable to find item in region.json', item)
          }
        }
      }
    }).catch((e) => {console.log('warapi connection issue', e)}))
  }

  return Promise.all(promises).then(() => {
    if (changed.length === 0) {
      if (regionVersionChanged) {
        fs.writeFileSync(conquerFileName, JSON.stringify(conquer, null, 2));
      }
      return null
    }
    const features = {}
    for (const id of changed) {
      features[id] = conquer.features[id]
    }
    const oldVersion = conquer.version
    conquer.version++;
    fs.writeFileSync(conquerFileName, JSON.stringify(conquer, null, 2));
    return {
      version: conquer.version,
      oldVersion,
      features,
      full: false,
    }
  })
}

function regenRegions() {
  const promises = []
  // remove all fields and industries
  regions.features = regions.features.filter((feature) => feature.properties.type !== 'field' && feature.properties.type !== 'industry')
  // fetch all fields/industries and current state of towns
  conquer.version = 1
  for (const region of regions.features) {
    if (region.properties.type !== 'Region') {
      continue;
    }
    promises.push(warapi.dynamicMap(region.id).then((data) => {
      if (data.error && data.error === 'Unknown mapId') {
        conquer.regions[region.id] = 'DEACTIVATED'
        return
      }
      conquer.regions[region.id] = data.version
      for (const item of data.mapItems) {
        if (item.iconType in warapi.iconTypes) {
          const type = warapi.iconTypes[item.iconType].type
          const icon = warapi.iconTypes[item.iconType].icon
          const notes = warapi.iconTypes[item.iconType].notes

          if (type === 'town') {
            const x = region.properties.box[0] - item.x * extent[0]
            const y = region.properties.box[1] - item.y * extent[1]

            const feature = Object.values(regions.features).find((compare) => {
              return compare.geometry.coordinates[0] === x && compare.geometry.coordinates[1] === y && compare.properties.type === type
            })
            if (feature) {
              const team = warapi.getTeam(item.teamId)
              if (!(feature.id in conquer.features) || conquer.features[feature.id].team !== team || conquer.features[feature.id].icon !== icon) {
                conquer.features[feature.id] = {team, icon}
              }
            } else {
              console.log('Unable to find item in region.json', item)
            }
          }
          else if (type === 'field' || type === 'industry' || (type === 'town' && icon === 'MapIconRocketSite')) {
            const id = uuid.v4()
            regions.features.push({
              "type": "Feature",
              "id": id,
              "geometry": {
                "type": "Point",
                "coordinates": [
                  region.properties.box[0] - item.x * extent[0],
                  region.properties.box[1] - item.y * extent[1]
                ]
              },
              "properties": {
                "type": type,
                "icon": icon,
                "notes": notes,
                "id": id,
                "user": "World",
                "time": ""
              }
            })
          }
        }
      }
    }).catch((e) => {console.log('warapi connection issue', e)}))
  }
  return Promise.all(promises).then(() => {
    saveRegions()
  })
}

function clearRegions() {
  regions.features = regions.features.filter((feature) => {
    if (feature.properties.type === 'field' || feature.properties.type === 'industry') {
      return false
    }
    if (feature.properties.type === 'town' && feature.properties.icon === 'MapIconRocketSite') {
      return false
    }
    return true
  })
  conquer.version = 1
  conquer.regions = {}
  for (const featureId in conquer.features) {
    const feature = conquer.features[featureId]
    feature.team = ''
    if (feature.icon.startsWith('MapIconTownBaseTier')) {
      feature.icon = 'MapIconTownBaseTier1'
    }
  }
  saveRegions()
}

function saveRegions() {
  const json = JSON.stringify(regions)
  fs.writeFileSync(__dirname + '/../data/regions.json', json);
  fs.writeFileSync(__dirname + '/../public/regions.json', json);
  fs.writeFileSync(conquerFileName, JSON.stringify(conquer, null, 2));
}

module.exports.updateMap = updateMap
module.exports.regenRegions = regenRegions
module.exports.clearRegions = clearRegions
module.exports.getConquerStatus = function() {
  return {version: conquer.version, features: conquer.features, full: true}
}
module.exports.getConquerStatusVersion = function() {
  return conquer.version;
}
