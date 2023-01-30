const fs = require('fs');
const regions = JSON.parse(fs.readFileSync(__dirname + '/../public/static.json', 'utf8'))
//const warapi = require("../lib/warapi")
const uuid = require("uuid")
const GeoJSON = import("ol/format/GeoJSON.js")
const VectorSource = import("ol/source/Vector.js")
const Collection = import("ol")
const LineString = import("ol/geom/LineString.js")
const voronoi = require('@turf/voronoi')
const intersect = require('@turf/intersect').default

Promise.all([GeoJSON, VectorSource, Collection, LineString]).then(([GeoJSON, VectorSource, ol, LineString]) => {
  const geonJson = new GeoJSON.default();
  /** @type {import('ol/source').Vector} */
  const regionSource = new VectorSource.default({
    features: new ol.Collection()
  })
  /** @type {import('ol/source').Vector} */
  const majorLabels = new VectorSource.default({
    features: new ol.Collection()
  })
  /** @type {import('ol/source').Vector} */
  const towns = new VectorSource.default({
    features: new ol.Collection()
  })
  const majorLabelsByRegion = {}


  for (const region of regions.features) {
    if (region.properties.type !== 'Region') {
      continue;
    }
    const regionFeature = geonJson.readFeature(region);
    //console.log(regionFeature.getId())
    regionSource.addFeature(regionFeature)
  }

  for (const town of regions.features) {
    if (town.properties.type !== 'town' || town.properties.icon !== 'MapIconSafehouse') {
      continue;
    }
    /** @type {import('ol').Feature} */
    const majorFeature = geonJson.readFeature(town);
    majorLabels.addFeature(majorFeature)
    const extent = majorFeature.getGeometry().getExtent()

    let found = false
    regionSource.forEachFeatureInExtent(extent, (region) => {
      if (region.getGeometry().intersectsCoordinate(majorFeature.getGeometry().getCoordinates())) {
        if (found) {
          console.log('two regions?', region.getId(), majorFeature.get('notes'), found.getId())
        }
        found = region
      }
    })
    if (!found) {
      console.log('no region?')
    }
    const regionId = found.getId()
    town.properties.region = regionId
  }

  fs.writeFileSync(__dirname + '/../public/static.json', JSON.stringify(regions))

})
