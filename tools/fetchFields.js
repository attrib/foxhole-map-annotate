const regions = require(__dirname + '/../public/regions.json')
const warapi = require('../lib/warapi')
const uuid = require('uuid')
const extent = [-2050,1775]

const iconTypes = {
  20: {
    icon: 'scrap_field',
    notes: 'Salvage Field',
  },
  21: {
    icon: 'comp_field',
    notes: 'Component Field',
  },
  23: {
    icon: 'sulfur_field',
    notes: 'Sulfur Field',
  },
  32: {
    icon: 'sulfur_mine',
    notes: 'Sulfur Mine',
  },
  38: {
    icon: 'scrap_mine',
    notes: 'Salvage Mine',
  },
  40: {
    icon: 'comp_mine',
    notes: 'Component Mine',
  },
  61: {
    icon: 'coal_field',
    notes: 'Coal Field',
  },
  62: {
    icon: 'oil_field',
    notes: 'Oil Field',
  },
}

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

console.log(deleteFields)
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
      if (item.iconType in iconTypes) {
        icons.features.push({
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              region.properties.box[0] - item.x * extent[0],
              region.properties.box[1] - item.y * extent[1]
            ]
          },
          "properties": {
            "type": "field",
            "icon": iconTypes[item.iconType].icon,
            "notes": iconTypes[item.iconType].notes,
            "id": uuid.v4(),
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

