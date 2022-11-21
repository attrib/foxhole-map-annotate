import TileGrid from "ol/tilegrid/TileGrid";
import {Map, View, Collection} from "ol";
import {defaults} from "ol/control";
import {Group, Vector, Tile} from "ol/layer";
import {TileImage, Vector as VectorSource} from "ol/source";
import {GeoJSON} from "ol/format";
import {Style, Stroke} from "ol/style";
import {addDefaultMapControls, enableLayerMemory} from "./mapControls"
import Socket from "./webSocket";
import StaticLayers from "./staticLayer";
const EditTools = require("./mapEditTools")

const url = new URL(window.location);

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
          preload: Infinity,
          // opacity: 0.7,
          source: new TileImage({
            attributions: '<a href="https://sentsu.itch.io/foxhole-better-map-mod" target="_blank">Sentsu</a> + <a href="https://www.foxholegame.com/" target="_blank">Siege Camp</a>',
            tileGrid: new TileGrid({
              extent: [0,-12432,11279,0],
              origin: [0,-12432],
              resolutions: [64,32,16,8,4,2,1],
              tileSize: [256, 256]
            }),
            tileUrlFunction: function(tileCoord) {
              return ('/map/{z}/{x}/{y}.webp'
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
    center: [url.searchParams.get('cx') ? parseFloat(url.searchParams.get('cx')) : 5625.500000, url.searchParams.get('cy') ? parseFloat(url.searchParams.get('cy')) : -6216.000000],
    resolution: url.searchParams.get('r') ? parseFloat(url.searchParams.get('r')) : 10.000000,
    minResolution: 0.5,
    maxResolution: 16,
  })
});

map.on('moveend', (event) => {
  const center = event.map.getView().getCenter()
  const url = new URL(window.location);
  url.searchParams.set('cx', center[0].toFixed(5));
  url.searchParams.set('cy', center[1].toFixed(5));
  url.searchParams.set('r', event.map.getView().getResolution().toFixed(5));
  window.history.replaceState({}, '', url);
})

addDefaultMapControls(map)
// Prevent context menu on map
document.getElementById('map').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
})

const conquerStatus = localStorage.getItem('conquerStatus') ? JSON.parse(localStorage.getItem('conquerStatus')) : {version: 0, features: {}}
const staticLayer = new StaticLayers(map, conquerStatus)
const clanGroup = new Group({
  title: 'Train Lines',
  fold: 'close',
});
map.addLayer(clanGroup);
const tools = new EditTools(map);
enableLayerMemory(map)

//
// add lines
//

const geoJson = new GeoJSON();
const collection = new Collection();
const clanCollections = {}
const socket = new Socket();

let lastVersion = null
let realACL = null
socket.on('init', (data) => {
  realACL = data.acl
  if (data.warStatus === 'resistance') {
    data.acl = 'read'
  }
  tools.initAcl(data.acl)
  if (lastVersion === null) {
    lastVersion = data.version
  }
  else if (lastVersion !== data.version) {
    console.log('Version change detected, reloading page')
    window.location = '/'
  }
})

tools.allTracksCollection = collection

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
    style: (feature) => {
      return new Style({
        stroke: new Stroke({
          color: feature.get('color'),
          width: 5,
          lineDash: tools.track.getDashedOption(feature)
        }),
        geometry: tools.track.geometryFunction
      })
    }
  });
  clanGroup.getLayers().push(vectorLine);
  return collection;
}

tools.on(tools.EVENT_TRACK_ADDED, (track) => {
  socket.send('trackAdd', geoJson.writeFeatureObject(track.feature))
})

tools.on(tools.EVENT_TRACK_UPDATED, (track) => {
  socket.send('trackUpdate', geoJson.writeFeatureObject(track))
})

tools.on(tools.EVENT_TRACK_DELETE, (track) => {
  if (track && track.get('id')) {
    socket.send('trackDelete', {id: track.get('id')})
  }
})

tools.on(tools.EVENT_ICON_ADDED, (icon) => {
  socket.send('iconAdd', geoJson.writeFeatureObject(icon))
})

tools.on(tools.EVENT_ICON_UPDATED, (icon) => {
  if (icon && icon.get('id')) {
    socket.send('iconUpdate', geoJson.writeFeatureObject(icon))
  }
})

tools.on(tools.EVENT_ICON_DELETED, (icon) => {
  if (icon && icon.get('id')) {
    socket.send('iconDelete', {id: icon.get('id')})
  }
})

