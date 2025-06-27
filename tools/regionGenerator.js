import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hash } from "node:crypto";

import { intersect, voronoi } from "@turf/turf";
import { Collection } from "ol";
import GeoJSON from "ol/format/GeoJSON.js";
import LineString from "ol/geom/LineString.js";
import VectorSource from "ol/source/Vector.js";

import warapi from "../lib/warapi.js";
const region = JSON.parse(fs.readFileSync("tools/deadland.json", 'utf8'));

const oldStatic = JSON.parse(fs.readFileSync(path.resolve('public/static.json'), 'utf8'));
const idMap = {}
const posMap = {}
let pos = 0
for (const item of oldStatic.features) {
    const key = item.properties.type + item.properties.notes + item.properties.region;
    if (key in idMap) {
        console.log('Duplicate', item.properties.notes, item.properties.region, oldStatic.features[posMap[idMap[key]]].properties.region)
    }
    idMap[key] = item.id
    posMap[item.id] = pos
    pos++
}

const coordsDeadland = region.features[0].geometry.coordinates[0]

region.features[0].properties.box = [coordsDeadland[5][0], coordsDeadland[0][1]]

// 3xUP
let lastCoords = JSON.parse(JSON.stringify(coordsDeadland))
let names = [{notes: 'Callahan\'s Passage', id: 'CallahansPassageHex'}, {notes: 'Reaching Trail', id: 'ReachingTrailHex'}, {notes: 'Basin Sionnach', id: 'BasinSionnachHex'}];
const diffY = lastCoords[0][1] - lastCoords[3][1]
const diffX = lastCoords[0][0] - lastCoords[1][0]
const diffX2 = lastCoords[1][0] - lastCoords[2][0]
while (names.length > 0) {
    const item = names.shift()
    const feature = {
        type: "Feature",
        id: item.id,
        geometry: {
            type: "Polygon",
            coordinates: [[],[],[],[],[],[]]
        },
        properties: {
            type: "Region",
            notes: item.notes,
            id: item.id,
        }
    }
    feature.geometry.coordinates[0] = [...lastCoords[0]]
    feature.geometry.coordinates[0][1] += diffY
    feature.geometry.coordinates[1] = [...lastCoords[1]]
    feature.geometry.coordinates[1][1] += diffY
    feature.geometry.coordinates[3] = [...lastCoords[1]]
    feature.geometry.coordinates[4] = [...lastCoords[0]]
    feature.geometry.coordinates[2] = [...lastCoords[2]]
    feature.geometry.coordinates[2][1] += diffY
    feature.geometry.coordinates[5] = [...lastCoords[5]]
    feature.geometry.coordinates[5][1] += diffY
    feature.properties.box = [feature.geometry.coordinates[5][0], feature.geometry.coordinates[0][1]]
    lastCoords = JSON.parse(JSON.stringify(feature.geometry.coordinates))
    feature.geometry.coordinates = [feature.geometry.coordinates]
    region.features.push(feature)
}

