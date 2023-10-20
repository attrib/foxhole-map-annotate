const fs = require("fs");

const defaultFeature = JSON.parse(fs.readFileSync(`../data/defaultFeatures.json`, 'utf8'))

for (const feature of defaultFeature.features) {
  feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map((coords) => {
    coords[0] = coords[0] + 1543
    return coords
  })
}

console.log(defaultFeature.features.length)
fs.writeFile('../data/defaultFeatures.json', JSON.stringify(defaultFeature), err => {
  if (err) {
    console.error(err);
  }
});