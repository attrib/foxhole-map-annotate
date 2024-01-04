import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

import sanitizeHtml from "sanitize-html";
import WebSocket, { WebSocketServer } from "ws";

import {ACL_ACTIONS, ACL_BLOCKED, hasAccess} from "./lib/ACLS.js";
import {
  clearRegions,
  getConquerStatus,
  getConquerStatusVersion,
  getPublicWarFeatures,
  getWarFeatures,
  getWarFeaturesVersion,
  moveObs,
  regenRegions,
  updateMap,
} from "./lib/conquerUpdater.js";
import draftStatus from "./lib/draftStatus.js";
import eventLog from "./lib/eventLog.js";
import {
  defaultFeatures,
  loadFeatures,
  saveFeatures,
} from "./lib/featureLoader.js";
import { sessionParser } from "./lib/session.js";
import warapi from "./lib/warapi.js";
import Discord from "./lib/discord.js";

const wss = new WebSocketServer({ clientTracking: false, noServer: true });
const publicWss = new WebSocketServer({
  clientTracking: false,
  noServer: true,
});
/**
 * Private WebSocket clients
 * @type{Map<string, WebSocket>}
 */
const clients = new Map();

/**
 * Public WebSocket clients
 * @type{Map<string, WebSocket>}
 */
const publicClients = new Map();

/**
 * Login checker timeouts
 * @type{Map<string, NodeJS.Timeout>}
 */
const loginChecker = new Map();

setTimeout(conquerUpdater, 10_000)

const features = loadFeatures()
/** @type{QueueObject} */
let cachedQueue = {
  queues: {},
  ratio: 0.5,
}

