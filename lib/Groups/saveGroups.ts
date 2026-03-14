import fs from "node:fs";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import type {
  GroupsFile,
  Group,
  GroupMembership,
} from "../lib/Groups/types.ts";
import { recomputeMembershipsForGroup } from "./groupMemberships.ts";
import { delayedSave } from "./../fileHandler.ts";

const GROUPS_PATH = resolve("data/groups.json");

/* ---------- file bootstrap ---------- */

function ensureFile(): void {
  if (!fs.existsSync(GROUPS_PATH)) {
    const initial: GroupsFile = {
      groups: {},
      hash: "",
    };
    fs.writeFileSync(GROUPS_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

/* ---------- load ---------- */

export function loadAllGroups(): GroupsFile {
  ensureFile();
  return JSON.parse(fs.readFileSync(GROUPS_PATH, "utf-8"));
}

const file: GroupsFile = loadAllGroups();


/* ---------- save ---------- */

export function saveAllGroups(): void {
  file.hash = createHash("sha1")
    .update(JSON.stringify(file.groups))
    .digest("hex");

  delayedSave(GROUPS_PATH, file);
}

/* ---------- getters ---------- */

export function getGroupsFile(): GroupsFile {
  return file;
}

export function getUsersGroups(userId: string): GroupsFile {
  const userGroups: GroupsFile = file.groups
    ? {
        groups: Object.fromEntries(
          Object.entries(file.groups).filter(([_, group]) => group.creator === userId)
        ),
        hash: file.hash,
      }
    : {
        groups: {},
        hash: "",
      };
  return userGroups;
}

export function getGroup(groupId: string): Group | undefined {
  return file.groups[groupId];
}

export function getUserMemberships(userId: string): Group[] {
  return Object.values(file.groups).filter(
    (group): group is Group =>
      group.memberships?.some(m => m.userId === userId) ?? false
  );
}

/* ---------- group mutation ---------- */

export function addGroup(
  creator: string,
  group: Omit<Group, "id" | "creator">
): Group {
  if (!creator) throw new Error("creator is undefined");

  const id = randomUUID();

  file.groups[id] = {
    id,
    name: group.name,
    creator,
    individual_members: group.individual_members ?? {},
    discord_roles: group.discord_roles ?? [],
    memberships: [{"userId": creator, "source": "creator"}],
    permissions: group.permissions ?? {},
  };

  saveAllGroups();
  return getUsersGroups(creator);
}

export async function updateGroup(
  session,
  groupId: string,
  updates: Partial<Group>
): Promise<Group> {
  const group = file.groups[groupId];
  const userId = session?.userId;
  if (!group) throw new Error(`Group ${groupId} does not exist`);

  if (group.creator !== userId) {
    throw new Error("Forbidden");
  }

  file.groups[groupId] = {
    ...group,
    ...updates,
    id: groupId,
    creator: group.creator,
  };

  saveAllGroups();

  await recomputeMembershipsForGroup(session, groupId);

  return getUsersGroups(userId);
}

export function deleteGroup(userId: string, groupId: string): void {
  if (!file.groups[groupId]) {
    throw new Error(`Group ${groupId} does not exist`);
  }

  if (file.groups[groupId].creator !== userId) {
    throw new Error("Forbidden");
  }

  delete file.groups[groupId];
  saveAllGroups();
  return getUsersGroups(userId);
}

/* ---------- memberships ---------- */

export function setUserMembershipForGroup(
  groupId: string,
  userId: string,
  membership: GroupMembership | null
): void {
  const group = file.groups[groupId];
  if (!group) return;

  group.memberships = (group.memberships ?? []).filter(
    m => m.userId !== userId
  );

  if (!group.memberships.some(m => m.userId === group.creator)) {
    group.memberships.push({
      userId: group.creator,
      source: "creator",
    });
  }

  if (membership && membership.userId !== group.creator) {
    group.memberships.push(membership);
  }
  saveAllGroups();
}



export function clearGroupMemberships(groupId: string): void {
  const group = file.groups[groupId];
  if (!group) throw new Error(`Group ${groupId} does not exist`);

  group.memberships = [];
  saveAllGroups();
}
