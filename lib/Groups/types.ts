export interface GroupsFile {
  users: {
    [userId: string]: {
      groups: Record<string, Group>;
      memberships: Record<string, UserGroupMembership>;
    };
  };
  hash: string;
}

export interface UserGroupMembership {
  groupId: string;
  source: "discord";
  discord: {
    guildId: string;
    roleIds: string[];
  };
  verifiedAt: number;
  membershipStale: boolean;
}

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



