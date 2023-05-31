const webSocket = require("ws");
const sessionParser = require("./lib/session");
const wss = new webSocket.Server({clientTracking: false, noServer: true});
const clients = new Map();
const fs = require('fs');
const uuid = require('uuid')
const {hasAccess, ACL_ACTIONS} = require("./lib/ACLS");
const {getConquerStatus, updateMap, getConquerStatusVersion, regenRegions, clearRegions, getWarFeatures,
  getWarFeaturesVersion
} = require("./lib/conquerUpdater");
const warapi = require('./lib/warapi')
const eventLog = require('./lib/eventLog')
const sanitizeHtml = require("sanitize-html");
const {loadFeatures, saveFeatures, defaultFeatures} = require("./lib/featureLoader");
const draftStatus = require("./lib/draftStatus");

setTimeout(conquerUpdater, 10000)

const features = loadFeatures()
let cachedQueue = {
  queues: {},
  ratio: 0.5,
}

if (fs.existsSync(__dirname + '/data/queue.json')) {
  fs.watch(__dirname + '/data/queue.json', (event) => {
    if (event === 'change') {
      setTimeout(() => {
        const content = fs.readFileSync(__dirname + '/data/queue.json', 'utf8')
        try {
          cachedQueue = JSON.parse(content)
          sendDataToAll('queue', cachedQueue)
        }
        catch (e) {
          console.log('error parsing queue.json', e)
        }
      }, 1000)
    }
  })
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
    const discordId = request.session.discordId;
    const acl = request.session.acl;
    const wsId = uuid.v4();
    clients.set(wsId, ws);

    ws.send(JSON.stringify({
      type: 'init',
      data: {
        acl,
        version: process.env.COMMIT_HASH,
        warStatus: warapi.warData.status,
        featureHash: features.hash,
        discordId,
      }
    }));

    //connection is up, let's add a simple event
    ws.on('message', (message) => {
      const oldHash = features.hash
      message = JSON.parse(message);
      switch (message.type) {
        case 'init':
          if (message.data.conquerStatus !== getConquerStatusVersion()) {
            sendData(ws, 'conquer', getConquerStatus())
          }
          if (message.data.featureHash !== features.hash) {
            sendFeatures(ws)
          }
          if (message.data.warVersion !== getWarFeaturesVersion()) {
            sendData(ws, 'warFeatures', getWarFeatures())
          }
          sendData(ws, 'queue', cachedQueue)
          break;

        case 'getAllFeatures':
          sendFeatures(ws)
          break;

        case 'getConquerStatus':
          sendData(ws, 'conquer', getConquerStatus())
          break;

        case 'getWarFeatures':
          sendData(ws, 'warFeatures', getWarFeatures())
          break;

        case 'featureAdd':
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
          feature.properties.discordId = discordId
          feature.properties.time = (new Date()).toISOString()
          feature.properties.notes = sanitizeHtml(feature.properties.notes, sanitizeOptions)
          if (feature.properties.color) {
            feature.properties.color = sanitizeHtml(feature.properties.color, sanitizeOptionsClan)
          }
          if (feature.properties.clan) {
            feature.properties.clan = sanitizeHtml(feature.properties.clan, sanitizeOptionsClan)
          }
          if (feature.properties.lineType) {
            feature.properties.lineType = sanitizeHtml(feature.properties.lineType, sanitizeOptionsClan)
          }
          features.features.push(feature)
          eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
          saveFeatures(features)
          sendUpdateFeature('add', feature, oldHash, features.hash)
          break;

        case 'featureUpdate':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          let editFeature = null
          for (const existingFeature of features.features) {
            if (message.data.properties.id === existingFeature.properties.id) {
              editFeature = existingFeature
              if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_EDIT, existingFeature)) {
                return;
              }
              existingFeature.properties = message.data.properties
              if (!existingFeature.properties.discordId) {
                existingFeature.properties.discordId = discordId
              }
              existingFeature.properties.muser = username
              existingFeature.properties.muserId = userId
              existingFeature.properties.time = (new Date()).toISOString()
              existingFeature.properties.notes = sanitizeHtml(existingFeature.properties.notes, sanitizeOptions)
              if (existingFeature.properties.color) {
                existingFeature.properties.color = sanitizeHtml(existingFeature.properties.color, sanitizeOptionsClan)
              }
              if (existingFeature.properties.clan) {
                existingFeature.properties.clan = sanitizeHtml(existingFeature.properties.clan, sanitizeOptionsClan)
              }
              if (existingFeature.properties.lineType) {
                existingFeature.properties.lineType = sanitizeHtml(existingFeature.properties.lineType, sanitizeOptionsClan)
              }
              existingFeature.geometry = message.data.geometry
              eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
            }
          }
          saveFeatures(features);
          if (editFeature) {
            sendUpdateFeature('update', editFeature, oldHash, features.hash)
          }
          break;

        case 'featureDelete':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          const featureToDelete = features.features.find((value) => value.properties.id === message.data.id)
          if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_DELETE, featureToDelete)) {
            return;
          }
          features.features = features.features.filter((feature) => {
            if (feature.properties.id === message.data.id) {
              eventLog.logEvent({type: message.type, user: username, userId, data: feature})
            }
            return feature.properties.id !== message.data.id
          })
          saveFeatures(features)
          sendUpdateFeature('delete', featureToDelete, oldHash, features.hash)
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
          saveFeatures(features)
          break;

        case 'flag':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          let flagged = false;
          for (const feature of features.features) {
            if (feature.properties.id === message.data.id) {
              if (!feature.properties.flags) {
                feature.properties.flags = [userId]
              }
              else if (feature.properties.flags.includes(userId)) {
                feature.properties.flags.splice(feature.properties.flags.indexOf(userId), 1)
              }
              else {
                feature.properties.flags.push(userId)
              }
              eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
              flagged = true;
              sendDataToAll('flagged', {
                id: feature.properties.id,
                type: feature.properties.type,
                flags: feature.properties.flags,
              })
            }
          }
          if (flagged) {
            saveFeatures(features)
          }
          break;

        case 'unflag':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          if (!hasAccess(userId, acl, ACL_ACTIONS.UNFLAG)) {
            return;
          }
          for (const feature of features.features) {
            if (feature.properties.id === message.data.id) {
              feature.properties.flags = [];
              eventLog.logEvent({type: message.type, user: username, userId, data: message.data})
              sendDataToAll('flagged', {
                id: feature.properties.id,
                type: feature.properties.type,
                flags: feature.properties.flags,
              })
              saveFeatures(features)
            }
          }
          break;

        case 'getDraftStatus':
          sendData(ws, 'draftStatus', draftStatus.data())
          break;

        case 'draftConfirm':
          if (discordId === draftStatus.draftOrder[draftStatus.activeDraft].discordId || hasAccess(userId, acl, ACL_ACTIONS.CONFIG)) {
            draftStatus.nextDraft()
          }
          break;
      }
    });

    ws.on('close', function () {
      clients.delete(wsId);
    });
  }
);

