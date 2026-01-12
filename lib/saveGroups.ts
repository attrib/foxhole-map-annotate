import fs from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";



export interface Group {
  id: string;
  name: string;

  individual_members?: Record<
    string,
    {
      id: string;
      username?: string;
    }
  >;

  discord_roles?: Record<
    string,
    {
      role: string;
      server: string;
      info?: string;
    }
  >;

  permissions?: Record<string, boolean>;
}

export interface UserGroups {
  groups: Record<string, Group>;
}

export interface GroupsFile {
  users: {
    [userId: string]: {
      groups: Record<string, UserGroups>;
    };
  };
  hash: string;
}

const GROUPS_FILE_PATH = resolve("data/groups.json");

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

export function loadAllGroups(): GroupsFile {
  ensureFile();
  return JSON.parse(fs.readFileSync(GROUPS_PATH, "utf-8"));
}

export function saveAllGroups(data: GroupsFile): void {
  data.hash = createHash("sha1")
    .update(JSON.stringify(data.users))
    .digest("hex");

  fs.writeFileSync(
    GROUPS_PATH,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

export function getUserGroups(userId: string): UserGroups {
  const file = loadAllGroups();

  if (!file.users[userId]) {
    file.users[userId] = { groups: {} };
    saveAllGroups(file);
  }

  return file.users[userId];
}

export function saveGroups(data: GroupsFile): void {
  const allGroups = loadAllGroups();
  data.hash = createHash("sha1")
    .update(JSON.stringify(data.users))
    .digest("hex");

  fs.writeFileSync(
    GROUPS_FILE_PATH,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

export function addGroup(userId: string, group: Omit<Group, "id">): UserGroups {
  const file = loadAllGroups();

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

  saveAllGroups(file);
  return file.users[userId];
}



export function updateGroup(userId: string, groupId: string, updates: Partial<Group>): UserGroups {
  const file = loadAllGroups();
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

  saveAllGroups(file);
  return user;
}



export function deleteGroup(userId: string, groupId: string): UserGroups {
  const file = loadAllGroups();
  const user = file.users[userId];

  if (!user || !user.groups[groupId]) {
    throw new Error(`Group ${groupId} does not exist`);
  }

  delete user.groups[groupId];

  saveAllGroups(file);
  return user;
}


