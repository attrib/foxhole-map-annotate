const http = require('https');
const {ACL_ORDER, ACL_BLOCKED} = require("./ACLS");

const config = require('./config')

module.exports = class Discord {

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
    // Check if user has access
    const userData = await this.getUser();
    userData.id = String(userData.id);
    if (userData.id in config.config.access.users) {
      return {
        access: config.config.access.users[userData.id] !== ACL_BLOCKED,
        user: userData.username,
        userId: userData.id,
        acl: config.config.access.users[userData.id],
      }
    }

    // Check if user has one specified role in one of the guilds
    // Doing this sequentially, so first found is used.
    let highestAccess = []
    for (const guildId of Object.keys(config.config.access.roles)) {
      const guildInfo = await this.getGuildInformation(guildId);
      if (!guildInfo.roles) {
        continue
      }
      let intersection = Object.keys(config.config.access.roles[guildId]).filter(value => guildInfo.roles.includes(value));
      if (intersection.length > 0) {
        const nick = guildInfo.nick ? guildInfo.nick : guildInfo.user.username
        for (const intersectionRole of intersection) {
          highestAccess.push({
            user: nick,
            acl: config.config.access.roles[guildId][intersectionRole],
          })
        }
      }
    }

    if (highestAccess.length > 0) {
      const highestLevel = highestAccess.sort((a, b) => ACL_ORDER[b.acl] - ACL_ORDER[a.acl]).pop()
      return {
        access: config.config.access.users[userData.id] !== ACL_BLOCKED,
        user: highestLevel.user,
        userId: userData.id,
        acl: highestLevel.acl,
      };
    }

    return {
      access: false,
      userId: userData.id,
    }
  }

}