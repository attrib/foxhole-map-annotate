const fs = require('fs')
const warapi = require('../lib/warapi')
const uuid = require("uuid");
const newIconTypes = [27];

const regions = JSON.parse(fs.readFileSync(__dirname + '/../public/static.json', 'utf8'))

const extent = [-2050,1775]
const promises = []
for (const region of regions.features) {
  if (region.properties.type !== 'Region') {
    continue;
  }

  promises.push(warapi.dynamicMap(region.id).then((data) => {
    for (const item of data.mapItems) {
      if (item.iconType in warapi.iconTypes) {
        const type = warapi.iconTypes[item.iconType].type
        const icon = warapi.iconTypes[item.iconType].icon
        const notes = warapi.iconTypes[item.iconType].notes

        if (newIconTypes.includes(item.iconType)) {
          const id = uuid.v4()
          regions.features.push({
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
              region: region.id,
            }
          })
        }
      }
      else {
        console.log('Unkown type ' + item.iconType, item)
      }
    }

  }))
}

Promise.all(promises).then(() => {
  fs.writeFileSync(__dirname + '/../public/static.json', JSON.stringify(regions))
  console.log('done')
})