import fs from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type {GroupsFile, Group, UserGroupMembership} from "../lib/Groups/types.ts";
import { get } from "node:http";

const GROUPS_PATH = resolve("data/groups.json");

function ensureFile(): void {
  if (!fs.existsSync(GROUPS_PATH)) {
    fs.writeFileSync(
      GROUPS_PATH,
      JSON.stringify({ users: {}, hash: "" }, null, 2),
      "utf-8"
    );
  }
}

//Just delayedSave but duplicated in file to update data during the timer
const timers: Record<string, NodeJS.Timeout> = {};

function throttledSave(filePath: string, delay = 5000, formatted = true): void {

  if (timers[filePath]) {
    return;
  }

  timers[filePath] = setTimeout(() => {
    try {
      fs.writeFileSync(
        filePath,
        formatted ? JSON.stringify(file, null, 2) : JSON.stringify(file),
        "utf-8"
      );
    } finally {
      delete timers[filePath];
    }
  }, delay);

}


export function loadAllGroups(): GroupsFile {
  ensureFile();
  return JSON.parse(fs.readFileSync(GROUPS_PATH, "utf-8"));
}

const file = loadAllGroups();

// Refreshes the in-memory file object in case of bad data. Fix groups.json manually to clear it with this.
export function reloadGroupsFile(): GroupsFile {
  const fresh = JSON.parse(fs.readFileSync(GROUPS_PATH, "utf-8")) as GroupsFile;

  
  Object.keys(file).forEach(key => delete file[key]); 
  Object.assign(file, fresh); 

  return file;
}
//reloadGroupsFile();

export function saveAllGroups(): void {
  file.hash = createHash("sha1")
  .update(JSON.stringify(file.users))
  .digest("hex");

  throttledSave(GROUPS_PATH);

}

export function getUserGroups(userId: string): UserGroups {

  if (!file.users[userId]) {
    file.users[userId] = { groups: {} };
    saveAllGroups();
  }

  return file.users[userId];
}

export function addGroup(userId: string, group: Omit<Group, "id">): UserGroups {

  if (!userId) {
    throw new Error("userId is undefined");
  }


  if (!file.users[userId]) {
    file.users[userId] = { groups: {} };
  }

  const id = randomUUID();

  file.users[userId].groups[id] = {
    id,
    name: group.name,
    individual_members: {},
    discord_roles: {},
  };

  saveAllGroups();
  return file.users[userId];
}

export function updateMemberships(userId: string, newMemberships: Record<string, UserGroupMembership>): GroupsFile {

  if (!userId) {
    throw new Error("userId is undefined");
  }
  const user = file.users[userId];

  if (!user) {
    throw new Error(`User ${userId} does not exist`);
  }

  user.memberships = newMemberships;
  saveAllGroups();
  return file;
};

export function updateGroup(userId: string, groupId: string, updates: Partial<Group>): GroupsFile {

  if (!userId) {
    throw new Error("userId is undefined");
  }

  const user = file.users[userId];

  if (!user || !user.groups[groupId]) {
    throw new Error(`Group ${groupId} does not exist`);
  }

  const group = user.groups[groupId];

  user.groups[groupId] = {
    ...group,
    ...updates,
    id: groupId,
  };

  saveAllGroups();
  return user;
}

export function deleteGroup(userId: string, groupId: string): UserGroups {

  if (!userId) {
    throw new Error("userId is undefined");
  }

  const user = file.users[userId];

  if (!user || !user.groups[groupId]) {
    throw new Error(`Group ${groupId} does not exist`);
  }

  delete user.groups[groupId];

  saveAllGroups();
  return user;
}

export function getGroupsFile(): GroupsFile {
  return file;
}