draftStatus.on((data) => {
  sendDataToAll('draftStatus', data)
});

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

function sendUpdateFeature(operation, feature, oldHash, newHash) {
  sendDataToAll('featureUpdate', {
    operation,
    feature,
    oldHash,
    newHash
  })
}

function sendFeaturesToAll() {
  sendDataToAll('allFeatures', features)
}

function sendFeatures(client) {
  sendData(client, 'allFeatures', features)
}

function conquerUpdater() {
  const oldVersion = getConquerStatusVersion()
  warapi.warDataUpdate()
    .then(() => {
      return updateMap()
    })
    .then((data) => {
      if (data) {
        data.oldVersion = oldVersion
        data.warNumber = warapi.warData.warNumber
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
  if (fs.existsSync('./data/features.json')) {
    fs.cpSync('./data/features.json', oldWarDir + '/features.json')
  }
  if (fs.existsSync('./data/wardata.json')) {
    fs.cpSync('./data/wardata.json', oldWarDir + '/wardata.json')
  }
  if (fs.existsSync('./data/war.json')) {
    fs.cpSync('./data/war.json', oldWarDir + '/war.json')
  }
  // clear data
  const defaultFeatureSet = defaultFeatures()
  features.features = features.features.filter((track) => track.properties.clan === 'World')
  features.features.push(...defaultFeatureSet.features)
  saveFeatures(features)
  clearRegions()
  sendDataToAll('warPrepare', newData)
  sendDataToAll('conquer', getConquerStatus())
  sendFeaturesToAll()
})

warapi.on(warapi.EVENT_WAR_UPDATED, ({newData}) => {
  regenRegions().then(() => {
    sendDataToAll('warChange', newData)
    sendDataToAll('conquer', getConquerStatus())
    sendFeaturesToAll()
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