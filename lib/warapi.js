const http = require("https");

class WarApi {

  constructor() {
  }

  staticMap = (hexId) => {
    return this.request('worldconquest/maps/' + hexId + '/static');
  }

  dynamicMap = (hexId) => {
    return this.request('worldconquest/maps/' + hexId + '/dynamic/public');
  }

  request = (path) => {
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
        host: 'war-service-live.foxholeservices.com',
        headers: {
          authorization: 'Bearer ' + this.token,
          'Content-Type': 'application/json',
        },
        path: '/api/' + path
      }, callback).end();
      req.on('error', errorCallback)
    })
  }

}

module.exports = new WarApi()