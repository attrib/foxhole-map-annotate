import discord from "../discord.js";
import { getGroupsFile, saveAllGroups } from "./saveGroups.ts";
import type { GroupMembership } from "../lib/Groups/types.ts";
import config from "../config.js";

const MEMBERSHIP_TTL = 60_000; // 1 minute

/* ---------- entry ---------- */

export async function refreshMembershipsIfNeeded(session) {
  const userId = session.userId;
  if (!userId) return;

  const file = getGroupsFile();
  const now = Date.now();

  let needsRefresh = false;

  for (const group of Object.values(file.groups)) {
    const membership = group.memberships?.find(m => m.userId === userId);

    if (!membership) {
      needsRefresh = true;
      break;
    }

    if (now - membership.verifiedAt > MEMBERSHIP_TTL) {
      needsRefresh = true;
      break;
    }
  }

  if (!needsRefresh) return;

  await recomputeMemberships(session, file);
}

/* ---------- recompute ---------- */

async function recomputeMemberships(session, file) {
  const userId = session.userId;
  if (!userId) throw new Error("userId is undefined");

  console.log("Recomputing memberships for user", userId);

  const guildRoles = await fetchUserDiscordRoles(session);
  const now = Date.now();

  for (const group of Object.values(file.groups)) {
    group.memberships ??= [];

    // remove old membership for this user
    group.memberships = group.memberships.filter(m => m.userId !== userId);

    let isMember = false;

    /* ----- individual members ----- */
    if (group.individual_members) {
      for (const member of Object.values(group.individual_members)) {
        if (member.id === userId) {
          isMember = true;
          break;
        }
      }
    }

    /* ----- discord roles ----- */
    if (!isMember && group.discord_roles && guildRoles) {
      for (const roleEntry of Object.values(group.discord_roles)) {
        const rolesInGuild = guildRoles[roleEntry.server];
        if (!rolesInGuild) continue;

        if (rolesInGuild.includes(roleEntry.role)) {
          isMember = true;
          break;
        }
      }
    }

    /* ----- apply membership ----- */
    if (isMember) {
      const membership: GroupMembership = {
        userId,
        source: "discord",
        verifiedAt: now,
        membershipStale: false,
        discord: {
          guildId: "",      // optional: populate if needed
          roleIds: [],
        },
      };

      group.memberships.push(membership);
    }
  }

  saveAllGroups();
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
