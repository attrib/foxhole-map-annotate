import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { resolve } from "node:path";
import { URL } from "node:url";

import sanitizeHtml from "sanitize-html";
import WebSocket, { WebSocketServer } from "ws";

import { ACL_ACTIONS, ACL_BLOCKED, hasAccess } from "./lib/ACLS.ts";
import type { Access } from "./lib/ACLS.ts";

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

import type {
  ConquerStatus,
  UpdateMapData,
  WarFeatures,
  WarFeatureCollection,
} from "./lib/conquerUpdater.js";

import draftStatus from "./lib/draftStatus.js";
import type { DraftData } from "./lib/draftStatus.js";

import eventLog from "./lib/eventLog.js";

import {
  defaultFeatures,
  loadFeatures,
  saveFeatures,
} from "./lib/featureLoader.js";

import type {
  UserMapFeature,
  UserMapFeatures,
} from "./lib/featureLoader.js";

import { sessionParser } from "./lib/session.js";

import warapi from "./lib/warapi.js";
import type { HexName, WarEvent, WarStatusData } from "./lib/warapi.js";

import Discord from "./lib/discord.js";

import { getGroupsFile, getUserMemberships } from "./lib/Groups/saveGroups.ts";
import type { Group } from "./lib/Groups/types.ts";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type FeatureUpdateAction = "add" | "update" | "delete";

interface UserGroup {
  id: string;
  name: string;
}

interface SetActiveGroupMessage {
  groupId: string | null;
}

interface QueueEntry {
  c: number;
  w: number;
}

interface QueueObject {
  queues: Partial<Record<HexName, QueueEntry>>;
  ratio: number;
}

type ConquerWebSocketObject = UpdateMapData & {
  oldVersion: string;
  warNumber: number;
};

interface PublicInit {
  version: string | undefined;
  warStatus: WarEvent;
  conquerStatus: ConquerStatus;
  warFeatures: WarFeatures;
  queueStatus?: QueueObject;
}

interface PrivateInit {
  acl: Access;
  version: string | undefined;
  warStatus: WarEvent;
  featureHash: string;
  discordId: string | null;
  userGroups: Group[];
}

interface PrivateFlaggedMessage {
  id: string;
  type: string;
  flags: string[];
}

interface PrivateDecayUpdatedMessage {
  id: string;
  type: string;
  time: string;
  expireDate: string;
  expireTime: number | undefined;
}

interface PrivateFeatureUpdateMessage {
  operation: FeatureUpdateAction;
  feature: UserMapFeature;
  oldHash: string;
  newHash: string;
}

/* ------------------------------------------------------------------ */
/* WebSocket payload maps */
/* ------------------------------------------------------------------ */

interface PublicOutgoingTypes {
  init: PublicInit;
  conquer: ConquerWebSocketObject;
  queue: QueueObject;
}

interface PublicIncomingTypes {
  getConquerStatus: never;
}

interface PrivateOutgoingTypes {
  init: PrivateInit;
  warFeatures: WarFeatureCollection;
  warChange: WarStatusData;
  conquer: ConquerWebSocketObject | ConquerStatus;
  warPrepare: WarStatusData;
  warEnded: WarStatusData;
  draftStatus: DraftData;
  allFeatures: UserMapFeatures;
  flagged: PrivateFlaggedMessage;
  decayUpdated: PrivateDecayUpdatedMessage;
  featureUpdate: PrivateFeatureUpdateMessage;
  queue: QueueObject;
}

interface PrivateIncomingInit {
  conquerStatus: string;
  featureHash: string;
  warVersion: string;
}

interface PrivateIncomingTypes {
  init: PrivateIncomingInit;
  setActiveGroup: SetActiveGroupMessage;
  getAllFeatures: never;
  getWarFeatures: never;
  getConquerStatus: never;
  getDraftStatus: never;
  featureAdd: UserMapFeature;
  featureUpdate: UserMapFeature;
  featureDelete: UserMapFeature;
  decayUpdate: UserMapFeature;
  flag: UserMapFeature;
  unflag: UserMapFeature;
  draftForceNext: never;
  draftConfirm: never;
  ping: never;
}

type PrivateWebSocketIncomingTraffic<T extends keyof PrivateIncomingTypes = keyof PrivateIncomingTypes> =
  { type: T; data: PrivateIncomingTypes[T] };

type PublicWebSocketIncomingTraffic<T extends keyof PublicIncomingTypes = keyof PublicIncomingTypes> =
  { type: T; data: PublicIncomingTypes[T] };

