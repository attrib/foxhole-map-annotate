import fs from "node:fs";
import path from "node:path";

const defaultFeaturePath = path.resolve('data/defaultFeatures.json')
const defaultFeature = JSON.parse(fs.readFileSync(defaultFeaturePath, 'utf8'))

for (const feature of defaultFeature.features) {
  feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map((coords) => {
    coords[0] = coords[0] + 1543
    return coords
  })
}

console.log(defaultFeature.features.length)
fs.writeFile(defaultFeaturePath, JSON.stringify(defaultFeature), err => {
  if (err) {
    console.error(err);
  }
});