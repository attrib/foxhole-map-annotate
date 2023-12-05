import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import icons from "../data/icons.json";
import warapi from "../lib/warapi.js";
import regions from "../public/regions.json";

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
        const id = crypto.randomUUID()
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
  fs.writeFile(path.resolve('data/icons.json'), JSON.stringify(icons, null, 2), err => {
    if (err) {
      console.error(err);
    }
  });
})

