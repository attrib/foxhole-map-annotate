import { getUserMemberships } from "./Groups/saveGroups.ts";

export const ACL_ADMIN = "admin" as const;
export const ACL_MOD = "moderator" as const;
export const ACL_FULL = "full" as const;
export const ACL_ICONS_ONLY = "icons" as const;
export const ACL_READ = "read" as const;
export const ACL_BLOCKED = "blocked" as const;

export type Access =
  | typeof ACL_ADMIN
  | typeof ACL_MOD
  | typeof ACL_FULL
  | typeof ACL_ICONS_ONLY
  | typeof ACL_READ
  | typeof ACL_BLOCKED;

export const ACL_ACTIONS = Object.freeze({
  CONFIG: 'config',
  EVENT_LOG: 'event.log',
  ICON_ADD: 'icon.add',
  ICON_EDIT: 'icon.edit',
  ICON_DELETE: 'icon.delete',
  DECAY_UPDATE: 'decay.update',
  READ: 'read',
  UNFLAG: 'unflag',
  MOVE_OBS: 'obs.move',
} as const);

export type Action = typeof ACL_ACTIONS[keyof typeof ACL_ACTIONS];

export const ACL_ORDER = Object.freeze({
  [ACL_BLOCKED]: -10,
  [ACL_ADMIN]: 0,
  [ACL_MOD]: 10,
  [ACL_FULL]: 20,
  [ACL_ICONS_ONLY]: 50,
  [ACL_READ]: 100
});

export interface UserMapFeature {
  type: 'Feature';
  properties?: {
    userId?: string;
    groupId?: string;
    type?: string;
    [key: string]: unknown;
  };
  geometry?: unknown;
}

export function hasAccess(
  userId: string,
  userAcl: Access,
  action: Action,
  feature: UserMapFeature | null = null,
  userGroups: string[] = []
): boolean  {
  if (userAcl === ACL_BLOCKED) {
    return false;
  }
  if (userAcl === ACL_ADMIN) {
    return true;
  }
  if (userAcl === ACL_MOD) {
    return action !== ACL_ACTIONS.CONFIG;
  }
  if (userAcl === ACL_READ) {
    return action === ACL_ACTIONS.READ
  }
  // Everybody below can read
  if (action === ACL_ACTIONS.READ || action === ACL_ACTIONS.DECAY_UPDATE) {
    return true;
  }

  // No role below admin/mod has access to this
  if (action === ACL_ACTIONS.CONFIG || action === ACL_ACTIONS.EVENT_LOG) {
    return false;
  }

  if (userAcl === ACL_FULL) {
    if (action === ACL_ACTIONS.ICON_ADD || action === ACL_ACTIONS.MOVE_OBS) {
      return true;
    }
    // if its not add, there needs to be a feature and the userIds need to match
    if (
        !feature || 
        (feature.properties.userId && 
        feature.properties.userId !== userId && 
        userGroups.indexOf(feature.properties.groupId) === -1)
    ) {
      return false
    }
    // own or undefined feature, allowed to edit
    return true
  }

  if (userAcl === ACL_ICONS_ONLY) {
    if (!feature || !feature.properties || feature.properties.type !== 'information') {
      return false
    }
    // Not own feature
    if (feature.properties.userId && feature.properties.userId !== userId) {
      return false
    }
    return action === ACL_ACTIONS.ICON_ADD || action === ACL_ACTIONS.ICON_EDIT || action === ACL_ACTIONS.ICON_DELETE
  }

  return false;
}