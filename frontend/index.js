import 'ol/ol.css';
import 'ol-layerswitcher/src/ol-layerswitcher.css';
import 'ol-popup/src/ol-popup.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

import TileGrid from "ol/tilegrid/TileGrid";
import {Map, View, Collection} from "ol";
import {defaults} from "ol/control";
import {Group, Vector, Tile} from "ol/layer";
import {TileImage, Vector as VectorSource} from "ol/source";
import {GeoJSON} from "ol/format";
import {Style, Stroke, Icon} from "ol/style";
import {Draw, Snap, Modify, Select} from "ol/interaction";
import Popup from "ol-popup/src/ol-popup";
import {addDefaultMapControls} from "./mapControls"
import Socket from "./webSocket";
import {never} from "ol/events/condition";
const EditTools = require("./mapEditTools")

// Needed for Hot Module Replacement
if(typeof(module.hot) !== 'undefined') {
  module.hot.accept()
}

var map = new Map({
  controls: defaults(),
  target: 'map',
  layers: [
    new Group({
      // title: 'Map',
      // combine: true,
      layers: [
        new Tile({
          title: 'Map',
          type: 'base',
          // opacity: 0.7,
          source: new TileImage({
            attributions: 'Clapfoot',
            tileGrid: new TileGrid({
              extent: [0,-12432,11251,0],
              origin: [0,-12432],
              resolutions: [64,32,16,8,4,2,1],
              tileSize: [256, 256]
            }),
            tileUrlFunction: function(tileCoord) {
              return ('/uploads/{z}/{x}/{y}.webp'
                .replace('{z}', String(tileCoord[0]))
                .replace('{x}', String(tileCoord[1]))
                .replace('{y}', String(- 1 - tileCoord[2])));
            },
          })
        }),
      ]
    }),
  ],
  view: new View({
    center: [5625.500000, -6216.000000],
    resolution: 64.000000,
  })
});

addDefaultMapControls(map)
const select = new Select({
  multi: false,
  toggleCondition: never
});
map.addInteraction(select)

const tools = new EditTools(map);

const trackInfo = document.getElementById('track-info'),
    iconInfo = document.getElementById('icon-info');
map.on('pointermove', (evt) => {
  const value = map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    return [feature, layer];
  });
  if (!value) {
    trackInfo.style.display = 'none';
    iconInfo.style.display = 'none';
  }
  else {
    const [feature, layer] = value;
    if (layer === null || layer.get('temp') === true) {
      trackInfo.style.display = 'none';
      iconInfo.style.display = 'none';
      return
    }
    if (feature.getGeometry().getType() === 'LineString') {
      trackInfo.style.display = 'block';
      trackInfo.getElementsByClassName('clan')[0].innerHTML = feature.get('clan');
      trackInfo.getElementsByClassName('user')[0].innerHTML = feature.get('user');
      trackInfo.getElementsByClassName('time')[0].innerHTML = new Date(feature.get('time')).toLocaleString();
      trackInfo.getElementsByClassName('notes')[0].innerHTML = feature.get('notes');
    }
    else {
      iconInfo.style.display = 'block';
      iconInfo.getElementsByClassName('user')[0].innerHTML = feature.get('user');
      iconInfo.getElementsByClassName('time')[0].innerHTML = new Date(feature.get('time')).toLocaleString();
      iconInfo.getElementsByClassName('text')[0].innerHTML = feature.get('notes');
    }
  }
})

//
// add lines
//

const geoJson = new GeoJSON();
const collection = new Collection();
const clanCollections = {}
const clanGroup = new Group({
  title: 'Train Lines',
});
map.addLayer(clanGroup);
const socket = new Socket();

socket.on('tracks', (tracks) => {
  collection.clear()
  for (const clan in clanCollections) {
    clanCollections[clan].clear()
  }
  const col = geoJson.readFeatures(tracks)
  collection.extend(col)
})

collection.on('add', (e) => {
  const feature = e.element
  const clan = feature.get('clan')
  if (!(clan in clanCollections)) {
    clanCollections[clan] = createClanCollection(clan)
  }
  clanCollections[clan].push(feature)
})

