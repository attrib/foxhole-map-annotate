const fs = require('fs')
const staticFile = JSON.parse(fs.readFileSync('public/static.json'))

const voronoi = {}
const watchTowers = {}
const towns = {}

for (const feature of staticFile.features) {
  if (feature.properties.icon === 'MapIconObservationTower') {
    watchTowers[feature.id] = feature
  }
  if (feature.properties.type === 'voronoi') {
    voronoi[feature.id] = feature
  }
  if (feature.properties.type === 'town' && feature.properties.icon !== 'MapIconRocketSite' && feature.properties.icon !== 'MapIconObservationTower') {
    if (!(feature.properties.voronoi in towns)) {
      towns[feature.properties.voronoi] = []
    }
    towns[feature.properties.voronoi].push(feature)
  }
}

for (const vorId of Object.keys(voronoi)) {
  // console.log(vorId, voronoi[vorId].properties.town)
  if (voronoi[vorId].properties.town in watchTowers) {
    if (towns[vorId].length !== 1) {
      console.log(voronoi[vorId].properties.notes, watchTowers[voronoi[vorId].properties.town].properties.notes, towns[vorId])
    }
    else {
      console.log(voronoi[vorId].properties.notes, towns[vorId][0].id)
      voronoi[vorId].properties.town = towns[vorId][0].id
    }
  }
}

fs.writeFileSync('public/static.json', JSON.stringify(staticFile))