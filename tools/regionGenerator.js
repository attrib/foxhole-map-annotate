const region = require('./deadland.json');
const fs = require('fs');

const coordsDeadland = region.features[0].geometry.coordinates[0]

region.features[0].properties.box = [coordsDeadland[5][0], coordsDeadland[0][1]]

// 3xUP
let lastCoords = JSON.parse(JSON.stringify(coordsDeadland))
let names = ['Callahans Passage', 'Reaching Trail', 'Basin Sionnach'];
const diffY = lastCoords[0][1] - lastCoords[3][1]
const diffX = lastCoords[0][0] - lastCoords[1][0]
const diffX2 = lastCoords[1][0] - lastCoords[2][0]
for (let i=0;i<3;i++) {
    const feature = {
        type: "Feature",
//        id: "",
        geometry: {
            type: "Polygon",
            coordinates: [[],[],[],[],[],[]]
        },
        properties: {
            type: "region",
            notes: "Deadlands",
            id: ""
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
    feature.properties.notes = names.shift()
    feature.properties.box = [feature.geometry.coordinates[5][0], feature.geometry.coordinates[0][1]]
    lastCoords = JSON.parse(JSON.stringify(feature.geometry.coordinates))
    feature.geometry.coordinates = [feature.geometry.coordinates]
    region.features.push(feature)
}

// 3xDown
lastCoords = JSON.parse(JSON.stringify(coordsDeadland))
names = ['Umbral Wildwood', 'Great March', 'Kalokai'];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[3].geometry.coordinates[0])
names = ['Speaking Woods', 'The Moors', 'The Linn of Mercy', 'Loch Mor', 'The Heartlands', 'Red River'];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[7].geometry.coordinates[0])
names = ['Callums Cape', 'Stonecradle', 'Farranac Coast', 'Westgate', 'Ash Fields'];
goDown(names, lastCoords)

lastCoords = leftUp(region.features[13].geometry.coordinates[0])
names = ['Nevish Line', 'The Oarbreaker Isles', 'Fishermans Row', 'Origin'];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[3].geometry.coordinates[0])
names = ['Howl Country', 'Viper Pit', 'Marban Hollow', 'The Drowned Vale', 'Shackled Chasm', 'Arcithia'];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[22].geometry.coordinates[0])
names = ['Clanshead Valley', 'Weathered Expanse', 'Endless Shore', 'Allods Bright', 'Terminus'];
goDown(names, lastCoords)

lastCoords = rightUp(region.features[28].geometry.coordinates[0])
names = ['Morgans Crossing', 'Godscraft', 'Tempest Island', 'The Fingers'];
goDown(names, lastCoords)

console.log('extend', diffX + 2*diffX2, diffY)

fs.writeFile('../public/regions.json', JSON.stringify(region, null, 2), err => {
    if (err) {
        console.error(err);
    }
});

function goDown(names, lastCoords) {
    while (names.length > 0) {
        const feature = {
            type: "Feature",
//        id: "",
            geometry: {
                type: "Polygon",
                coordinates: [[],[],[],[],[],[]]
            },
            properties: {
                type: "region",
                notes: "Deadlands",
                id: ""
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
        feature.properties.notes = names.shift()
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