// 3xDown
lastCoords = JSON.parse(JSON.stringify(coordsDeadland))
names = [{notes: 'Umbral Wildwood', id: 'UmbralWildwoodHex'}, {notes: 'Great March', id: 'GreatMarchHex'}, {notes: 'Kalokai', id: 'KalokaiHex'}];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[3].geometry.coordinates[0])
names = [{notes: 'Speaking Woods', id: 'SpeakingWoodsHex'}, {notes: 'The Moors', id: 'MooringCountyHex'}, {notes: 'The Linn of Mercy', id: 'LinnMercyHex'}, {notes: 'Loch Mór', id: 'LochMorHex'}, {notes: 'The Heartlands', id: 'HeartlandsHex'}, {notes: 'Red River', id: 'RedRiverHex'}];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[7].geometry.coordinates[0])
names = [{notes: 'Callum\'s Cape', id: 'CallumsCapeHex'}, {notes: 'Stonecradle', id: 'StonecradleHex'}, {notes: 'King\'s Cage', id: 'KingsCageHex'}, {notes: 'Sableport', id: 'SableportHex'}, {notes: 'Ash Fields', id: 'AshFieldsHex'}];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[13].geometry.coordinates[0])
names = [{notes: 'Nevish Line', id: 'NevishLineHex'}, {notes: 'Farranac Coast', id: 'FarranacCoastHex'}, {notes: 'Westgate', id: 'WestgateHex'}, {notes: 'Origin', id: 'OriginHex'}];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[18].geometry.coordinates[0])
names = [{notes: 'The Oarbreaker Isles', id: 'OarbreakerHex'}, {notes: 'Fisherman\'s Row', id: 'FishermansRowHex'}, {notes: 'Stema Landing', id: 'StemaLandingHex'}];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[3].geometry.coordinates[0])
names = [{notes: 'Howl County', id: 'HowlCountyHex'}, {notes: 'Viper Pit', id: 'ViperPitHex'}, {notes: 'Marban Hollow', id: 'MarbanHollow'}, {notes: 'The Drowned Vale', id: 'DrownedValeHex'}, {notes: 'Shackled Chasm', id: 'ShackledChasmHex'}, {notes: 'Arcithia', id: 'AcrithiaHex'}];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[25].geometry.coordinates[0])
names = [{notes: 'Clanshead Valley', id: 'ClansheadValleyHex'}, {notes: 'Weathered Expanse', id: 'WeatheredExpanseHex'}, {notes: 'The Clahstra', id: 'ClahstraHex'}, {notes: 'Allod\'s Bight', id: 'AllodsBightHex'}, {notes: 'Terminus', id: 'TerminusHex'}];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[31].geometry.coordinates[0])
names = [{notes: 'Morgen\'s Crossing', id: 'MorgensCrossingHex'}, {notes: 'Stlican Shelf', id: 'StlicanShelfHex'}, {notes: 'Endless Shore', id: 'EndlessShoreHex'}, {notes: 'Reaver\'s Pass', id: 'ReaversPassHex'}];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[36].geometry.coordinates[0])
names = [{notes: 'Godcrofts', id: 'GodcroftsHex'}, {notes: 'Tempest Island', id: 'TempestIslandHex'}, {notes: 'The Fingers', id: 'TheFingersHex'}];
goDown(names, lastCoords)


const extend = [diffX + 2*diffX2, diffY]
console.log('extend', extend)

const promises = []
for (const reg of region.features) {
    promises.push(warapi.staticMap(reg.id).then((data) => {
        for (const item of data.mapTextItems) {
            const id = idMap[item.mapMarkerType + item.text + reg.id] || crypto.randomUUID()
            region.features.push({
                type: "Feature",
                id: id,
                geometry: {
                    type: "Point",
                    coordinates: [reg.properties.box[0] - item.x * extend[0], reg.properties.box[1] - item.y * extend[1]]
                },
                properties: {
                    id: id,
                    type: item.mapMarkerType,
                    notes: item.text,
                    region: reg.id,
                }
            })
        }
    }))
}

