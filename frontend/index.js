import 'ol/ol.css';
import 'ol-layerswitcher/src/ol-layerswitcher.css';
import 'ol-popup/src/ol-popup.css'

import TileGrid from "ol/tilegrid/TileGrid";
import {Map, View, Collection} from "ol";
import {defaults} from "ol/control";
import {Group, Vector, Tile} from "ol/layer";
import {TileImage, Vector as VectorSource} from "ol/source";
import {GeoJSON} from "ol/format";
import {Style, Stroke, Icon} from "ol/style";
import {Draw, Snap, Modify, Select} from "ol/interaction";
import Popup from "ol-popup/src/ol-popup";
import {addDefaultMapControls, createCustomControl} from "./mapControls"
import Tools from "./mapTools";

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
            attributions: '',
            tileGrid: new TileGrid({
              extent: [0,-6217,5645,0],
              origin: [0,-6217],
              resolutions: [32,16,8,4,2,1],
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
    center: [2822.500000, -2108.500000],
    resolution: 4.000000,
  })
});

addDefaultMapControls(map)

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
    console.log(feature.getGeometry().getType())
    if (feature.getGeometry().getType() === 'LineString') {
      trackInfo.style.display = 'block';
      trackInfo.getElementsByClassName('clan')[0].innerHTML = feature.get('clan');
      trackInfo.getElementsByClassName('user')[0].innerHTML = feature.get('user');
      trackInfo.getElementsByClassName('time')[0].innerHTML = feature.get('time');
      trackInfo.getElementsByClassName('notes')[0].innerHTML = feature.get('notes');
    }
    else {
      iconInfo.style.display = 'block';
      iconInfo.getElementsByClassName('user')[0].innerHTML = feature.get('user');
      iconInfo.getElementsByClassName('time')[0].innerHTML = feature.get('time');
      iconInfo.getElementsByClassName('text')[0].innerHTML = feature.get('notes');
    }
  }
})

//
// add lines
//

const geoJson = new GeoJSON();
let col = geoJson.readFeatures({"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"LineString","coordinates":[[2177.5844952474167,-601.0173296242892],[2291.209410513108,-631.2562183643524],[2357.1851677641553,-724.721874470002],[2416.7466152824613,-830.099820079313],[2408.4996456260806,-987.7085735123692],[2441.487524251604,-1009.7004925960515],[2397.5036860842392,-1043.604701183395],[2334.276918718653,-1160.8949362963672],[2475.3917328389475,-1177.3888756091287],[2497.3836519226297,-1170.9745658763882],[2497.3836519226297,-1204.8787744637316],[2589.016648104639,-1225.954363585594],[2585.3513282573585,-1269.9382017529583],[2562.4430792118565,-1338.6629488894655],[2558.777759364576,-1416.5509956441736],[2589.016648104639,-1439.4592446896759]]},"properties":{clan:'BigOof'}}]})
const collection = new Collection(col);
const clanGroup = new Group({
  title: 'Train Lines',
});
map.addLayer(clanGroup);

let draw = null, snap = null

collection.on('add', (e) => {
  console.log('add', e)
  e.element.set('clan', 'unknown');
  console.log(geoJson.writeFeatures(collection.getArray()))
})
collection.on('change', (e) => {
  console.log('change', e)
  console.log(geoJson.writeFeatures(collection.getArray()))
})

var sourceLine = new VectorSource({
  features: collection,
});

var vectorLine = new Vector({
  source: sourceLine,
  title: 'BigOof',
  style: (feature,zoom) => {
    return new Style({
      stroke: new Stroke({
        color: "#4e6fe5",
        width: 5,
      })
    })
  }
});
clanGroup.getLayers().push(vectorLine);

//
// controls
//

const tools = new Tools(map);

map.addControl(createCustomControl('E', function(e, element) {
  const editButtons = document.getElementsByClassName('edit-buttons');
  tools.changeMode(element.classList.contains('selected'))
  for (let button of editButtons) {
    button.style.display = tools.editMode ? 'block' : 'none'
  }
}, {
  elementClass: 'edit-button'
}))


map.addControl(createCustomControl('L', function(e) {
  if (draw === null) {
    draw = new Draw({
      // source: source,
      type: 'LineString',
      features: collection,
      stopClick: true,
    });
    map.addInteraction(draw);
    snap = new Snap({features: collection});
    map.addInteraction(snap);
  }
  else {
    map.removeInteraction(draw)
    map.removeInteraction(snap)
  }
}, {
  elementClass: 'edit-buttons'
}))

//
// modify
//

const select = new Select({
  wrapX: false,
});

const modify = new Modify({
  features: select.getFeatures(),
});

map.addInteraction(select)
map.addInteraction(modify)

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

map.addControl(createCustomControl('W', function(e) {
  if (draw === null) {
    draw = new Draw({
      // source: source,
      type: 'Point',
      features: iconCollection,
      // stopClick: true,
    });
    map.addInteraction(draw);
  }
  else {
    map.removeInteraction(draw)
  }
}, {
  elementClass: 'edit-buttons'
}))

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

map.addControl(createCustomControl('A', function(e) {
  if (draw === null) {
    draw = new Draw({
      // source: source,
      type: 'Point',
      features: iconAlertCollection,
      // stopClick: true,
    });
    map.addInteraction(draw);
  }
  else {
    map.removeInteraction(draw)
  }
}, {
  elementClass: 'edit-buttons'
}))

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