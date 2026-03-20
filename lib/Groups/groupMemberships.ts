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
    let hasGuildId = false;
    let hasRoleIds = false;

    /* ----- individual members ----- */
    if (group.individual_members) {
      isMember = Object.values(group.individual_members)
        .some(m => m.id === userId);
    }

    /* ----- discord roles ----- */
    if (!isMember && group.discord_roles && guildRoles) {
      isMember = Object.values(group.discord_roles).some(roleEntry => {
        const rolesInGuild = guildRoles[roleEntry.server];
        hasGuildId = roleEntry.server;
        hasRoleIds = rolesInGuild;
        return rolesInGuild?.includes(roleEntry.role);
      });
    }

    const membership: GroupMembership | null = isMember
      ? {
          userId,
          source: "discord",
          discord: {
            guildId: hasGuildId,
            roleIds: hasRoleIds,
          },
        }
      : null;

    setUserMembershipForGroup(group.id, userId, membership);
  }

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

  const file = getGroupsFile();

  const guilds = file.groups ? Object.values(file.groups).flatMap(g => g.discord_roles ? Object.values(g.discord_roles).map(r => r.server) : []) : [];
  const uniqueGuilds = Array.from(new Set(guilds));

  for (const guildId of uniqueGuilds) {
    const info = await discord.getGuildInformation(session, guildId);
    if (info?.roles) {
      rolesByGuild[guildId] = info.roles;
    }
  }
 
  return rolesByGuild;
}