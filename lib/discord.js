let http = require('https');

module.exports = class Discord {

  constructor(token) {
    this.token = token
  }

  getVStatus(cb) {
    let options = {
      host: 'discord.com',
      path: '/api/users/@me/guilds/842095023172616242/member',
      headers: {
        authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      }
    };

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

}