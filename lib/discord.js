import http from "node:https";

import { ACL_ORDER, ACL_BLOCKED } from "./ACLS.js";
import config from "./config.js";

export default new class Discord {

  request = (options) => {
    return fetch('https://discord.com' + options.path, {
      headers: {
        authorization: 'Bearer ' + options.token,
        'Content-Type': 'application/json',
        'User-Agent': 'warden.express',
      }
    }).then((response) => {
      if (response.headers.get('x-ratelimit-remaining') < 2) {
        console.log("Reaching limit for " + options.path +  ", remaining " + response.headers['x-ratelimit-remaining'])
      }
      if (response.ok) {
        return response.json()
      }
      return null
    });
  }

  getGuildInformation = (session, guild) => {
    let options = {
      path: '/api/users/@me/guilds/' + guild + '/member',
      token: session.grant.response.access_token,
    };

    return this.request(options)
  }

  getUser = (session) => {
    let options = {
      path: '/api/users/@me',
      token: session.grant.response.access_token,
    };
    return this.request(options)
  }

  refreshAccessToken = async (session) => {
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
        refresh_token: session.grant.response.refresh_token,
        scope: 'identify guilds.members.read',
      }),
    }).then((response) => {
      if (response.ok) {
        return response.json()
      }
      return null
    }).then((data) => {
      if (data) {
        session.grant.response.access_token = data.access_token
        session.grant.response.access_token_end = data.expires_in * 1000 + Date.now()
        session.grant.response.refresh_token = data.refresh_token
        session.save()
        return true;
      }
      return false;
    })
  }

  checkAllowedUser = async (session) => {
    let preferredDiscordServer = null
    if (session.grant.dynamic && session.grant.dynamic.discordServerId) {
      preferredDiscordServer = session.grant.dynamic.discordServerId
    }
    if (!session.grant.response.access_token_end || session.grant.response.access_token_end < Date.now()) {
      if (!await this.refreshAccessToken(session)) {
        return {
          access: false,
          userId: null,
          debugInfo: ['Failed to refresh access token']
        }
      }
    }

    const debugInfo = []
    // Check if user has access
    const userData = await this.getUser(session);
    debugInfo.push(`Fetched user (${String(userData.id)}): ${JSON.stringify(userData)}`)
    if (userData.id in config.config.access.users) {
      debugInfo.push(`Direct access for user (${config.config.access.users[userData.id].acl})`)
      return {
        access: config.config.access.users[userData.id].acl !== ACL_BLOCKED,
        user: userData.username,
        userId: userData.id,
        acl: config.config.access.users[userData.id].acl,
        discordId: preferredDiscordServer,
        debugInfo
      }
    }

    // Check if user has one specified role in one of the guilds
    // Doing this sequentially, so first found is used.
    const highestAccess = []
    const discordsToCheck = preferredDiscordServer !== null ? [preferredDiscordServer] : Object.keys(config.config.access.discords)
    for (const guildId of discordsToCheck) {
      const guildInfo = await this.getGuildInformation(session, guildId);
      if (!guildInfo.roles || guildInfo.roles.length === 0) {
        debugInfo.push(`No roles for ${guildId} found. ${JSON.stringify(guildInfo)}`)
        continue
      }
      debugInfo.push(`Part of ${guildId} with following roles: ["${guildInfo.roles.join('","')}"]`)
      let intersection = Object.keys(config.config.access.discords[guildId].roles).filter(value => guildInfo.roles.includes(value));
      if (intersection.length > 0) {
        const nick = guildInfo.nick ? guildInfo.nick : guildInfo.user.username
        debugInfo.push(`Part of ${guildId} with following intersected roles: ["${intersection.join('","')}"]`)
        for (const intersectionRole of intersection) {
          highestAccess.push({
            user: nick,
            acl: config.config.access.discords[guildId].roles[intersectionRole].acl,
            discordId: guildId,
          })
        }
      }
    }

    if (highestAccess.length > 0) {
      const highestLevel = highestAccess.sort((a, b) => ACL_ORDER[b.acl] - ACL_ORDER[a.acl]).pop()
      return {
        access: true,
        user: highestLevel.user,
        userId: userData.id,
        acl: highestLevel.acl,
        discordId: highestLevel.discordId,
      };
    }

    return {
      access: false,
      userId: userData.id,
      debugInfo
    }
  }

}