type PrivateWebSocketOutgoingTraffic<T extends keyof PrivateOutgoingTypes> =
  { type: T; data: PrivateOutgoingTypes[T] };

type PublicWebSocketOutgoingTraffic<T extends keyof PublicOutgoingTypes> =
  { type: T; data: PublicOutgoingTypes[T] };

/* ------------------------------------------------------------------ */
/* Server setup */
/* ------------------------------------------------------------------ */

const wss = new WebSocketServer({ clientTracking: false, noServer: true });
const publicWss = new WebSocketServer({ clientTracking: false, noServer: true });

const clients = new Map<string, WebSocket>();
const publicClients = new Map<string, WebSocket>();
const loginChecker = new Map<string, NodeJS.Timeout>();

setTimeout(conquerUpdater, 10_000);

const features = loadFeatures();

let cachedQueue: QueueObject = {
  queues: {},
  ratio: 0.5,
};

/* ------------------------------------------------------------------ */
/* sanitize options + queue watcher */
/* ------------------------------------------------------------------ */


const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ["b", "i", "em", "strong", "a", "p", "img", "video", "source"],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title", "width", "height"],
    video: ["width", "height"],
    source: ["src", "type"],
  },
};

const sanitizeOptionsClan: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

if (fs.existsSync(resolve("data/queue.json"))) {
  fs.watch(resolve("data/queue.json"), event => {
    if (event === "change") {
      setTimeout(() => {
        try {
          cachedQueue = JSON.parse(
            fs.readFileSync(resolve("data/queue.json"), "utf8")
          ) as QueueObject;

          sendDataToAll("queue", cachedQueue);
          sendDataToPublic("queue", cachedQueue);
        } catch (e) {
          console.error("error parsing queue.json", e);
        }
      }, 1000);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Private WebSocket connection handler */
/* ------------------------------------------------------------------ */

wss.on("connection", (ws: WebSocket, request: any) => {
  if (!request.session?.user || !request.session.userId) {
    ws.close();
    return;
  }

  const username: string = request.session.user;
  const userId: string = request.session.userId;
  const groups = getGroupsFile().groups;

  let discordId: string | null = request.session.discordId ?? null;
  let activeGroupId: string | null = null;

  let acl: Access = request.session.acl;

  const wsId = randomUUID();
  clients.set(wsId, ws);

  /* ---------------- login checker ---------------- */

  if (!loginChecker.has(userId)) {
    const loginCheckFunction = () => {
      Discord.checkAllowedUser(request.session).then(data => {
        if (data.access === true && data.userId === userId) {
          acl = data.acl;
          discordId = data.discordId ?? null;

          request.session.acl = acl;
          request.session.discordId = discordId ?? undefined;
          request.session.lastLoginCheck = Date.now();
          request.session.save();

          loginChecker.set(
            userId,
            setTimeout(loginCheckFunction, 3_600_000)
          );
        } else {
          request.session.acl = ACL_BLOCKED;
          request.session.save();

          loginChecker.delete(userId);
          ws.send(JSON.stringify({ type: "logout", data: {} }));
          ws.close();
        }
      });
    };

    const last = request.session.lastLoginCheck;
    if (!last || Date.now() - last > 3_600_000) {
      loginCheckFunction();
    } else {
      loginChecker.set(
        userId,
        setTimeout(loginCheckFunction, 3_600_000 - (Date.now() - last))
      );
    }
  }

  /* ---------------- init message ---------------- */

  ws.send(
    JSON.stringify({
      type: "init",
      data: {
        acl,
        version: process.env.COMMIT_HASH,
        warStatus: warapi.warData.status,
        featureHash: features.hash,
        discordId,
        userGroups: getUserMemberships(userId),
      },
    } as PrivateWebSocketOutgoingTraffic<"init">)
  );

  /* ---------------- message handler ---------------- */

  ws.on("message", message => {
    const content = JSON.parse(
      message.toString()
    ) as PrivateWebSocketIncomingTraffic;

    const oldHash = features.hash;
    const userGroups = getUserMemberships(userId).map(g => g.id);

    switch (content.type) {
      case "init": {
        const { conquerStatus, featureHash, warVersion } = content.data;

        if (conquerStatus !== getConquerStatusVersion()) {
          sendData(ws, "conquer", getConquerStatus());
        }

        if (featureHash !== features.hash) {
          sendFeatures(ws);
        }

        if (warVersion !== getWarFeaturesVersion()) {
          sendData(ws, "warFeatures", getWarFeatures());
        }

        sendData(ws, "queue", cachedQueue);
        break;
      }

      case "getAllFeatures":
        sendFeatures(ws);
        break;

      case "getConquerStatus":
        sendData(ws, "conquer", getConquerStatus());
        break;

      case "getWarFeatures":
        sendData(ws, "warFeatures", getWarFeatures());
        break;

      case "getDraftStatus":
        sendData(ws, "draftStatus", draftStatus.data());
        break;


      case "setActiveGroup": {
        const { groupId } = content.data;
        if (
          groupId === null ||
          groups[groupId]?.memberships?.some(m => m.userId === userId)
        ) {
          activeGroupId = groupId;
        }
        break;
      }

      case "featureAdd": {
        if (warapi.isWarInResistance()) break;
        const feature = content.data;

        if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_ADD, feature)) return;

        feature.id = randomUUID();
        feature.properties.id = feature.id;
        feature.properties.user = username;
        feature.properties.userId = userId;
        feature.properties.discordId = discordId;
        feature.properties.groupId = activeGroupId ?? undefined;
        feature.properties.displayName = groups[activeGroupId]?.name ?? username;
        feature.properties.time = new Date().toISOString();
        feature.properties.notes = sanitizeHtml(feature.properties.notes, sanitizeOptions);
        if (feature.properties.color) {
          feature.properties.color = sanitizeHtml(feature.properties.color, sanitizeOptionsClan)
        }
        if (feature.properties.clan) {
          feature.properties.clan = sanitizeHtml(feature.properties.clan, sanitizeOptionsClan)
        }
        if (feature.properties.lineType) {
          feature.properties.lineType = sanitizeHtml(feature.properties.lineType, sanitizeOptionsClan)
        }

        features.features.push(feature);
        eventLog.logEvent({
          type: content.type,
          user: username,
          userId,
          data: feature,
        });

        saveFeatures(features);
        sendUpdateFeature("add", feature, oldHash, features.hash);
        break;
      }

      case "featureUpdate": {
        if (warapi.isWarInResistance()) break;

        let edited: UserMapFeature | null = null;

        for (const existing of features.features) {
          if (existing.properties.id === content.data.properties.id) {
            if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_EDIT, existing, userGroups)) return;

            existing.properties = content.data.properties;
            existing.geometry = content.data.geometry;

            if (!existing.properties.discordId) {
              existing.properties.discordId = discordId;
            }

            existing.properties.muser = username;
            existing.properties.muserId = userId;
            existing.properties.time = new Date().toISOString();
            existing.properties.notes = sanitizeHtml(
              existing.properties.notes,
              sanitizeOptions
            );

            if (existing.properties.color) {
              existing.properties.color = sanitizeHtml(
                existing.properties.color,
                sanitizeOptionsClan
              );
            }

            if (existing.properties.clan) {
              existing.properties.clan = sanitizeHtml(
                existing.properties.clan,
                sanitizeOptionsClan
              );
            }

            if (existing.properties.lineType) {
              existing.properties.lineType = sanitizeHtml(
                existing.properties.lineType,
                sanitizeOptionsClan
              );
            }

            eventLog.logEvent({
              type: content.type,
              user: username,
              userId,
              data: content.data,
            });

            edited = existing;
            break;
          }
        }

        saveFeatures(features);

        if (edited) {
          sendUpdateFeature("update", edited, oldHash, features.hash);
        }

        break;
      }

      case "featureDelete": {
        if (warapi.isWarInResistance()) break;

        const feature = features.features.find(
          f => f.properties.id === content.data.id
        );

        if (!feature) return;
        if (!hasAccess(userId, acl, ACL_ACTIONS.ICON_DELETE, feature, userGroups)) return;

        features.features = features.features.filter(f => {
          if (f.properties.id === content.data.id) {
            eventLog.logEvent({
              type: content.type,
              user: username,
              userId,
              data: f,
            });
          }
          return f.properties.id !== content.data.id;
        });

        saveFeatures(features);
        sendUpdateFeature("delete", feature, oldHash, features.hash);
        break;
      }

      case "decayUpdate": {
        if (warapi.isWarInResistance()) break;
        if (!hasAccess(userId, acl, ACL_ACTIONS.DECAY_UPDATE)) return;

        for (const feature of features.features) {
          if (feature.properties.id === content.data.id) {
            const time = new Date().toISOString();
            const newExpireDate = new Date(new Date().getTime() + (feature.properties.expireTime || -(new Date().getTime() + 1))).toISOString()
            feature.properties.expireDate = newExpireDate
            feature.properties.time = time;
            feature.properties.muser = username;
            feature.properties.muserId = userId;

            eventLog.logEvent({
              type: content.type,
              user: username,
              userId,
              data: content.data,
            });

            sendDataToAll("decayUpdated", {
              id: feature.properties.id,
              type: feature.properties.type,
              time,
              expireDate: newExpireDate,
              expireTime: feature.properties.expireTime,
            });
          }
        }

        saveFeatures(features);
        break;
      }

      case "flag": {
        if (warapi.isWarInResistance()) break;

        let changed = false;

        for (const feature of features.features) {
          if (feature.properties.id === content.data.id) {
            feature.properties.flags ??= [];

            if (feature.properties.flags.includes(userId)) {
              feature.properties.flags = feature.properties.flags.filter(f => f !== userId);
            } else {
              feature.properties.flags.push(userId);
            }

            eventLog.logEvent({
              type: content.type,
              user: username,
              userId,
              data: content.data,
            });

            sendDataToAll("flagged", {
              id: feature.properties.id,
              type: feature.properties.type,
              flags: feature.properties.flags,
            });

            changed = true;
          }
        }

        if (changed) saveFeatures(features);
        break;
      }

      case "unflag": {
        if (warapi.isWarInResistance()) break;
        if (!hasAccess(userId, acl, ACL_ACTIONS.UNFLAG)) return;

        for (const feature of features.features) {
          if (feature.properties.id === content.data.id) {
            feature.properties.flags = [];

            eventLog.logEvent({
              type: content.type,
              user: username,
              userId,
              data: content.data,
            });

            sendDataToAll("flagged", {
              id: feature.properties.id,
              type: feature.properties.type,
              flags: [],
            });

            saveFeatures(features);
          }
        }
        break;
      }

      case "obsMove": {
        if (!hasAccess(userId, acl, ACL_ACTIONS.MOVE_OBS)) return;

        eventLog.logEvent({
          type: content.type,
          user: username,
          userId,
          data: content.data,
        });

        const oldVersion = getConquerStatusVersion();
        const updated = moveObs(content.data);

        if (updated) {
          sendDataToAll("conquer", {
            ...updated,
            oldVersion,
            warNumber: warapi.warData.warNumber,
          });
        }

        break;
      }


      case "draftConfirm":
        if (
          draftStatus.activeDraft !== null &&
          (
            discordId === draftStatus.draftOrder[draftStatus.activeDraft]?.discordId ||
            userId === draftStatus.draftOrder[draftStatus.activeDraft]?.userId ||
            hasAccess(userId, acl, ACL_ACTIONS.CONFIG)
          )
        ) {
          draftStatus.nextDraft(true);
        }
        break;

      case "draftForceNext":
        if (hasAccess(userId, acl, ACL_ACTIONS.CONFIG)) {
          draftStatus.nextDraft(false);
        }
        break;


      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;

    }
  });

  

  ws.on("close", () => {
    clients.delete(wsId);
    const timeout = loginChecker.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      loginChecker.delete(userId);
    }
  });
});

