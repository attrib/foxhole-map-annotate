const fs = require('fs')
const warapi = require('../lib/warapi')
const uuid = require("uuid");
const newIconTypes = [27];
//  5677.127345, -6208.60737175
//  5676.70238 -6208.1989975

const regions = JSON.parse(fs.readFileSync(__dirname + '/../public/static.json', 'utf8'))

const extent = [-2046, 1777]
const promises = []

const knownFeatures = [];
for (const feature of regions.features) {
  if (feature.properties.type === 'Region' || feature.properties.type === 'voronoi' || feature.properties.type === 'Major' || feature.properties.type === 'Minor') {
    continue;
  }
  // Ignore for update 52 (keep them for now)
  if (feature.properties.icon === 'MapIconRocketSite') {
    continue;
  }
  if (feature.id === '50c88e58-a634-4179-9a29-7e4a426c7c86') {
    feature.geometry.coordinates = [5676.70238,-6208.1989975];
  }
  if (feature.id === 'f2a97281-d3c1-4776-868b-5a51947e3fe1') {
    console.log(feature.geometry.coordinates)
    feature.geometry.coordinates = [1603.847995,-7148.7912025];
  }
  if (feature.id === '097ce056-3dab-4ce6-bd28-d094d7041730') {
    console.log(feature.geometry.coordinates)
    feature.geometry.coordinates = [1531.2738949999998,-7099.242042];
  }
  knownFeatures[feature.id] = feature
}
console.log('Know features', Object.keys(knownFeatures).length)

for (const region of regions.features) {
  if (region.properties.type !== 'Region') {
    continue;
  }

  promises.push(warapi.dynamicMap(region.id).then((data) => {
    for (const item of data.mapItems) {
      if (item.iconType in warapi.iconTypes) {
        const x = region.properties.box[0] - item.x * extent[0]
        const y = region.properties.box[1] - item.y * extent[1]
        const type = warapi.iconTypes[item.iconType].type
        const icon = warapi.iconTypes[item.iconType].icon
        const notes = warapi.iconTypes[item.iconType].notes
        const team = warapi.getTeam(item.teamId)
        const flags = item.flags || 0

        if (type === 'field' || type === 'industry') {
          continue;
        }

        const feature = regions.features.find((compare) => {
          return compare.geometry.coordinates[0] === x && compare.geometry.coordinates[1] === y
        })

        if (!feature) {
          console.log('Missing', region.id, type, icon, flags, x, y, item)
        }
        else {
          delete knownFeatures[feature.id]
          if (feature.properties.type !== type) {
            console.log('Different', region.id, type, icon, flags, notes, item, feature)
          }
          if (!feature.properties.notes.endsWith(notes)) {
            if (feature.properties.notes.endsWith('Relic Base')) {
              //console.log('Update', feature.properties.notes, feature.properties.notes.replace('Relic Base', notes))
              feature.properties.notes = feature.properties.notes.replace('Relic Base', notes)
            }
            else if (feature.properties.notes === 'Safehouse' && notes === 'Keep') {
              feature.properties.notes = notes;
            }
            else {
              console.log('Different', feature.properties.notes, notes)
            }
          }
        }


        // if (newIconTypes.includes(item.iconType)) {
        //   const id = uuid.v4()
        //   regions.features.push({
        //     type: 'Feature',
        //     id: id,
        //     geometry: {
        //       type: 'Point',
        //       coordinates: [
        //         region.properties.box[0] - item.x * extent[0],
        //         region.properties.box[1] - item.y * extent[1]
        //       ]
        //     },
        //     properties: {
        //       type: type,
        //       icon: icon,
        //       notes: notes,
        //       id: id,
        //       user: 'World',
        //       time: '',
        //       team: '',
        //       region: region.id,
        //     }
        //   })
        // }
      }
      else {
        console.log('Unkown type ' + item.iconType, item)
      }
    }

  }))
}

Promise.all(promises).then(() => {
  console.log('not processed features', knownFeatures, Object.keys(knownFeatures).length)
  fs.writeFileSync(__dirname + '/../public/static.json', JSON.stringify(regions))
  console.log('done')
  process.exit(0)
})