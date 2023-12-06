const regions = require(__dirname + '/../public/regions.json')
const warapi = require('../lib/warapi')
const uuid = require('uuid')
const extent = [-2046, 1777]

const icons = require(__dirname + '/../data/icons.json')
const fs = require("fs");
const deleteFields = []
for (const i in icons.features) {
  const feature = icons.features[i]
  if (feature.properties.type !== 'field') {
    continue;
  }
  deleteFields.push(i)
}

for (const i of deleteFields.reverse()) {
  icons.features.splice(i, 1)
}

const promises = []
for (const region of regions.features) {
  if (region.properties.type !== 'Region') {
    continue;
  }
  console.log(region.properties)
  promises.push(warapi.dynamicMap(region.id).then((data) => {
    for (const item of data.mapItems) {
      if (item.iconType in warapi.iconTypes && warapi.iconTypes[item.iconType].type === 'field') {
        const id = uuid.v4()
        icons.features.push({
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
            "type": warapi.iconTypes[item.iconType].type,
            "icon": warapi.iconTypes[item.iconType].icon,
            "notes": warapi.iconTypes[item.iconType].notes,
            "id": id,
            "user": "World",
            "time": ""
          }
        })
      }
    }
  }))
}

Promise.all(promises).then(() => {
  fs.writeFile(__dirname + '/../data/icons.json', JSON.stringify(icons, null, 2), err => {
    if (err) {
      console.error(err);
    }
  });
})