Promise.all(promises).then(() => {
    fs.writeFile(path.resolve('public/static.json'), JSON.stringify(region), err => {
        if (err) {
            console.error(err);
            return
        }
        console.log('static.json written successfully')
        const regions = region

        Promise.all([GeoJSON, VectorSource, Collection, LineString]).then(([GeoJSON, VectorSource, Collection, LineString]) => {

            const geonJson = new GeoJSON();
            /** @type {import('ol/source').Vector} */
            const regionSource = new VectorSource({
                features: new Collection()
            })
            /** @type {import('ol/source').Vector} */
            const majorLabels = new VectorSource({
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

            for (const label of regions.features) {
                if (label.properties.type !== 'Major') {
                    continue;
                }
                /** @type {import('ol').Feature} */
                const majorFeature = geonJson.readFeature(label);
                majorLabels.addFeature(majorFeature)
                const regionId = majorFeature.get('region')
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
                    const intersectedFeature = geonJson.readFeature(intersect(geonJson.writeFeaturesObject([feature, regionFeature])));
                    source.forEachFeature((label) => {
                        if (intersectedFeature.getGeometry().intersectsCoordinate(label.getGeometry().getCoordinates())) {
                            intersectedFeature.set('notes', label.get('notes'))
                            intersectedFeature.set('region', regionId)
                            intersectedFeature.set('type', 'voronoi')
                        }
                    })
                    intersectedFeature.setId(idMap['voronoi' + intersectedFeature.get('notes') + regionId] || crypto.randomUUID())
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
            const minorHashes = []
            for (const minor of regions.features) {
                if (minor.properties.type !== 'Minor') {
                    continue;
                }
                // remove duplicates https://github.com/clapfoot/warapi/issues/109
                const h = hash("sha1", JSON.stringify({notes: minor.properties.notes, region: minor.properties.region, type: minor.properties.type, geometry: minor.geometry}))
                if (minorHashes.includes(h)) {
                    continue;
                }
                minorHashes.push(h)
                const minorFeature = geonJson.readFeature(minor);
                collection.features.push(geonJson.writeFeatureObject(minorFeature))
            }
            collection.features.push(...voronoiDiagrams)

            // sort like current, new stuff at the end
            collection.features.sort((a, b) => {
                return (a.id in posMap ? posMap[a.id] : 2000) - (b.id in posMap ? posMap[b.id] : 2000)
            })

            fs.writeFileSync(path.resolve('public/static.json'), JSON.stringify(collection))
            process.exit(0)
        })
    });
})


function goDown(names, lastCoords) {
    while (names.length > 0) {
        const item = names.shift();
        const feature = {
            type: "Feature",
            id: item.id,
            geometry: {
                type: "Polygon",
                coordinates: [[],[],[],[],[],[]]
            },
            properties: {
                type: "Region",
                notes: item.notes,
                id: item.id
            }
        }
        feature.geometry.coordinates[0] = [...lastCoords[4]]
        feature.geometry.coordinates[1] = [...lastCoords[3]]
        feature.geometry.coordinates[3] = [...lastCoords[3]]
        feature.geometry.coordinates[3][1] -= diffY
        feature.geometry.coordinates[4] = [...lastCoords[4]]
        feature.geometry.coordinates[4][1] -= diffY
        feature.geometry.coordinates[2] = [...lastCoords[2]]
        feature.geometry.coordinates[2][1] -= diffY
        feature.geometry.coordinates[5] = [...lastCoords[5]]
        feature.geometry.coordinates[5][1] -= diffY
        feature.properties.box = [feature.geometry.coordinates[5][0], feature.geometry.coordinates[0][1]]
        lastCoords = JSON.parse(JSON.stringify(feature.geometry.coordinates))
        feature.geometry.coordinates = [feature.geometry.coordinates]
        region.features.push(feature)
    }
}

function leftUp(coords) {
    let lastCoords = [[],[],[],[],[],[]]
    lastCoords[0][1] = coords[5][1] + diffY
    lastCoords[1][1] = coords[5][1] + diffY
    lastCoords[3][1] = lastCoords[0][1] - diffY
    lastCoords[4][1] = lastCoords[0][1] - diffY
    lastCoords[2][1] = coords[3][1] + diffY
    lastCoords[5][1] = coords[3][1] + diffY

    lastCoords[0][0] = coords[5][0] + diffX
    lastCoords[1][0] = coords[5][0]
    lastCoords[2][0] = coords[4][0]
    lastCoords[3][0] = lastCoords[1][0]
    lastCoords[4][0] = lastCoords[0][0]
    lastCoords[5][0] = lastCoords[0][0] + diffX2
    return lastCoords;
}

function rightUp(coords) {
    let lastCoords = [[],[],[],[],[],[]]
    lastCoords[0][1] = coords[5][1] + diffY
    lastCoords[1][1] = coords[5][1] + diffY
    lastCoords[3][1] = lastCoords[0][1] - diffY
    lastCoords[4][1] = lastCoords[0][1] - diffY
    lastCoords[2][1] = coords[3][1] + diffY
    lastCoords[5][1] = coords[3][1] + diffY

    lastCoords[0][0] = coords[2][0]
    lastCoords[1][0] = coords[2][0] - diffX
    lastCoords[5][0] = coords[3][0]
    lastCoords[3][0] = lastCoords[1][0]
    lastCoords[4][0] = lastCoords[0][0]
    lastCoords[2][0] = lastCoords[1][0] - diffX2
    return lastCoords;
}