if (fs.existsSync(path.resolve('data/queue.json'))) {
  fs.watch(path.resolve('data/queue.json'), (event) => {
    if (event === 'change') {
      setTimeout(() => {
        const content = fs.readFileSync(path.resolve('data/queue.json'), 'utf8')
        try {
          cachedQueue = JSON.parse(content)
          sendDataToAll('queue', cachedQueue)
          sendDataToPublic('queue', cachedQueue)
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
      return;
    }
    const username = request.session.user;
    const userId = request.session.userId;
    let discordId = request.session.discordId ?? null;

    // Casting here because it must be set
    /** @type{import("./lib/ACLS.js").Access} */
    let acl = /** @type{import("./lib/ACLS.js").Access} */ (request.session.acl);

    const wsId = crypto.randomUUID();
    clients.set(wsId, ws);

    // Check if user is allowed to access every hour
    if (!loginChecker.has(userId)) {
      const loginCheckFunction = () => {
        Discord.checkAllowedUser(request.session).then((data) => {
          if (data.access === true && data.userId === userId) {
            acl = data.acl
            discordId = data.discordId
            request.session.acl = acl
            request.session.discordId = discordId ?? undefined;
            request.session.lastLoginCheck = Date.now();
            request.session.save()
            loginChecker.set(userId, setTimeout(loginCheckFunction, 3_600_000))
          }
          else {
            request.session.acl = ACL_BLOCKED
            request.session.save()
            loginChecker.delete(userId)
            ws.send(JSON.stringify({
              type: 'logout',
              data: {}
            }))
            ws.close()
          }
        })
      }
      const lastLoginCheck = request.session.lastLoginCheck;
      if (lastLoginCheck === undefined || Date.now() - lastLoginCheck > 3_600_000) {
        loginCheckFunction()
      } else {
        loginChecker.set(userId, setTimeout(loginCheckFunction, Date.now() - lastLoginCheck))
      }
    }

    ws.send(JSON.stringify(/** @type{PrivateWebSocketOutgoingTraffic<"init">} */ ({
      type: 'init',
      data: {
        acl,
        version: process.env.COMMIT_HASH,
        warStatus: warapi.warData.status,
        featureHash: features.hash,
        discordId,
      }
    })));

    //connection is up, let's add a simple event
    ws.on('message', (message) => {
      const oldHash = features.hash
      const content = /** @type{PrivateWebSocketIncomingTraffic} */ (JSON.parse(message.toString()));
      switch (content.type) {
        case 'init':
          if (content.data.conquerStatus !== getConquerStatusVersion()) {
            sendData(ws, 'conquer', getConquerStatus())
          }
          if (content.data.featureHash !== features.hash) {
            sendFeatures(ws)
          }
          if (content.data.warVersion !== getWarFeaturesVersion()) {
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
          if (warapi.isWarInResistance()) {
            break;
          }
          const feature = content.data;
          if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_ADD, feature)) {
            return;
          }
          feature.id = crypto.randomUUID()
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
          eventLog.logEvent({type: content.type, user: username, userId, data: content.data})
          saveFeatures(features)
          sendUpdateFeature('add', feature, oldHash, features.hash)
          break;

        case 'featureUpdate':
          if (warapi.warData.status === warapi.WAR_RESISTANCE) {
            break;
          }
          let editFeature = null
          for (const existingFeature of features.features) {
            if (content.data.properties.id === existingFeature.properties.id) {
              editFeature = existingFeature
              if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_EDIT, existingFeature)) {
                return;
              }
              existingFeature.properties = content.data.properties
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
              existingFeature.geometry = content.data.geometry
              eventLog.logEvent({type: content.type, user: username, userId, data: content.data})
            }
          }
          saveFeatures(features);
          if (editFeature) {
            sendUpdateFeature('update', editFeature, oldHash, features.hash)
          }
          break;

        case 'featureDelete':
          if (warapi.isWarInResistance()) {
            break;
          }
          const featureToDelete = features.features.find((value) => value.properties.id === content.data.id)
          if (featureToDelete === undefined) {
            return;
          }
          if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_DELETE, featureToDelete)) {
            return;
          }
          features.features = features.features.filter((feature) => {
            if (feature.properties.id === content.data.id) {
              eventLog.logEvent({type: content.type, user: username, userId, data: feature})
            }
            return feature.properties.id !== content.data.id
          })
          saveFeatures(features)
          sendUpdateFeature('delete', featureToDelete, oldHash, features.hash)
          break;

        case 'ping':
          ws.send(JSON.stringify({type: 'pong'}))
          break;

        case 'decayUpdate':
          if (warapi.isWarInResistance()) {
            break;
          }
          if (!hasAccess(userId, acl, ACL_ACTIONS.DECAY_UPDATE)) {
            return;
          }
          for (const feature of features.features) {
            if (feature.properties.id === content.data.id) {
              const newTime = (new Date()).toISOString();
              feature.properties.time = newTime;
              feature.properties.muser = username
              feature.properties.muserId = userId
              eventLog.logEvent({type: content.type, user: username, userId, data: content.data})
              sendDataToAll('decayUpdated', {
                id: feature.properties.id,
                type: feature.properties.type,
                time: newTime,
              })
            }
          }
          saveFeatures(features)
          break;

        case 'flag':
          if (warapi.isWarInResistance()) {
            break;
          }
          let flagged = false;
          for (const feature of features.features) {
            if (feature.properties.id === content.data.id) {
              if (!feature.properties.flags) {
                feature.properties.flags = [userId]
              }
              else if (feature.properties.flags.includes(userId)) {
                feature.properties.flags.splice(feature.properties.flags.indexOf(userId), 1)
              }
              else {
                feature.properties.flags.push(userId)
              }
              eventLog.logEvent({type: content.type, user: username, userId, data: content.data})
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
          if (warapi.isWarInResistance()) {
            break;
          }
          if (!hasAccess(userId, acl, ACL_ACTIONS.UNFLAG)) {
            return;
          }
          for (const feature of features.features) {
            if (feature.properties.id === content.data.id) {
              feature.properties.flags = [];
              eventLog.logEvent({type: content.type, user: username, userId, data: content.data})
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
          if (draftStatus.activeDraft === null) {
            break;
          }
          if (discordId === draftStatus.draftOrder[draftStatus.activeDraft]?.discordId || userId === draftStatus.draftOrder[draftStatus.activeDraft]?.userId || hasAccess(userId, acl, ACL_ACTIONS.CONFIG)) {
            draftStatus.nextDraft(true)
          }
          break;

        case 'draftForceNext':
          if (hasAccess(userId, acl, ACL_ACTIONS.CONFIG)) {
            draftStatus.nextDraft(false)
          }
          break;

        case 'obsMove':
          if (hasAccess(userId, acl, ACL_ACTIONS.MOVE_OBS)) {
            eventLog.logEvent({type: content.type, user: username, userId, data: content.data})
            const oldVersion = getConquerStatusVersion()
            const newData = moveObs(content.data)
            if (newData) {
              sendDataToAll('conquer', Object.assign(newData, { oldVersion, warNumber: warapi.warData.warNumber }))
            }
          }
          break;
      }
    });

    ws.on('close', function () {
      clients.delete(wsId);
      if (loginChecker.has(userId)) {
        clearTimeout(loginChecker.get(userId))
        loginChecker.delete(userId)
      }
    });
  }
);

draftStatus.on("draftUpdate", (data) => {
  sendDataToAll('draftStatus', data)
});

/**
 * Send data to all private clients
 * @template {keyof PrivateOutgoingTypes} T
 * @param {T} type 
 * @param {PrivateOutgoingTypes[T]} data 
 */
function sendDataToAll(type, data) {
  clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      sendData(client, type, data);
    }
  });
}

