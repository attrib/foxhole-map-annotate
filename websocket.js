const webSocket = require("ws");
const sessionParser = require("./lib/session");
const wss = new webSocket.Server({clientTracking: false, noServer: true});
const clients = new Map();
const fs = require('fs');
const uuid = require('uuid')
const {ACL_FULL, ACL_ICONS_ONLY} = require("./lib/ACLS");
const {trackUpdater, iconUpdater} = require("./lib/updater");
const {getConquerStatus, updateMap, getConquerStatusVersion} = require("./lib/conquerUpdater");

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

wss.on('connection', function (ws, request) {
    if (!request.session.user || !request.session.id) {
      ws.close();
    }
    const username = request.session.user;
    const acl = request.session.acl;
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        acl,
        version: process.env.COMMIT_HASH
      }
    }));
    sendTracks(ws);
    sendIcons(ws);

    clients.set(request.session.id, ws);

    //connection is up, let's add a simple event
    ws.on('message', (message) => {
      message = JSON.parse(message);
      console.log('Received ' + message.type + ' by user ' + username + ' with ' + acl)
      switch (message.type) {
        case 'init':
          if (message.data.conquerStatus !== getConquerStatusVersion()) {
            sendData(ws, 'conquer', getConquerStatus())
          }
          break;

        case 'trackAdd':
          if (acl !== ACL_FULL) {
            break;
          }
          message.data.id = uuid.v4()
          message.data.properties.id = message.data.id
          message.data.properties.user = username
          message.data.properties.time = (new Date()).toISOString()
          tracks.features.push(message.data)
          console.log('add track', tracks.features.length)
          sendTracksToAll();
          saveTracks();
          break;

        case 'trackUpdate':
          if (acl !== ACL_FULL) {
            break;
          }
          for (const existingTracks of tracks.features) {
            if (message.data.properties.id === existingTracks.properties.id) {
              existingTracks.properties = message.data.properties
              existingTracks.properties.user = username
              existingTracks.properties.time = (new Date()).toISOString()
              existingTracks.geometry = message.data.geometry
            }
          }
          sendTracksToAll();
          saveTracks();
          break;

        case 'trackDelete':
          if (acl !== ACL_FULL) {
            break;
          }
          console.log('delete', message.data.id, tracks.features.length)
          tracks.features = tracks.features.filter((feature) => {
            return feature.properties.id !== message.data.id
          })
          console.log('deleted', tracks.features.length)
          sendTracksToAll();
          saveTracks();
          break;

        case 'iconAdd':
          if (acl !== ACL_FULL && acl !== ACL_ICONS_ONLY) {
            break;
          }
          const feature = message.data;
          if (acl === ACL_ICONS_ONLY && feature.properties.type !== 'information') {
            break;
          }
          feature.id = uuid.v4()
          feature.properties.id = feature.id
          feature.properties.user = username
          feature.properties.time = (new Date()).toISOString()
          icons.features.push(feature)
          sendIconsToAll()
          saveIcons()
          break;

        case 'iconUpdate':
          if (acl !== ACL_FULL && acl !== ACL_ICONS_ONLY) {
            break;
          }
          if (message.data.properties.type === 'field') {
            break;
          }
          for (const existingIcon of icons.features) {
            if (message.data.properties.id === existingIcon.properties.id) {
              if (acl === ACL_ICONS_ONLY && existingIcon.properties.type !== 'information') {
                break;
              }
              existingIcon.properties = message.data.properties
              existingIcon.properties.user = username
              existingIcon.properties.time = (new Date()).toISOString()
              existingIcon.geometry = message.data.geometry
            }
          }
          sendIconsToAll();
          saveIcons();
          break;

        case 'iconDelete':
          if (acl !== ACL_FULL && acl !== ACL_ICONS_ONLY) {
            break;
          }
          if (acl === ACL_ICONS_ONLY) {
            const feature = icons.features.find((value) => value.properties.id === message.data.id)
            if (feature && feature.properties.type !== 'information') {
              break;
            }
          }
          console.log('delete', message.data.id, icons.features.length)
          icons.features = icons.features.filter((feature) => {
            return feature.properties.id !== message.data.id
          })
          console.log('deleted', icons.features.length)
          sendIconsToAll();
          saveIcons();
          break;

        case 'ping':
          ws.send(JSON.stringify({type: 'pong'}))
          break;

        case 'decayUpdate':
          if (acl !== ACL_FULL && acl !== ACL_ICONS_ONLY) {
            break;
          }
          let features = message.data.type === 'track' ? tracks : icons
          for (const feature of features.features) {
            if (feature.properties.id === message.data.id) {
              feature.properties.time = (new Date()).toISOString()
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

    ws.on('close', function (code) {
      console.log(`Client ${request.session.user} disconnected with ${code}`)
      clients.delete(request.session.id);
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
  client.send(JSON.stringify({
    type: type,
    data: data
  }));
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
  updateMap().then((data) => {
    if (data) {
      sendDataToAll('conquer', data)
    }
  })
  setTimeout(conquerUpdater, 60000)
}

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