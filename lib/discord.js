const http = require('https');
const {ACL_ORDER, ACL_BLOCKED} = require("./ACLS");

const config = require('./config')

module.exports = class Discord {

  preferredDiscordServer = null

  constructor(token) {
    this.token = token
  }

  request = (options) => {
    return new Promise((resolve, reject) => {
      const errorCallback = (error) => {
        reject(error)
      }
      /**
       * @param {Response} response
       */
      const callback = (response) => {
        let str = '';

        if (response.headers['x-ratelimit-remaining'] < 2) {
          console.log("Reaching limit for " + options.path +  ", remaining " + response.headers['x-ratelimit-remaining'])
        }

        //another chunk of data has been received, so append it to `str`
        response.on('data', (chunk) => {
          str += chunk;
        });

        //the whole response has been received, so we just print it out here
        response.on('end', () => {
          resolve(JSON.parse(str));
        });

        response.on('error', errorCallback)
      }

      const req = http.request({
        host: 'discord.com',
        headers: {
          authorization: 'Bearer ' + this.token,
          'Content-Type': 'application/json',
        },
        ...options
      }, callback).end();
      req.on('error', errorCallback)
    })
  }

  getGuildInformation = (guild) => {
    let options = {
      path: '/api/users/@me/guilds/' + guild + '/member',
    };

    return this.request(options)
  }

  getUser = () => {
    let options = {
      path: '/api/users/@me',
    };
    return this.request(options)
  }

  checkAllowedUser = async () => {
    const debugInfo = []
    // Check if user has access
    const userData = await this.getUser();
    debugInfo.push(`Fetched user (${String(userData.id)}): ${JSON.stringify(userData)}`)
    if (userData.id in config.config.access.users) {
      debugInfo.push(`Direct access for user (${config.config.access.users[userData.id].acl})`)
      return {
        access: config.config.access.users[userData.id].acl !== ACL_BLOCKED,
        user: userData.username,
        userId: userData.id,
        acl: config.config.access.users[userData.id].acl,
        debugInfo
      }
    }

    // Check if user has one specified role in one of the guilds
    // Doing this sequentially, so first found is used.
    const highestAccess = []
    const discordsToCheck = this.preferredDiscordServer !== null ? [this.preferredDiscordServer] : Object.keys(config.config.access.discords)
    for (const guildId of discordsToCheck) {
      const guildInfo = await this.getGuildInformation(guildId);
      if (!guildInfo.roles) {
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
      };
    }

    return {
      access: false,
      userId: userData.id,
      debugInfo
    }
  }

}