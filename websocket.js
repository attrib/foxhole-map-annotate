const webSocket = require("ws");
const sessionParser = require("./lib/session");
const wss = new webSocket.Server({clientTracking: false, noServer: true});
const clients = new Map();
const fs = require('fs');
const uuid = require('uuid')
const {hasAccess, ACL_ACTIONS} = require("./lib/ACLS");
const {trackUpdater, iconUpdater} = require("./lib/updater");
const {getConquerStatus, updateMap, getConquerStatusVersion, regenRegions, clearRegions} = require("./lib/conquerUpdater");
const warapi = require('./lib/warapi')
const eventLog = require('./lib/eventLog')
const sanitizeHtml = require("sanitize-html");

setTimeout(conquerUpdater, 10000)

let tracks = {}, icons = {};
const trackFileName = './data/tracks.json';
const iconFileName = './data/icons.json';
if (fs.existsSync(trackFileName)) {
  tracks = require(trackFileName);
  tracks = trackUpdater(tracks)
}
else {
  tracks = {
    type: 'FeatureCollection',
    features: [],
  }
}
if (fs.existsSync(iconFileName)) {
  icons = require(iconFileName);
  icons = iconUpdater(icons)
}
else {
  icons = {
    type: 'FeatureCollection',
    features: [],
  }
}

const sanitizeOptions = {
  allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'p', 'img', 'video', 'source' ],
  allowedAttributes: {
    'a': [ 'href', 'title' ],
    'img': [ 'src', 'alt', 'title', 'width', 'height' ],
    'video': [ 'width', 'height' ],
    'source': [ 'src', 'type' ],
  },
};
const sanitizeOptionsClan = {
  allowedTags: [ ],
  allowedAttributes: { },
};

wss.on('connection', function (ws, request) {
    if (!request.session.user || !request.session.userId) {
      ws.close();
    }
    const username = request.session.user;
    const userId = request.session.userId;
    const acl = request.session.acl;
    const wsId = uuid.v4();
    clients.set(wsId, ws);

    ws.send(JSON.stringify({
      type: 'init',
      data: {
        acl,
        version: process.env.COMMIT_HASH,
        warStatus: warapi.warData.status,
      }
    }));
    sendTracks(ws);
    sendIcons(ws);

    //connection is up, let's add a simple event
    ws.on('message', (message) => {
      message = JSON.parse(message);
      switch (message.type) {
        case 'init':
          if (message.data.conquerStatus !== getConquerStatusVersion()) {
            sendData(ws, 'conquer', getConquerStatus())
          }
          break;

        case 'trackAdd':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          if (!hasAccess(userId, acl, ACL_ACTIONS.TRACK_ADD, message.data)) {
            break;
          }
          message.data.id = uuid.v4()
          message.data.properties.id = message.data.id
          message.data.properties.user = username
          message.data.properties.userId = userId
          message.data.properties.time = (new Date()).toISOString()
          message.data.properties.color = sanitizeHtml(message.data.properties.color, sanitizeOptionsClan)
          message.data.properties.clan = sanitizeHtml(message.data.properties.clan, sanitizeOptionsClan)
          message.data.properties.notes = sanitizeHtml(message.data.properties.notes, sanitizeOptions)
          tracks.features.push(message.data)
          eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
          sendTracksToAll();
          saveTracks();
          break;

        case 'trackUpdate':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          for (const existingTracks of tracks.features) {
            if (message.data.properties.id === existingTracks.properties.id) {
              if (!hasAccess(userId, acl, ACL_ACTIONS.TRACK_EDIT, message.data)) {
                return;
              }
              existingTracks.properties = message.data.properties
              existingTracks.properties.muser = username
              existingTracks.properties.muserId = userId
              existingTracks.properties.time = (new Date()).toISOString()
              existingTracks.properties.color = sanitizeHtml(message.data.properties.color, sanitizeOptionsClan)
              existingTracks.properties.clan = sanitizeHtml(message.data.properties.clan, sanitizeOptionsClan)
              existingTracks.properties.notes = sanitizeHtml(message.data.properties.notes, sanitizeOptions)
              existingTracks.geometry = message.data.geometry
              eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
            }
          }
          sendTracksToAll();
          saveTracks();
          break;

        case 'trackDelete':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          for (const existingTrack of tracks.features) {
            if (message.data.id === existingTrack.properties.id) {
              if (!hasAccess(userId, acl, ACL_ACTIONS.TRACK_DELETE, existingTrack)) {
                return;
              }
            }
          }
          tracks.features = tracks.features.filter((feature) => {
            if (feature.properties.id === message.data.id) {
              eventLog.logEvent({type: message.type, user: username, userId, data: feature})
            }
            return feature.properties.id !== message.data.id
          })
          sendTracksToAll();
          saveTracks();
          break;

        case 'iconAdd':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          const feature = message.data;
          if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_ADD, feature)) {
            return;
          }
          feature.id = uuid.v4()
          feature.properties.id = feature.id
          feature.properties.user = username
          feature.properties.userId = userId
          feature.properties.time = (new Date()).toISOString()
          feature.properties.notes = sanitizeHtml(feature.properties.notes, sanitizeOptions)
          icons.features.push(feature)
          eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
          sendIconsToAll()
          saveIcons()
          break;

        case 'iconUpdate':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          if (message.data.properties.type === 'field') {
            break;
          }
          for (const existingIcon of icons.features) {
            if (message.data.properties.id === existingIcon.properties.id) {
              if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_EDIT, existingIcon)) {
                return;
              }
              existingIcon.properties = message.data.properties
              existingIcon.properties.muser = username
              existingIcon.properties.muserId = userId
              existingIcon.properties.time = (new Date()).toISOString()
              existingIcon.properties.notes = sanitizeHtml(existingIcon.properties.notes, sanitizeOptions)
              existingIcon.geometry = message.data.geometry
              eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
            }
          }
          sendIconsToAll();
          saveIcons();
          break;

        case 'iconDelete':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          const featureIconDelete = icons.features.find((value) => value.properties.id === message.data.id)
          if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_DELETE, featureIconDelete)) {
            return;
          }
          icons.features = icons.features.filter((feature) => {
            if (feature.properties.id === message.data.id) {
              eventLog.logEvent({type: message.type, user: username, userId, data: feature})
            }
            return feature.properties.id !== message.data.id
          })
          sendIconsToAll();
          saveIcons();
          break;

        case 'ping':
          ws.send(JSON.stringify({type: 'pong'}))
          break;

        case 'decayUpdate':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          if (!hasAccess(userId, acl, ACL_ACTIONS.DECAY_UPDATE)) {
            return;
          }
          let features = message.data.type === 'track' ? tracks : icons
          for (const feature of features.features) {
            if (feature.properties.id === message.data.id) {
              feature.properties.time = (new Date()).toISOString()
              feature.properties.muser = username
              feature.properties.muserId = userId
              eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
              sendDataToAll('decayUpdated', {
                id: feature.properties.id,
                type: feature.properties.type,
                time: feature.properties.time,
              })
            }
          }
          break;
      }
    });

    ws.on('close', function () {
      clients.delete(wsId);
    });
  }
);

