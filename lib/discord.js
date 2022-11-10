const http = require('https');
const fs = require("fs");
const YAML = require("yaml")
const {ACL_FULL, ACL_ICONS_ONLY, ACL_READ} = require("./ACLS");

let allowedUsers;
const allowedUsersFileName = __dirname + '/../data/allowedUsers.yml';
if (fs.existsSync(allowedUsersFileName)) {
  const file = fs.readFileSync(allowedUsersFileName, 'utf8')
  allowedUsers = YAML.parse(file, {intAsBigInt: true});
} else {
  allowedUsers = {
    users: {},
    roles: {}
  }
  fs.writeFile(allowedUsersFileName, YAML.stringify(allowedUsers), err => {
    if (err) {
      console.error(err);
    }
  });
}

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

        console.log('Remaining rate limit: ', response.headers['x-ratelimit-remaining'])

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
    if (Object.keys(allowedUsers.users).includes(userData.id)) {
      return {
        access: true,
        user: userData.username,
        acl: allowedUsers.users[userData.id],
      }
    }

    // Check if user has one specified role in one of the guilds
    // Doing this sequentially, so first found is used.
    let highestAccess = []
    for (const guildId of Object.keys(allowedUsers.roles)) {
      const guildInfo = await this.getGuildInformation(guildId);
      if (!guildInfo.roles) {
        continue
      }
      let union = [...new Set([...Object.keys(allowedUsers.roles[guildId]), ...guildInfo.roles])];
      if (union.length > 0) {
        const nick = guildInfo.nick ? guildInfo.nick : guildInfo.user.username
        const acl = allowedUsers.roles[guildId][union[0]]
        // Found first full access, so we can stop already
        if (acl === ACL_FULL) {
          return {
            access: true,
            user: nick,
            acl: acl,
          };
        }
        highestAccess.push({
          user: nick,
          acl: acl,
        })
      }
    }

    if (highestAccess.length > 0) {
      const icons = highestAccess.find(element => element.acl === ACL_ICONS_ONLY)
      if (icons) {
        return {
          access: true,
          user: icons.user,
          acl: icons.acl,
        };
      }
      const read = highestAccess.find(element => element.acl === ACL_READ)
      if (read) {
        return {
          access: true,
          user: read.user,
          acl: read.acl,
        };
      }
    }

    return {
      access: false,
      userId: userData.id,
    }
  }

}