function createClanCollection(clan) {
  const collection = new Collection()
  const sourceLine = new VectorSource({
    features: collection,
  });

  const vectorLine = new Vector({
    source: sourceLine,
    title: clan,
    style: (feature, zoom) => {
      return new Style({
        stroke: new Stroke({
          color: feature.get('color'),
          width: 5,
        })
      })
    }
  });
  clanGroup.getLayers().push(vectorLine);
  return collection;
}

tools.on(tools.EVENT_TRACK_ADDED, (track) => {
  socket.send('trackAdd', geoJson.writeFeaturesObject(track.features))
})

tools.on(tools.EVENT_TRACK_UPDATED, (track) => {
  socket.send('trackUpdate', geoJson.writeFeatureObject(track))
})


//
// controls
//

// map.addControl(createCustomControl('train-front', function(e) {
//   if (draw === null) {
//     draw = new Draw({
//       // source: source,
//       type: 'LineString',
//       features: collection,
//       stopClick: true,
//     });
//     map.addInteraction(draw);
//     snap = new Snap({features: collection});
//     map.addInteraction(snap);
//   }
//   else {
//     map.removeInteraction(draw)
//     map.removeInteraction(snap)
//   }
// }, {
//   elementClass: 'edit-buttons'
// }))


//
// Icon Warning
//
const iconStyle = new Style({
  image: new Icon({
    anchor: [0.5, 46],
    anchorXUnits: 'fraction',
    anchorYUnits: 'pixels',
    src: 'images/warning.png',
    // size: [32,32],
    // offset: 10,
    // scale: [32,32]
  }),
});
const iconCollection = new Collection([]);
var iconSourceLine = new VectorSource({
  features: iconCollection,
});

var iconVectorLine = new Vector({
  source: iconSourceLine,
  title: 'Warnings',
  style: (feat, zoom) => {
    // iconStyle.scale = Math.min(0.0625 * zoom, 0.0625)
    console.log(iconStyle)
    return iconStyle
  },
});
map.addLayer(iconVectorLine);

// map.addControl(createCustomControl('exclamation-triangle', function(e) {
//   if (draw === null) {
//     draw = new Draw({
//       // source: source,
//       type: 'Point',
//       features: iconCollection,
//       // stopClick: true,
//     });
//     map.addInteraction(draw);
//   }
//   else {
//     map.removeInteraction(draw)
//   }
// }, {
//   elementClass: 'edit-buttons'
// }))

//
// Icon Alert
//
const iconAlertStyle = new Style({
  image: new Icon({
    anchor: [0.5, 46],
    anchorXUnits: 'fraction',
    anchorYUnits: 'pixels',
    src: 'images/alert.png',
    // size: [32,32],
    // offset: 10,
    // scale: [32,32]
  }),
});
const iconAlertCollection = new Collection([]);
var iconAlertSourceLine = new VectorSource({
  features: iconAlertCollection,
});

var iconAlertVectorLine = new Vector({
  source: iconAlertSourceLine,
  title: 'Alert',
  style: (feat, zoom) => {
    // iconStyle.scale = Math.min(0.0625 * zoom, 0.0625)
    console.log(iconAlertStyle)
    return iconAlertStyle
  },
});
map.addLayer(iconAlertVectorLine);

// map.addControl(createCustomControl('exclamation-octagon', function(e) {
//   if (draw === null) {
//     draw = new Draw({
//       // source: source,
//       type: 'Point',
//       features: iconAlertCollection,
//       // stopClick: true,
//     });
//     map.addInteraction(draw);
//   }
//   else {
//     map.removeInteraction(draw)
//   }
// }, {
//   elementClass: 'edit-buttons'
// }))

//
// overlay
//

// var popup = new Popup();
// map.addOverlay(popup);
//
// // display popup on click
// map.on('click', function (evt) {
//   const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
//     return feature;
//   });
//   popup.hide();
//   if (!feature) {
//     return;
//   }
//   popup.show(evt.coordinate, feature.get('clan'));
// });