function sendDataToAll(type, data) {
  clients.forEach(function each(client) {
    if (client.readyState === webSocket.WebSocket.OPEN) {
      sendData(client, type, data);
    }
  });
}

function sendData(client, type, data) {
  const json = JSON.stringify({
    type: type,
    data: data
  })
  client.send(json);
}


function sendTracksToAll() {
  sendDataToAll('tracks', tracks)
}

function sendIconsToAll() {
  sendDataToAll('icons', icons)
}

function sendTracks(client) {
  sendData(client, 'tracks', tracks)
}

function sendIcons(client) {
  sendData(client, 'icons', icons)
}

function saveTracks() {
  fs.writeFile(trackFileName, JSON.stringify(tracks, null, 2), err => {
    if (err) {
      console.error(err);
    }
  });
}

function saveIcons() {
  fs.writeFile(iconFileName, JSON.stringify(icons, null, 2), err => {
    if (err) {
      console.error(err);
    }
  });
}

function conquerUpdater() {
  warapi.warDataUpdate()
    .then(() => {
      return updateMap()
    })
    .then((data) => {
      if (data) {
        sendDataToAll('conquer', data)
      }
    })
    .finally(() => {
      setTimeout(conquerUpdater, 60000)
    })
}

warapi.on(warapi.EVENT_WAR_ENDED, ({newData}) => {
  sendDataToAll('warEnded', newData)
})

warapi.on(warapi.EVENT_WAR_PREPARE, ({oldData, newData}) => {
  const oldWarDir = `./data/war${oldData.warNumber}`
  // backup old data
  if (!fs.existsSync(oldWarDir)) {
    fs.mkdirSync(oldWarDir)
  }
  if (fs.existsSync('./data/conquer.json')) {
    fs.cpSync('./data/conquer.json', oldWarDir + '/conquer.json')
  }
  if (fs.existsSync('./data/icons.json')) {
    fs.cpSync('./data/icons.json', oldWarDir + '/icons.json')
  }
  if (fs.existsSync('./data/tracks.json')) {
    fs.cpSync('./data/tracks.json', oldWarDir + '/tracks.json')
  }
  if (fs.existsSync('./data/wardata.json')) {
    fs.cpSync('./data/wardata.json', oldWarDir + '/wardata.json')
  }
  fs.cpSync('./public/regions.json', oldWarDir + '/regions.json')
  // clear data
  icons.features = []
  tracks.features = tracks.features.filter((track) => track.properties.clan === 'World')
  saveIcons()
  saveTracks()
  clearRegions()
  sendDataToAll('warPrepare', newData)
  sendDataToAll('conquer', getConquerStatus())
  sendTracksToAll()
  sendIconsToAll()
})

warapi.on(warapi.EVENT_WAR_UPDATED, ({newData}) => {
  regenRegions().then(() => {
    sendDataToAll('warChange', newData)
    sendDataToAll('conquer', getConquerStatus())
    sendTracksToAll()
    sendIconsToAll()
  })
})

module.exports = function (server) {
  server.on('upgrade', function (request, socket, head) {
    sessionParser(request, {}, () => {
      if (!request.session.user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, function (ws) {
        wss.emit('connection', ws, request);
      });
    });
  });
}