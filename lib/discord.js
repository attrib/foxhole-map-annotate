const http = require('https');
const fs = require("fs");
const YAML = require("yaml")

let allowedUsers;
const allowedUsersFileName = __dirname + '/../data/allowedUsers.yml';
if (fs.existsSync(allowedUsersFileName)) {
  const file = fs.readFileSync(allowedUsersFileName, 'utf8')
  allowedUsers = YAML.parse(file, {intAsBigInt: true});
} else {
  allowedUsers = {
    users: {},
    guilds: {},
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

      console.log(options.path)
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

  getGuilds = () => {
    let options = {
      path: '/api/users/@me/guilds',
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

    // Check if complete guild has access
    const guildData = await this.getGuilds();
    let access = false
    const possibleRoleChecks = [];
    const guilds = [];
    for (const guild of guildData) {
      if (Object.keys(allowedUsers.guilds).includes(guild.id)) {
        access = guild.id
        break;
      }
      if (Object.keys(allowedUsers.roles).includes(guild.id)) {
        possibleRoleChecks.push(guild.id)
      }
      guilds.push({name: guild.name, id: guild.id})
    }
    if (access !== false) {
      const guildInfo = await this.getGuildInformation(access);
      return {
        access: true,
        user: guildInfo.nick ? guildInfo.nick : guildInfo.user.username,
        acl: allowedUsers.guilds[access],
      }
    }

    // User is in no guild, which is known to us
    if (possibleRoleChecks.length === 0) {
      return {
        access: false,
        userId: userData.id,
        guilds
      };
    }

    // Check if user has one specified role in one of the guilds
    // Doing this sequentially, so first found is used.
    for (const guildId of possibleRoleChecks) {
      const guildInfo = await this.getGuildInformation(guildId);
      let union = [...new Set([...Object.keys(allowedUsers.roles[guildId]), ...guildInfo.roles])];
      if (union.length > 0) {
        return {
          access: true,
          user: guildInfo.nick ? guildInfo.nick : guildInfo.user.username,
          acl: allowedUsers.roles[guildId][union[0]],
        };
      }
    }

    return {
      access: false,
      userId: userData.id,
      guilds
    }
  }

}