const region = require('./deadland.json');
const fs = require('fs');
const warapi = require("../lib/warapi")

const coordsDeadland = region.features[0].geometry.coordinates[0]

region.features[0].properties.box = [coordsDeadland[5][0], coordsDeadland[0][1]]

// 3xUP
let lastCoords = JSON.parse(JSON.stringify(coordsDeadland))
let names = [{notes: 'Callahans Passage', id: 'CallahansPassageHex'}, {notes: 'Reaching Trail', id: 'ReachingTrailHex'}, {notes: 'Basin Sionnach', id: 'BasinSionnachHex'}];
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
names = [{notes: 'Speaking Woods', id: 'SpeakingWoodsHex'}, {notes: 'The Moors', id: 'MooringCountyHex'}, {notes: 'The Linn of Mercy', id: 'LinnMercyHex'}, {notes: 'Loch Mor', id: 'LochMorHex'}, {notes: 'The Heartlands', id: 'HeartlandsHex'}, {notes: 'Red River', id: 'RedRiverHex'}];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[7].geometry.coordinates[0])
names = [{notes: 'Callums Cape', id: 'CallumsCapeHex'}, {notes: 'Stonecradle', id: 'StonecradleHex'}, {notes: 'Farranac Coast', id: 'FarranacCoastHex'}, {notes: 'Westgate', id: 'WestgateHex'}, {notes: 'Ash Fields', id: 'AshFieldsHex'}];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[13].geometry.coordinates[0])
names = [{notes: 'Nevish Line', id: 'NevishLineHex'}, {notes: 'The Oarbreaker Isles', id: 'OarbreakerHex'}, {notes: 'Fishermans Row', id: 'FishermansRowHex'}, {notes: 'Origin', id: 'OriginHex'}];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[3].geometry.coordinates[0])
names = [{notes: 'Howl Country', id: 'HowlCountyHex'}, {notes: 'Viper Pit', id: 'ViperPitHex'}, {notes: 'Marban Hollow', id: 'MarbanHollow'}, {notes: 'The Drowned Vale', id: 'DrownedValeHex'}, {notes: 'Shackled Chasm', id: 'ShackledChasmHex'}, {notes: 'Arcithia', id: 'AcrithiaHex'}];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[22].geometry.coordinates[0])
names = [{notes: 'Clanshead Valley', id: 'ClansheadValleyHex'}, {notes: 'Weathered Expanse', id: 'WeatheredExpanseHex'}, {notes: 'Endless Shore', id: 'EndlessShoreHex'}, {notes: 'Allods Bright', id: 'AllodsBightHex'}, {notes: 'Terminus', id: 'TerminusHex'}];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[28].geometry.coordinates[0])
names = [{notes: 'Morgans Crossing', id: 'MorgensCrossingHex'}, {notes: 'Godscraft', id: 'GodcroftsHex'}, {notes: 'Tempest Island', id: 'TempestIslandHex'}, {notes: 'The Fingers', id: 'TheFingersHex'}];
goDown(names, lastCoords)

const extend = [diffX + 2*diffX2, diffY]
console.log('extend', extend)

const promises = []
for (const reg of region.features) {
    promises.push(warapi.staticMap(reg.id).then((data) => {
        for (const item of data.mapTextItems) {
            region.features.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [reg.properties.box[0] - item.x * extend[0], reg.properties.box[1] - item.y * extend[1]]
                },
                properties: {
                    type: item.mapMarkerType,
                    notes: item.text,
                }
            })
        }
    }))
    promises.push(warapi.dynamicMap(reg.id).then((data) => {
        for (const item of data.mapItems) {
            if (item.iconType in warapi.iconTypes) {
                region.features.push({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [reg.properties.box[0] - item.x * extend[0], reg.properties.box[1] - item.y * extend[1]]
                    },
                    properties: {
                        type: warapi.iconTypes[item.iconType].type,
                        icon: warapi.iconTypes[item.iconType].icon,
                        notes: warapi.iconTypes[item.iconType].notes,
                        team: 'none',
                    }
                })
            }
        }
    }))
}

promises.push(warapi.war().then((data) => {
    data.shard = 'Able'
    fs.writeFile(__dirname + '/../data/wardata.json', JSON.stringify(data, null, 2), err => {
        if (err) {
            console.error(err);
        }
    });
}))

Promise.all(promises).then(() => {
    fs.writeFile(__dirname + '/../public/regions.json', JSON.stringify(region), err => {
        if (err) {
            console.error(err);
        }
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