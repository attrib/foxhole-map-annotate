const webSocket = require("ws");
const sessionParser = require("./lib/session");
const wss = new webSocket.Server({clientTracking: false, noServer: true});
const clients = new Map();
const fs = require('fs');
const uuid = require('uuid')

let tracks = {};
const trackFileName = './data/tracks.json';
if (fs.existsSync(trackFileName)) {
  tracks = require('./data/tracks.json');
}
else {
  tracks = {
    type: 'FeatureCollection',
    features: [],
  }
}

wss.on('connection', function (ws, request) {
    if (!request.session.user || !request.session.id) {
      ws.close();
    }
    let username = request.session.user;
    sendTracks(ws);

    clients.set(request.session.id, ws);

    //connection is up, let's add a simple event
    ws.on('message', (message) => {
      message = JSON.parse(message);
      switch (message.type) {
        case 'trackAdd':
          for (const feature of message.data.features) {
            feature.properties.id = uuid.v4()
            feature.properties.user = username
            feature.properties.time = (new Date()).toISOString()
            tracks.features.push(feature)
          }
          sendTracksToAll();
          saveTracks();
          break;

        case 'trackUpdate':
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
          tracks.features = tracks.features.filter((feature) => {
            return feature.properties.id !== message.data.id
          })
          sendTracksToAll();
          saveTracks();
          break;

        case 'ping':
          ws.send(JSON.stringify({type: 'pong'}))
          break;
      }
    });

    ws.on('close', function () {
      clients.delete(request.session.id);
    });
  }
);

function sendTracksToAll() {
  clients.forEach(function each(client) {
    if (client.readyState === webSocket.WebSocket.OPEN) {
      sendTracks(client);
    }
  });
}

function sendTracks(client) {
  client.send(JSON.stringify({
    type: 'tracks',
    data: tracks
  }));
}

function saveTracks() {
  fs.writeFile(trackFileName, JSON.stringify(tracks, null, 2), err => {
    if (err) {
      console.error(err);
    }
  });
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