/**
 * Send data to all public clients
 * @template {keyof PublicOutgoingTypes} T
 * @param {T} type 
 * @param {PublicOutgoingTypes[T]} data 
 */
function sendDataToPublic(type, data) {
  publicClients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      sendData(client, type, data);
    }
  });
}

/**
 * @template {keyof PrivateOutgoingTypes} T
 * @overload
 * @param {WebSocket} client
 * @param {T} type
 * @param {PrivateOutgoingTypes[T]} data
 * @returns {void}
 */

/**
 * @template {keyof PublicOutgoingTypes} T
 * @overload
 * @param {WebSocket} client
 * @param {T} type
 * @param {PublicOutgoingTypes[T]} data
 * @returns {void}
 */

/**
 * Send the provided data to the passed client
 * @param {WebSocket} client
 * @param {string} type
 * @param {unknown} data
 * @returns {void}
 */
function sendData(client, type, data) {
  const json = JSON.stringify({
    type: type,
    data: data
  })
  client.send(json);
}

/**
 * TODO
 * @param {FeatureUpdateAction} operation 
 * @param {import("./lib/featureLoader.js").UserMapFeature} feature 
 * @param {string} oldHash 
 * @param {string} newHash 
 */
function sendUpdateFeature(operation, feature, oldHash, newHash) {
  sendDataToAll('featureUpdate', {
    operation,
    feature,
    oldHash,
    newHash
  })
}

/**
 * Send all the user map features to every private client
 * @returns {void}
 */
function sendFeaturesToAll() {
  sendDataToAll('allFeatures', features)
}

/**
 * Send all the user map features to this private client
 * @param {WebSocket} client 
 */
function sendFeatures(client) {
  sendData(client, 'allFeatures', features)
}

/**
 * Checks the warapi for updates and sends the data to all clients
 * @returns {Promise<void>}
 */
