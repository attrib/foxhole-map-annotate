import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import GeoJSON from "ol/format/GeoJSON.js";
import { Collection } from "ol";
import VectorSource from "ol/source/Vector.js";
import LineString from "ol/geom/LineString.js";
import voronoi from "@turf/voronoi";
import intersect from "@turf/intersect";

Promise.all([GeoJSON, VectorSource, Collection, LineString]).then(([GeoJSON, VectorSource, ol, LineString]) => {
  const geonJson = new GeoJSON();
  /** @type {import('ol/source').Vector} */
  const regionSource = new VectorSource({
    features: new Collection()
  })
  /** @type {import('ol/source').Vector} */
  const majorLabels = new VectorSource({
    features: new Collection()
  })
  /** @type {import('ol/source').Vector} */
  const towns = new VectorSource({
    features: new Collection()
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
    if (town.properties.type !== 'town') {
      continue;
    }
    const townFeature = geonJson.readFeature(town);
    towns.addFeature(townFeature)
  }

  for (const town of regions.features) {
    if (town.properties.type !== 'Major') {
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
    majorFeature.set('region', regionId)
    if (!(regionId in majorLabelsByRegion)) {
      majorLabelsByRegion[regionId] = new VectorSource({
        features: new Collection()
      })
    }
    majorLabelsByRegion[regionId].addFeature(majorFeature)
  }

  const voronoiDiagrams = []
  for (const regionId in majorLabelsByRegion) {
    /** @type {import('ol/source').Vector} */
    const source = majorLabelsByRegion[regionId]
    /** @type {import('ol').Feature} */
    const regionFeature = regionSource.getFeatureById(regionId)
    console.log(regionId, source.getFeatures().length)

    const extent = regionFeature.getGeometry().getExtent()
    const voronoiPolygons = voronoi(geonJson.writeFeaturesObject(source.getFeatures()), {
      bbox: extent
    });
    const collection = geonJson.readFeatures(voronoiPolygons)

    collection.forEach((feature) => {
      const intersectedFeature = geonJson.readFeature(intersect(geonJson.writeFeatureObject(feature), geonJson.writeFeatureObject(regionFeature)))
      intersectedFeature.setId(crypto.randomUUID())
      source.forEachFeature((label) => {
        if(intersectedFeature.getGeometry().intersectsCoordinate(label.getGeometry().getCoordinates())) {
          intersectedFeature.set('notes', label.get('notes'))
          intersectedFeature.set('region', regionId)
          intersectedFeature.set('type', 'voronoi')
        }
      })
      towns.forEachFeatureInExtent(intersectedFeature.getGeometry().getExtent(), (town) => {
        if(intersectedFeature.getGeometry().intersectsCoordinate(town.getGeometry().getCoordinates())) {
          intersectedFeature.set('town', town.getId())
          intersectedFeature.set('team', '')
          town.set('notes', intersectedFeature.get('notes') + ' ' + town.get('notes'))
          town.set('voronoi', intersectedFeature.getId())
          town.set('region', regionId)
          town.set('team', '')
          if (town.get('icon').startsWith('MapIconTownBaseTier')) {
            town.set('icon', 'MapIconTownBaseTier1')
          }
        }
      })
      voronoiDiagrams.push(geonJson.writeFeatureObject(intersectedFeature))
    })
  }

  const collection = {
    type: 'FeatureCollection',
    features: [],
  }
  regionSource.forEachFeature((feature) => {
    collection.features.push(geonJson.writeFeatureObject(feature))
  })
  majorLabels.forEachFeature((feature) => {
    collection.features.push(geonJson.writeFeatureObject(feature))
  })
  for (const minor of regions.features) {
    if (minor.properties.type !== 'Minor') {
      continue;
    }
    const minorFeature = geonJson.readFeature(minor);
    const extent = minorFeature.getGeometry().getExtent()
    let found = false
    regionSource.forEachFeatureInExtent(extent, (region) => {
      if (region.getGeometry().intersectsCoordinate(minorFeature.getGeometry().getCoordinates())) {
        if (found) {
          console.log('two regions?', region.getId(), minorFeature.get('notes'), found.getId())
        }
        found = region
      }
    })
    if (!found) {
      console.log('no region?')
    }
    minorFeature.set('region', found.getId())
    collection.features.push(geonJson.writeFeatureObject(minorFeature))
  }
  towns.forEachFeature((feature) => {
    collection.features.push(geonJson.writeFeatureObject(feature))
  })
  collection.features.push(...voronoiDiagrams)

  fs.writeFileSync(path.resolve('public/static.json'), JSON.stringify(collection))

})
