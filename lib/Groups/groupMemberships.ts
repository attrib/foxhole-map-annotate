import discord from "../discord.js";
import { loadAllGroups, saveAllGroups, updateMemberships } from "./saveGroups.ts";
import type {GroupsFile, Group, UserGroupMembership} from "../lib/Groups/types.ts";
import config from "../config.js";

const MEMBERSHIP_TTL = 60_000; // 1 minute

export async function refreshMembershipsIfNeeded(session) {
  const userId = session.userId;
  const groupsFile = loadAllGroups();

  console.log("Checking if memberships need refresh for user", userId);

  const user = groupsFile.users[userId];
  if (!user) return;

  const now = Date.now();

  const needsRefresh = !user.memberships || Object.values(user.memberships).some(m => now - m.verifiedAt > MEMBERSHIP_TTL);

  //if (!needsRefresh) return;

  await recomputeMemberships(session, groupsFile);
}

async function recomputeMemberships(session, groupsFile) {
  const userId = session.userId;

  const guildRoles = await fetchUserDiscordRoles(session);

  const memberships = {};

  for (const groupOwner of Object.values(groupsFile.users)) {
    for (const group of Object.values(groupOwner.groups)) {
      if (!group.discord_roles) continue;

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

      if (!guildRoles) return;

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

  console.log(groupsFile.users);
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
