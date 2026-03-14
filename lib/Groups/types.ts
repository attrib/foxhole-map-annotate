export interface GroupsFile {
  groups: Record<string, Group>;
  hash: string;
}

export interface Group {
  id: string;
  name: string;
  creator: string;

  individual_members?: Record<
    string,
    {
      id: string;
      username?: string;
    }
  >;

  discord_roles?: Record<string, DiscordRole>;

  memberships?: Record<string, GroupMembership>[];

  permissions?: Record<string, boolean>;
}

export interface DiscordRole {
  role: string;
  server: string;
  info?: string;
}

export interface GroupMembership {
  userId: string;
  source: "discord" | "manual";

  verifiedAt: number; // Date.now() ms
  membershipStale: boolean;

  discord?: {
    guildId: string;
    roleIds: string[];
  };
}