draftStatus.on("draftUpdate", (data: DraftData) => {
  sendDataToAll("draftStatus", data);
});


/* ------------------------------------------------------------------ */
/* Public WebSocket handler */
/* ------------------------------------------------------------------ */

publicWss.on("connection", (ws: WebSocket, request: any) => {
  const wsId = randomUUID();
  publicClients.set(wsId, ws);

  ws.send(
    JSON.stringify({
      type: "init",
      data: {
        version: process.env.COMMIT_HASH,
        warStatus: warapi.warData.status,
        conquerStatus: getConquerStatus(),
        warFeatures: getPublicWarFeatures(),
        queueStatus: cachedQueue,
      },
    } as PublicWebSocketOutgoingTraffic<"init">)
  );

  ws.on("message", message => {
    const content = JSON.parse(
      message.toString()
    ) as PublicWebSocketIncomingTraffic;

    if (content.type === "getConquerStatus") {
      sendData(ws, "conquer", getConquerStatus());
    }
  });
});


/* ------------------------------------------------------------------ */
/* Utility send helpers */
/* ------------------------------------------------------------------ */

function sendData<T extends keyof PrivateOutgoingTypes>(
  client: WebSocket,
  type: T,
  data: PrivateOutgoingTypes[T]
): void;

function sendData<T extends keyof PublicOutgoingTypes>(
  client: WebSocket,
  type: T,
  data: PublicOutgoingTypes[T]
): void;

