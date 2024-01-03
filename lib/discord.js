import http from "node:https";

import { ACL_ORDER, ACL_BLOCKED } from "./ACLS.js";
import config from "./config.js";

export class Discord {
  /**
   * @overload
   * @param {DiscordRequestOptions<DiscordAPIGetCurrentUser>} options
   * @returns {Promise<DiscordUser | null>}
   */

  /**
   * @overload
   * @param {DiscordRequestOptions<DiscordAPIGetGuildMember>} options
   * @returns {Promise<DiscordGuildMember | null>}
   */

  /**
   * Send a request to the Discord API
   * @param {DiscordRequestOptions} options
   * @returns {Promise<unknown>}
   * @private
   */
  request = (options) => {
    return fetch('https://discord.com' + options.path, {
      headers: {
        authorization: 'Bearer ' + options.token,
        'Content-Type': 'application/json',
        'User-Agent': 'warden.express',
      }
    }).then((response) => {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining && Number(remaining) < 2) {
        console.log("Reaching limit for " + options.path +  ", remaining " + remaining)
      }
      if (response.ok) {
        return response.json()
      }
      return null
    });
  }

  /**
   * Fetch the discord guild information for a user
   * @param {SessionWithGrant} session
   * @param {string} guild
   * @returns {Promise<DiscordGuildMember | null>}
   */
  getGuildInformation = async (session, guild) => {
    const token = session.grant?.response?.access_token;
    if (token === undefined) {
      console.warn("No access token for guild information");
      return null;
    }
    return await this.request({
      path: `/api/users/@me/guilds/${guild}/member`,
      token,
    });
  }

  /**
   * Fetch the discord user information for a user
   * @param {SessionWithGrant} session
   * @returns {Promise<DiscordUser | null>}
   */
  getUser = async (session) => {
    const token = session.grant?.response?.access_token;
    if (token === undefined) {
      console.warn("No access token for user information");
      return null;
    }
    return this.request({ path: "/api/users/@me", token });
  }

  /**
   * Refreshes a discord oauth token.
   * @param {SessionWithGrant} session
   * @returns {Promise<boolean>}
   */
  refreshAccessToken = async (session) => {
    const response = session.grant?.response;
    if (response === undefined ) {
      // Missing grant response
      return false;
    }
    if (response.refresh_token === undefined) {
      // Missing refresh token
      return false;
    }
    return fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'warden.express',
      },
      body: new URLSearchParams({
        client_id: config.config.discord.key,
        client_secret: config.config.discord.secret,
        grant_type: 'refresh_token',
        refresh_token: response.refresh_token,
        scope: 'identify guilds.members.read',
      }),
    }).then(async (response) => {
      if (response.ok) {
        return /** @type{DiscordAccessTokenResponse} */ (await response.json())
      }
      return null
    }).then((data) => {
      if (data !== null) {
        response.access_token = data.access_token
        response.access_token_end = data.expires_in * 1000 + Date.now()
        response.refresh_token = data.refresh_token
        session.save()
        return true;
      }
      return false;
    })
  }

  /**
   * Helper utility to get an array of discord servers from the config or just the nominated one.
   * @param {?string} nominated
   * @returns {[string, import("./config.js").DiscordRecord][]}
   * @private
   */
  getDiscordServersFromConfig = (nominated) => {
    if (nominated !== null) {
      const nominatedDiscord = config.config.access.discords[nominated]
      if (nominatedDiscord !== undefined) {
        return [[nominated, nominatedDiscord]]
      }
    }
    return Object.entries(config.config.access.discords)
  };

  /**
   * Check a discord user to see if they are allowed to access the site.
   * @param {SessionWithGrant} session
   * @returns {Promise<CheckAllowedUserObject>}
   */
  checkAllowedUser = async (session) => {
    /** @type{?string} */
    let preferredDiscordServer = null
    if (session.grant === undefined) {
      return {
        access: false,
        user: null,
        userId: null,
        acl: null,
        discordId: null,
        debugInfo: ["Missing access token"],
      }
    }
    if (session.grant.dynamic && session.grant.dynamic.discordServerId) {
      preferredDiscordServer = /** @type{string} */ (session.grant.dynamic.discordServerId);
    }
    const access_token_end = session.grant.response?.access_token_end;
    if (access_token_end === undefined || access_token_end < Date.now()) {
      if (!await this.refreshAccessToken(session)) {
        return {
          access: false,
          user: null,
          userId: null,
          acl: null,
          discordId: null,
          debugInfo: ["Failed to refresh access token"]
        }
      }
    }

    // Check if user has access
    const userData = await this.getUser(session);
    if (userData === null) {
      return {
        access: false,
        user: null,
        userId: null,
        acl: null,
        discordId: null,
        debugInfo: ["Failed to fetch user"],
      };
    }
    /** @type {[string, ...string[]]} */
    const debugInfo = [
      `Fetched user (${String(userData.id)}): ${JSON.stringify(userData)}`,
    ];
    const configUserData = config.config.access.users[userData.id];
    if (configUserData !== undefined) {
      debugInfo.push(`Direct access for user (${configUserData.acl})`);
      return {
        access: configUserData.acl !== ACL_BLOCKED,
        user: userData.username,
        userId: userData.id,
        acl: configUserData.acl,
        discordId: preferredDiscordServer,
        debugInfo,
      };
    }

    // Check if user has one specified role in one of the guilds
    // Doing this sequentially, so first found is used.
    /** @type {HighestAccessObject[]} */
    const highestAccess = []
    const discordsToCheck = this.getDiscordServersFromConfig(preferredDiscordServer);
    for (const [guildId, discordRecord] of discordsToCheck) {
      const guildInfo = await this.getGuildInformation(session, guildId);
      if (guildInfo === null || guildInfo.roles.length === 0) {
        debugInfo.push(
          `No roles for ${guildId} found. ${JSON.stringify(guildInfo)}`
        );
        continue;
      }
      debugInfo.push(`Part of ${guildId} with following roles: ["${guildInfo.roles.join('","')}"]`)
      const intersection = Object.entries(discordRecord.roles).filter(([value]) => guildInfo.roles.includes(value));
      if (intersection.length > 0) {
        const nick = guildInfo.nick ? guildInfo.nick : guildInfo.user.username
        debugInfo.push(`Part of ${guildId} with following intersected roles: ["${intersection.join('","')}"]`)
        for (const [, roleEntry] of intersection) {
          highestAccess.push({
            user: nick,
            acl: roleEntry.acl,
            discordId: guildId,
          });
        }
      }
    }

    const highestLevel = highestAccess
      .sort((a, b) => ACL_ORDER[b.acl] - ACL_ORDER[a.acl])
      .pop();

    if (highestLevel !== undefined) {
      return {
        access: true,
        user: highestLevel.user,
        userId: userData.id,
        acl: highestLevel.acl,
        discordId: highestLevel.discordId,
        debugInfo,
      };
    }

    // Fallthrough result
    return {
      access: false,
      user: null,
      userId: userData.id,
      acl: null,
      discordId: null,
      debugInfo,
    };
  }

}