async function conquerUpdater() {
  const oldVersion = getConquerStatusVersion()
  await warapi.warDataUpdate()
    .then(async () => {
      return await updateMap()
    })
    .then((data) => {
      if (data) {
        const payload = Object.assign(data, { oldVersion, warNumber: warapi.warData.warNumber })
        sendDataToAll('conquer', payload)
        sendDataToPublic('conquer', payload)
      }
    })
    .finally(() => {
      setTimeout(conquerUpdater, 25_000)
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

publicWss.on('connection', function (ws, request) {
  const wsId = crypto.randomUUID();
  publicClients.set(wsId, ws);

  ws.send(JSON.stringify(/** @type{PublicWebSocketOutgoingTraffic<"init">} */({
    type: 'init',
    data: {
      version: process.env.COMMIT_HASH,
      warStatus: warapi.warData.status,
      conquerStatus: getConquerStatus(),
      warFeatures: getPublicWarFeatures(),
      queueStatus: cachedQueue,
    }
  })));

  ws.on('message', (message) => {
    const content = /** @type{PublicWebSocketIncomingTraffic} */ (JSON.parse(message.toString()));
    switch (content.type) {
      case 'getConquerStatus':
        sendData(ws, 'conquer', getConquerStatus())
        break;
    }
  });
});

/**
 * Pairs up the WebSocket and HTTP servers.
 * @param {import("node:http").Server} server
 * @returns {void}
 */
export default function startServer (server) {
  server.on('upgrade', function (request, socket, head) {
    if (request.url === undefined) {
      // This should never happen, just narrows the type
      throw new Error("Request URL is undefined");
    }
    const { pathname } = new URL(request.url, request.headers.origin);

    if (pathname === '/stats') {
      publicWss.handleUpgrade(request, socket, head, function (ws) {
        publicWss.emit('connection', ws, request);
      });
      return;
    }
    // @ts-expect-error Unfortunately the type definitions here are difficult to resolve
    sessionParser((request), {}, () => {
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

/**
 * @typedef {import("./lib/warapi.js").HexName} HexName
 */

/**
 * Feature update action
 * @typedef {"add" | "update" | "delete"} FeatureUpdateAction
 */

/**
 * Private feature update message
 * @typedef {object} PrivateFeatureUpdateMessage
 * @property {FeatureUpdateAction} operation
 * @property {import("./lib/featureLoader.js").UserMapFeature} feature
 * @property {string} oldHash
 * @property {string} newHash
 */

/**
 * Queue Entry
 * @typedef {object} QueueEntry
 * @property {number} c
 * @property {number} w
 */

/**
 * Queue Object
 * @typedef {object} QueueObject
 * @property {Partial<Record<HexName, QueueEntry>>} queues
 * @property {number} ratio
 */

/**
 * Conquer WebSocket Object
 * @typedef {import("./lib/conquerUpdater.js").UpdateMapData & { oldVersion: string, warNumber: number }} ConquerWebSocketObject
 */

/**
 * Public Init Object
 * @typedef {object} PublicInit
 * @property {string} version
 * @property {import("./lib/warapi.js").WarEvent} warStatus
 * @property {import("./lib/conquerUpdater.js").ConquerStatus} conquerStatus
 * @property {import("./lib/conquerUpdater.js").WarFeatures} warFeatures
 */

/**
 * @typedef {object} PrivateInit
 * @property {import("./lib/ACLS.js").Access} acl
 * @property {string} version
 * @property {import("./lib/warapi.js").WarEvent} warStatus
 * @property {string} featureHash
 * @property {?string} discordId
 */

/**
 * Private Flagged Message
 * @typedef {object} PrivateFlaggedMessage
 * @property {string} id
 * @property {string} type
 * @property {string[]} flags
 */

/**
 * Private Decay Updated Message
 * @typedef {object} PrivateDecayUpdatedMessage
 * @property {string} id
 * @property {string} type
 * @property {string} time
 */

/**
 * @typedef {object} PrivateIncomingInit
 * @property {string} conquerStatus
 * @property {string} featureHash
 * @property {string} warVersion
 */

/**
 * Public Outgoing Types (helper type to define data payload)
 * @typedef {object} PublicOutgoingTypes
 * @property {PublicInit} init
 * @property {ConquerWebSocketObject} conquer
 * @property {QueueObject} queue
 */

/**
 * Public Incoming Types (helper type to define data payload)
 * @typedef {object} PublicIncomingTypes
 * @property {never} getConquerStatus
 */

/**
 * Public WebSocket Incoming Traffic
 * @template {keyof PublicIncomingTypes} [T = keyof PublicIncomingTypes]
 * @typedef {object} PublicWebSocketIncomingTraffic
 * @property {T} type
 * @property {PublicIncomingTypes[T]} data
 */

/**
 * Public WebSocket Outgoing Traffic
 * @template {keyof PublicOutgoingTypes} [T = keyof PublicOutgoingTypes] 
 * @typedef {object} PublicWebSocketOutgoingTraffic
 * @property {T} type
 * @property {PublicOutgoingTypes[T]} data
 */

/**
 * Private Outgoing Types (helper type to define data payload)
 * @typedef {object} PrivateOutgoingTypes
 * @property {PrivateInit} init
 * @property {import("./lib/conquerUpdater.js").WarFeatureCollection} warFeatures
 * @property {import("./lib/warapi.js").WarStatusData} warChange
 * @property {ConquerWebSocketObject | import("./lib/conquerUpdater.js").ConquerStatus} conquer
 * @property {import("./lib/warapi.js").WarStatusData} warPrepare
 * @property {import("./lib/warapi.js").WarStatusData} warEnded
 * @property {import("./lib/draftStatus.js").DraftData} draftStatus
 * @property {import("./lib/featureLoader.js").UserMapFeatures} allFeatures
 * @property {PrivateFlaggedMessage} flagged
 * @property {PrivateDecayUpdatedMessage} decayUpdated
 * @property {PrivateFeatureUpdateMessage} featureUpdate
 * @property {QueueObject} queue
 */

/**
 * Private Incoming Types (helper type to define data payload)
 * @typedef {object} PrivateIncomingTypes
 * @property {PrivateIncomingInit} init
 * @property {never} getAllFeatures
 * @property {never} getConquerStatus
 * @property {never} getWarFeatures
 * @property {never} getDraftStatus
 * @property {import("./lib/featureLoader.js").UserMapFeature} featureAdd
 * @property {import("./lib/featureLoader.js").UserMapFeature} featureUpdate 
 * @property {import("./lib/featureLoader.js").UserMapFeature} featureDelete
 * @property {import("./lib/featureLoader.js").UserMapFeature} decayUpdate
 * @property {import("./lib/featureLoader.js").UserMapFeature} obsMove
 * @property {import("./lib/featureLoader.js").UserMapFeature} flag
 * @property {import("./lib/featureLoader.js").UserMapFeature} unflag
 * @property {never} draftForceNext
 * @property {never} draftConfirm 
 * @property {never} ping
 */

/**
 * Public WebSocket Incoming Traffic
 * @template [T = keyof PrivateIncomingTypes]
 * @typedef {T extends keyof PrivateIncomingTypes ? { type: T, data: PrivateIncomingTypes[T] } : never} PrivateWebSocketIncomingTraffic
 */

/**
 * Public WebSocket Outgoing Traffic
 * @template {keyof PrivateOutgoingTypes} [T = keyof PrivateOutgoingTypes] 
 * @typedef {object} PrivateWebSocketOutgoingTraffic
 * @property {T} type
 * @property {PrivateOutgoingTypes[T]} data
 */