function sendData(
  client: WebSocket,
  type: string,
  data: unknown
): void {
  client.send(JSON.stringify({ type, data }));
}


function sendDataToAll<T extends keyof PrivateOutgoingTypes>(
  type: T,
  data: PrivateOutgoingTypes[T]
): void {
  clients.forEach(c => c.readyState === WebSocket.OPEN && sendData(c, type, data));
}

function sendDataToPublic<T extends keyof PublicOutgoingTypes>(
  type: T,
  data: PublicOutgoingTypes[T]
): void {
  publicClients.forEach(c => c.readyState === WebSocket.OPEN && sendData(c, type, data));
}

/* ------------------------------------------------------------------ */
/* Feature updates */
/* ------------------------------------------------------------------ */

function sendUpdateFeature(
  operation: FeatureUpdateAction,
  feature: UserMapFeature,
  oldHash: string,
  newHash: string
): void {
  sendDataToAll("featureUpdate", { operation, feature, oldHash, newHash });
}

function sendFeatures(client: WebSocket): void {
  sendData(client, "allFeatures", features);
}

function sendFeaturesToAll(): void {
  sendDataToAll("allFeatures", features);
}

/* ------------------------------------------------------------------ */
/* War updater */
/* ------------------------------------------------------------------ */

function checkExpiredFeatures() {
  const now = Date.now();

  for (const featureToCheck of features.features) {

    const expireDate = new Date(featureToCheck.properties?.expireDate || -1).getTime();

    if (expireDate >= now || expireDate <= 0 ) {
      continue
    }

    if (expireDate < now) {
      features.features = features.features.filter((feature) => {
        return feature.properties.id !== featureToCheck.properties.id
      })
      const oldHash = features.hash
      sendUpdateFeature('delete', featureToCheck, oldHash, features.hash)
      saveFeatures(features)
    }
  }
}