socket.on('icons', (features) => {
  const col = geoJson.readFeatures(features)
  tools.information.clearFeatures()
  tools.sign.clearFeatures()
  tools.base.clearFeatures()
  //tools.field.clearFeatures()
  tools.facility.clearFeatures()
  tools.facilityPrivate.clearFeatures()
  tools.facilityEnemy.clearFeatures()
  tools.facilityCustom.clearFeatures();
  col.forEach((feature) => {
    switch (feature.get('type')) {
      case 'information':
        tools.information.addFeature(feature)
        break;
      case 'sign':
        tools.sign.addFeature(feature)
        break;
      case 'base':
        tools.base.addFeature(feature)
        break;
      // case 'field':
      //   tools.field.addFeature(feature)
      //   break;
      case 'facility':
        tools.facility.addFeature(feature)
        break;
      case 'facility-private':
        tools.facilityPrivate.addFeature(feature)
        break;
      case 'facility-enemy':
        tools.facilityEnemy.addFeature(feature)
        break;
      case 'facility-custom':
        tools.facilityCustom.addFeature(feature)
        break;
    }
  })
})

tools.on(tools.EVENT_DECAY_UPDATE, (data) => {
  socket.send('decayUpdate', data)
})

socket.on('decayUpdated', (data) => {
  tools.emit(tools.EVENT_DECAY_UPDATED, data)
  if (data.type === 'track') {
    collection.forEach((feat) => {
      if (feat.get('id') === data.id) {
        feat.set('time', data.time)
      }
    })
  }
})

socket.on('conquer', (data) => {
  if (conquerStatus.version === data.version) {
    return
  }
  staticLayer.conquerUpdate(data.features, !data.full)
  conquerStatus.version = data.version
  conquerStatus.features = data.full ? data.features : {...conquerStatus.features, ...data.features}
  localStorage.setItem('conquerStatus', JSON.stringify(conquerStatus))
})

const prepareWarTimerElement = document.getElementById('resistance-timer')
let prepareWarTimerTimoutId = null
socket.on('warEnded', (data) => {
  document.getElementById('warNumber').innerHTML = `${data.shard} #${data.warNumber} (Resistance)`
  tools.resetAcl()
  document.getElementById('resistance').classList.add(data.winner === 'WARDENS' ? 'alert-success' : 'alert-warning')
  document.getElementById('resistance-winner').innerHTML = data.winner === 'WARDENS' ? 'Warden' : 'Colonial'
  document.getElementById('resistance-' + data.winner).style.display = ''
  prepareWarTimerElement.dataset.conquestEndTime = data.conquestEndTime
  document.getElementById('resistance').style.display = ''
  prepareWarTimer()
})

socket.on('warPrepare', (data) => {
  conquerStatus.version = 0
  conquerStatus.features = {}
  document.getElementById('warNumber').innerHTML = `${data.shard} #${data.warNumber} (Preparing)`
  staticLayer.loadRegion(true)
  clearTimeout(prepareWarTimerTimoutId)
  document.getElementById('resistance').style.display = 'none'
  if (realACL) {
    tools.initAcl(realACL)
  }
})

socket.on('warChange', (data) => {
  conquerStatus.version = 0
  conquerStatus.features = {}
  document.getElementById('warNumber').innerHTML = `${data.shard} #${data.warNumber}`
  staticLayer.loadRegion(true)
})

const disconnectedWarning = document.getElementById('disconnected')
socket.on('open', () => {
  disconnectedWarning.style.display = 'none'
  socket.send('init', {
    conquerStatus: conquerStatus.version,
  })
})
socket.on('close', () => {
  disconnectedWarning.style.display = 'block'
})

const rtf = new Intl.RelativeTimeFormat('en', { style: 'long' })
function prepareWarTimer() {
  if (!prepareWarTimerElement.dataset.conquestEndTime) {
    return
  }
  const hours = (parseInt(prepareWarTimerElement.dataset.conquestEndTime) + 43200000 - Date.now()) / 3600000
  const minutes = (hours - Math.floor(hours)) * 60
  const formattedMinutes = rtf.formatToParts(Math.floor(minutes),'minute')
  prepareWarTimerElement.innerHTML = rtf.format(Math.floor(hours),'hour') + ' ' + formattedMinutes[1].value + ' ' + formattedMinutes[2].value
  prepareWarTimerTimoutId = setTimeout(prepareWarTimer, 30000)
}
if (document.getElementById('resistance').style.display === '') {
  prepareWarTimer()
}