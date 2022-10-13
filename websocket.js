const webSocket = require("ws");
const sessionParser = require("./lib/session");
const wss = new webSocket.Server({clientTracking: false, noServer: true});
const clients = new Map();
const fs = require('fs');
const uuid = require('uuid')

let markers = {};
if (fs.existsSync("./markers.json")) {
  markers = require("./markers.json");
}

wss.on('connection', function (ws, request) {
    if (!request.session.user || !request.session.id) {
      ws.close();
    }
    let username = request.session.user;
    sendMarkers(ws);

    clients.set(request.session.id, ws);

    //connection is up, let's add a simple event
    ws.on('message', (message) => {
      message = JSON.parse(message);
      let id;
      switch (message.type) {
        case 'add':
          id = uuid.v4();
          markers[id] = {
            id: id,
            user: username,
            updated: (new Date()).toISOString(),
            text: message.data.text,
            position: message.data.position,
            type: message.data.type,
          }
          sendMarkersToAll();
          saveMarkers();
          break;

        case 'update':
          id = message.data.id;
          markers[id].user = username;
          markers[id].updated = (new Date()).toISOString();
          markers[id].text = message.data.text;
          markers[id].type = message.data.type;
          sendMarkersToAll();
          saveMarkers();
          break;

        case 'delete':
          delete markers[message.data.id]
          sendMarkersToAll();
          saveMarkers();
          break;
      }
    });

    ws.on('close', function () {
      clients.delete(request.session.id);
    });
  }
);

function sendMarkersToAll() {
  clients.forEach(function each(client) {
    if (client.readyState === webSocket.WebSocket.OPEN) {
      sendMarkers(client);
    }
  });
}

function sendMarkers(client) {
  client.send(JSON.stringify({
    type: 'markers',
    data: Object.values(markers)
  }));
}

function saveMarkers() {
  fs.writeFile('markers.json', JSON.stringify(markers, null, 2), err => {
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