async function conquerUpdater(): Promise<void> {
  const oldVersion = getConquerStatusVersion();

  await warapi.warDataUpdate()
    .then(updateMap)
    .then(data => {
      checkExpiredFeatures()
      if (data) {
        const payload: ConquerWebSocketObject = {
          ...data,
          oldVersion,
          warNumber: warapi.warData.warNumber,
        };
        sendDataToAll("conquer", payload);
        sendDataToPublic("conquer", payload);
      }
    })
    .finally(() => {
      setTimeout(conquerUpdater, 25_000);
    });
}

/* ------------------------------------------------------------------ */
/* WarAPI even hooks */
/* ------------------------------------------------------------------ */

warapi.on(warapi.EVENT_WAR_ENDED, ({ newData }) => {
  sendDataToAll("warEnded", newData);
});

warapi.on(warapi.EVENT_WAR_PREPARE, ({ oldData, newData }) => {
  const oldWarDir = `./data/war${oldData.warNumber}`;

  if (!fs.existsSync(oldWarDir)) fs.mkdirSync(oldWarDir);

  for (const file of ["conquer", "features", "wardata", "war"]) {
    const src = `./data/${file}.json`;
    if (fs.existsSync(src)) {
      fs.cpSync(src, `${oldWarDir}/${file}.json`);
    }
  }

  const defaults = defaultFeatures();
  features.features = features.features.filter(
    f => f.properties.clan === "World"
  );
  features.features.push(...defaults.features);

  saveFeatures(features);
  clearRegions();

  sendDataToAll("warPrepare", newData);
  sendDataToAll("conquer", getConquerStatus());
  sendFeaturesToAll();
});

warapi.on(warapi.EVENT_WAR_UPDATED, ({ newData }) => {
  regenRegions().then(() => {
    sendDataToAll("warChange", newData);
    sendDataToAll("conquer", getConquerStatus());
    sendFeaturesToAll();
  });
});


/* ------------------------------------------------------------------ */
/* Export */
/* ------------------------------------------------------------------ */

export default function startServer(server: import("node:http").Server): void {
  server.on("upgrade", (request, socket, head) => {
    if (!request.url) throw new Error("Request URL is undefined");

    const { pathname } = new URL(request.url, request.headers.origin);

    if (pathname === "/stats") {
      publicWss.handleUpgrade(request, socket, head, ws =>
        publicWss.emit("connection", ws, request)
      );
      return;
    }

    // @ts-expect-error express-session typing mismatch
    sessionParser(request, {}, () => {
      if (!request.session?.user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, ws =>
        wss.emit("connection", ws, request)
      );
    });
  });
}
