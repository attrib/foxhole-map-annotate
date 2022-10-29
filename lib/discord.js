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

  request = (options, cb) => {
    let callback = function(response) {
      let str = '';

      //another chunk of data has been received, so append it to `str`
      response.on('data', function (chunk) {
        str += chunk;
      });

      //the whole response has been received, so we just print it out here
      response.on('end', function () {
        cb(JSON.parse(str));
      });
    }

    http.request(options, callback).end();
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

    this.request(options, cb)
  }

  getUser = (cb) => {
    let options = {
      host: 'discord.com',
      path: '/api/users/@me',
      headers: {
        authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      }
    };
    this.request(options, cb)
  }

  getGuilds = (cb) => {
    let options = {
      host: 'discord.com',
      path: '/api/users/@me/guilds',
      headers: {
        authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      }
    };
    this.request(options, cb)
  }

  checkAllowedUser = (cb) => {
    this.getUser((userData) => {
      if (allowedUsers.users.includes(userData.id)) {
        return cb({user: userData.username})
      }
      this.getGuilds((guildData) => {
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
          this.getGuildInformation(access, (guildInfo) => {
            return cb({user: guildInfo.nick ? guildInfo.nick : guildInfo.user.username})
          })
        }
        else {
          const checksDone = []
          let resultFound = false
          if (possibleRoleChecks.length === 0) {
            return cb(false, userData.id, guildIds)
          }
          for (const guildId of possibleRoleChecks) {
            this.getGuildInformation(guildId, (guildInfo) => {
              checksDone.push(guildId);
              let union = [...new Set([...allowedUsers.roles[guildId], ...guildInfo.roles])];
              if (union.length > 0) {
                resultFound = true
                return cb({user: guildInfo.nick ? guildInfo.nick : guildInfo.user.username})
              }
              if (checksDone.length === possibleRoleChecks.length && !resultFound) {
                return cb(false, userData.id, guildIds)
              }
            })
          }
        }
      })
    })
  }

}