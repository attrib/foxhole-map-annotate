let http = require('https');
const fs = require("fs");

let allowedUsers;
const allowedUsersFileName = './data/allowedUsers.json';
if (fs.existsSync(allowedUsersFileName)) {
  allowedUsers = require('.' + allowedUsersFileName);
}
else {
  allowedUsers = {
    users: [],
    guilds: [],
    roles: {
      '842095023172616242': ['1003485459676139551'],
    }
  }
  fs.writeFile(allowedUsersFileName, JSON.stringify(allowedUsers, null, 2), err => {
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

      const req = http.request(options, callback).end();
      req.on('error', errorCallback)
    })
  }

  getGuildInformation = (guild, cb) => {
    let options = {
      host: 'discord.com',
      path: '/api/users/@me/guilds/' + guild + '/member',
      headers: {
        authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      }
    };

    return this.request(options)
  }

  getUser = () => {
    let options = {
      host: 'discord.com',
      path: '/api/users/@me',
      headers: {
        authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      }
    };
    return this.request(options)
  }

  getGuilds = () => {
    let options = {
      host: 'discord.com',
      path: '/api/users/@me/guilds',
      headers: {
        authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      }
    };
    return this.request(options)
  }

  checkAllowedUser = (cb) => {
    this.getUser()
      .then((userData) => {
        if (allowedUsers.users.includes(userData.id)) {
          cb({user: userData.username})
          return true
        }
        return this.getGuilds()
          .then((guildData) => {
            let access = false
            const possibleRoleChecks = [];
            const guildIds = [];
            for (const guild of guildData) {
              if (allowedUsers.guilds.includes(guild.id)) {
                access = guild.id
                break;
              }
              if (Object.keys(allowedUsers.roles).includes(guild.id)) {
                possibleRoleChecks.push(guild.id)
              }
              guildIds.push({name: guild.name, id: guild.id})
            }
            if (access !== false) {
              return this.getGuildInformation(access)
                .then((guildInfo) => {
                  cb({user: guildInfo.nick ? guildInfo.nick : guildInfo.user.username})
                  return true
                })
            }
            else {
              if (possibleRoleChecks.length === 0) {
                cb(false, userData.id, guildIds)
                return false;
              }
              const promises = []
              for (const guildId of possibleRoleChecks) {
                promises.push(
                  this.getGuildInformation(guildId)
                    .then((guildInfo) => {
                      let union = [...new Set([...allowedUsers.roles[guildId], ...guildInfo.roles])];
                      if (union.length > 0) {
                        return {user: guildInfo.nick ? guildInfo.nick : guildInfo.user.username};
                      }
                      else {
                        return Promise.reject()
                      }
                    }))
              }
              return Promise.any(promises)
                .then((user) => {
                  cb(user)
                  return true
                })
                .catch(() => {
                  cb(false, userData.id, guildIds)
                  return false
                })
            }
          })
      })
  }

}