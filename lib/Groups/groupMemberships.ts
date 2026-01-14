import discord from "../discord.js";
import { saveAllGroups, updateMemberships, getGroupsFile } from "./saveGroups.ts";
import type {GroupsFile, Group, UserGroupMembership} from "../lib/Groups/types.ts";
import config from "../config.js";
import { get } from "node:http";

const MEMBERSHIP_TTL = 60000; // 1 minute

export async function refreshMembershipsIfNeeded(session) {
  const userId = session.userId;
  const groupsFile = getGroupsFile();

  if (!userId) return;

  const user = groupsFile.users[userId];

  if (!user) return;

  const now = Date.now();

  //Implement a if needed check based on ttl but also if memberships get deleted

  await recomputeMemberships(session, groupsFile);
}

async function recomputeMemberships(session, groupsFile) {
  const userId = session.userId;
  console.log("Recomputing memberships for user", userId);
  if (!userId) {
    throw new Error("userId is undefined");
  }

  const guildRoles = await fetchUserDiscordRoles(session);

  const memberships = {};

  for (const groupOwner of Object.values(groupsFile.users)) {
    for (const group of Object.values(groupOwner.groups)) {
      for (const userEntry of Object.values(group.individual_members)) {

        if (userId === userEntry.id) {
          console.log("Adding individual membership for group", group.id);
          memberships[group.id] = {
            groupId: group.id,
            source: "discord",
            verifiedAt: Date.now(),
          };
          break;
        }
      }

      if (memberships[group.id]) continue;

      for (const roleEntry of Object.values(group.discord_roles)) {
        const rolesInGuild = guildRoles[roleEntry.server];
        if (!rolesInGuild) continue;

        if (rolesInGuild.includes(roleEntry.role)) {
          memberships[group.id] = {
            groupId: group.id,
            source: "discord",
            verifiedAt: Date.now(),
          };
          break;
        }
      }
    }
  }

  console.log("Old:", groupsFile.users, "Memberships computed:", memberships);
  updateMemberships(userId, memberships);
}

async function fetchUserDiscordRoles(session) {
  const rolesByGuild = {};

  for (const guildId of Object.keys(config.config.access.discords)) {
    const info = await discord.getGuildInformation(session, guildId);
    if (info?.roles) {
      rolesByGuild[guildId] = info.roles;
    }
  }

  return rolesByGuild;
}
