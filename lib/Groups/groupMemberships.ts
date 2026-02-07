import discord from "../discord.js";
import {
  getGroupsFile,
  setUserMembershipForGroup,
  saveAllGroups,
  getGroup
} from "./saveGroups.ts";
import type { GroupMembership } from "../lib/Groups/types.ts";
import config from "../config.js";

/* ---------- recompute ---------- */

export async function recomputeMemberships(session, userId) {

  if (!userId) throw new Error("userId is undefined");

  const file = getGroupsFile();
  const guildRoles = await fetchUserDiscordRoles(session);

  for (const group of Object.values(file.groups)) {
    let isMember = false;

    /* ----- individual members ----- */
    if (group.individual_members) {
      isMember = Object.values(group.individual_members)
        .some(m => m.id === userId);
    }

    /* ----- discord roles ----- */
    if (!isMember && group.discord_roles && guildRoles) {
      isMember = Object.values(group.discord_roles).some(roleEntry => {
        const rolesInGuild = guildRoles[roleEntry.server];
        return rolesInGuild?.includes(roleEntry.role);
      });
    }

    const membership: GroupMembership | null = isMember
      ? {
          userId,
          source: "discord",
          discord: {
            guildId: "",
            roleIds: [],
          },
        }
      : null;

    setUserMembershipForGroup(group.id, userId, membership);
  }

  saveAllGroups();
}


export async function recomputeMembershipsForGroup(session, groupId: string) {
  const group = getGroup(groupId);
  if (!group) return;

  const affectedUsers = new Set<string>();

  // individual members
  for (const member of Object.values(group.individual_members ?? {})) {
    if (typeof member.id === "string" && member.id.length > 0) {
      affectedUsers.add(member.id);
    }
  }

  // existing memberships
  for (const m of group.memberships ?? []) {
    if (typeof m.userId === "string" && m.userId.length > 0) {
      affectedUsers.add(m.userId);
    }
  }

  // now recompute each user

  for (const userId of affectedUsers) {
    await recomputeMemberships(session, userId);
  }
}

/* ---------- discord ---------- */

async function fetchUserDiscordRoles(session) {
  const rolesByGuild: Record<string, string[]> = {};

  for (const guildId of Object.keys(config.config.access.discords)) {
    const info = await discord.getGuildInformation(session, guildId);
    if (info?.roles) {
      rolesByGuild[guildId] = info.roles;
    }
  }

  return rolesByGuild;
}