export default new Discord();

/**
 * {@link https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-response Discord Access Token Response}
 * @typedef {object} DiscordAccessTokenResponse
 * @property {string} access_token
 * @property {string} token_type
 * @property {number} expires_in
 * @property {string} refresh_token
 * @property {string} scope
 */

/**
 * Highest Access Object
 * @typedef {object} HighestAccessObject
 * @property {string} user
 * @property {import("./ACLS.js").Access} acl
 * @property {string} discordId
 */

/**
 * Check allowed user object
 * @typedef {object} CheckAllowedUserObject
 * @property {boolean} access
 * @property {?string} user
 * @property {?string} userId
 * @property {?import("./ACLS.js").Access} acl
 * @property {?string} discordId
 * @property {[string, ...string[]]} debugInfo
 */

/**
 * String literal type of the Discord API endpoint for getting a guild member
 * @typedef {`/api/users/@me/guilds/${string}/member`} DiscordAPIGetGuildMember
 */

/**
 * String literal type of the Discord API endpoint for getting the current user
 * @typedef {"/api/users/@me"} DiscordAPIGetCurrentUser
 */

/**
 * Various string literal types of the Discord API endpoints used in this class
 * @typedef {DiscordAPIGetGuildMember | DiscordAPIGetCurrentUser} DiscordAPIEndpoint
 */

/**
 * @typedef {import('express-session').Session} Session
 */

/**
 * @typedef {import('express-session').SessionData} SessionData
 */

/**
 * @typedef {Session & SessionData} SessionWithGrant
 */

/**
 * Discord Request Options
 * @template [T = DiscordAPIEndpoint]
 * @typedef {object} DiscordRequestOptions
 * @property {T} path
 * @property {string} token
 */

/**
 * Discord User JSON Response from {@link https://discord.com/developers/docs/resources/user#user-object Discord API}
 * @typedef {object} DiscordUser
 * @property {string} id The user's id
 * @property {string} username The user's username, not unique across the platform
 * @property {string} discriminator The user's Discord-tag
 * @property {string | null} global_name The user's display name, if it is set. For bots, this is the application name
 * @property {string | null} avatar The user's avatar hash
 * @property {boolean | undefined} bot Whether the user belongs to an OAuth2 application
 * @property {boolean | undefined} system Whether the user is an Official Discord System user (part of the urgent message system)
 * @property {boolean | undefined} mfa_enabled Whether the user has two factor enabled on their account
 * @property {string | null | undefined} banner The user's banner hash
 * @property {number | null | undefined} accent_color The user's banner color encoded as an integer representation of hexadecimal color code
 * @property {string | undefined} locale The user's chosen language option
 * @property {boolean | undefined} verified Whether the email on this account has been verified
 * @property {string | null | undefined} email The user's email
 * @property {number | undefined} flags The flags on a user's account
 * @property {number | undefined} premium_type The type of Nitro subscription on a user's account
 * @property {number | undefined} public_flags The public flags on a user's account
 * @property {string | undefined} avatar_decoration The user's avatar decoration hash
 */

/**
 * Discord Guild Member JSON Response from {@link https://discord.com/developers/docs/resources/guild#guild-member-object Discord API}
 * @typedef {object} DiscordGuildMember
 * @property {DiscordUser} user The user this guild member represents - **NB** Could be undefined but is not in this case
 * @property {string | null | undefined} nick This users guild nickname
 * @property {string | null | undefined} avatar The member's guild avatar hash
 * @property {string[]} roles Array of role object ids
 * @property {string} joined_at When the user joined the guild
 * @property {string | null} premium_since When the user started boosting the guild
 * @property {boolean} deaf Whether the user is deafened in voice channels
 * @property {boolean} mute Whether the user is muted in voice channels
 * @property {number} flags Guild member flags represented as a bit set, defaults to `0`
 * @property {boolean | undefined} pending Whether the user has not yet passed the guild's Membership Screening requirements
 * @property {string | null | undefined} communication_disabled_until Timestamp of when the time out will be removed; until then, they cannot interact with the guild
 */