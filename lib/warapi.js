const http = require("https");
const fs = require("fs");

class WarApi {

  EVENT_WAR_UPDATED = 'warUpdated'

  eTags = {}
  callbacks = {}

  constructor() {
    this.warData = fs.existsSync('./data/wardata.json') ? require('../data/wardata.json') : {shard: 'Abel', warNumber: 1, winner: 'NONE'}
    setTimeout(this.cronWarData, 900000) // every 15 minutes
  }

  on = (event, callback) => {
    if (!(event in this.callbacks)) {
      this.callbacks[event] = []
    }
    this.callbacks[event].push(callback)
  }

  emit = (event, data) => {
    if (event in this.callbacks) {
      for (const callback of this.callbacks[event]) {
        callback(data)
      }
    }
  }

  cronWarData = () => {
    this.war()
      .then((data) => {
        if (data) {
          data.shard = 'Able'
          // buggy Api
          if (this.warData.warNumber > data.warNumber) {
            return
          }
          if (data.warNumber > this.warData.warNumber) {
            console.log('A new war begins!')
            this.emit(this.EVENT_WAR_UPDATED, {
              newData: data,
              oldData: {...this.warData},
            })
          }
          this.warData = data
          fs.writeFile(__dirname + '/../data/wardata.json', JSON.stringify(data, null, 2), err => {
            if (err) {
              console.error(err);
            }
          })
        }
      })
      .catch((e) => {
        console.log('error fetching war data', e)
      })
      .finally(() => {
        setTimeout(this.cronWarData, 900000)
      })
  }

  staticMap = (hexId) => {
    return this.request('worldconquest/maps/' + hexId + '/static');
  }

  dynamicMap = (hexId) => {
    return this.request('worldconquest/maps/' + hexId + '/dynamic/public');
  }

  war = () => {
    return this.requestWithETag('worldconquest/war', null);
  }

  dynamicMapETag = (hexId, version = null) => {
    if (version) {
      this.eTags['worldconquest/maps/' + hexId + '/dynamic/public'] = '"' + version + '"'
    }
    return this.requestWithETag('worldconquest/maps/' + hexId + '/dynamic/public');
  }

  requestWithETag = (path) => {
    return new Promise((resolve, reject) => {
      const errorCallback = (error) => {
        reject(error)
      }
      /**
       * @param {IncomingMessage} response
       */
      const callback = (response) => {
        let str = '';
        this.eTags[path] = response.headers.etag

        response.on('error', errorCallback)

        if (response.statusCode === 304) {
          resolve(null)
          // /dev/null data
          response.on('data', () => {
          });
          response.on('end', () => {
          });
        }
        else {
          //another chunk of data has been received, so append it to `str`
          response.on('data', (chunk) => {
            str += chunk;
          });

          //the whole response has been received, so we just print it out here
          response.on('end', () => {
            resolve(JSON.parse(str));
          });
        }
      }

      const req = http.request({
        host: 'war-service-live.foxholeservices.com',
        headers: {
          authorization: 'Bearer ' + this.token,
          'Content-Type': 'application/json',
          'If-None-Match': path in this.eTags ? this.eTags[path] : ''
        },
        path: '/api/' + path
      }, callback).end();
      req.on('error', errorCallback)
    })
  }


  request = (path) => {
    return new Promise((resolve, reject) => {
      const errorCallback = (error) => {
        reject(error)
      }
      /**
       * @param {IncomingMessage} response
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

  getTeam = (teamId) => {
    if (teamId === 'NONE') {
      return ''
    }
    if (teamId === 'COLONIALS') {
      return 'Colonial'
    }
    if (teamId === 'WARDENS') {
      return 'Warden'
    }
  }

  iconTypes = {
    11: {
      type: 'industry',
      icon: 'MapIconMedical',
      notes: 'Hospital',
    },
    12: {
      type: 'industry',
      icon: 'MapIconVehicle',
      notes: 'Vehicle Factory ',
    },
    15: {
      type: 'industry',
      icon: 'MapIconWorkshop',
      notes: 'Workshop',
    },
    16: {
      type: 'industry',
      icon: 'MapIconManufacturing',
      notes: 'Manufacturing Plant',
    },
    17: {
      type: 'industry',
      icon: 'MapIconManufacturing',
      notes: 'Refinery',
    },
    18: {
      type: 'industry',
      icon: 'MapIconShipyard',
      notes: 'Shipyard',
    },
    19: {
      type: 'industry',
      icon: 'MapIconTechCenter',
      notes: 'Tech Center',
    },
    33: {
      type: 'industry',
      icon: 'MapIconStorageFacility',
      notes: 'Storage Depot',
    },
    34: {
      type: 'industry',
      icon: 'MapIconFactory',
      notes: 'Factory',
    },
    36: {
      type: 'industry',
      icon: 'MapIconAmmoFactory',
      notes: 'Ammo Factory',
    },
    39: {
      type: 'industry',
      icon: 'MapIconConstructionYard',
      notes: 'Construction Yard',
    },
    51: {
      type: 'industry',
      icon: 'MapIconMassProductionFactory',
      notes: 'Mass Production Factory',
    },
    52: {
      type: 'industry',
      icon: 'MapIconSeaport',
      notes: 'Seaport',
    },
    53: {
      type: 'industry',
      icon: 'MapIconCoastalGun',
      notes: 'Coastal Gun',
    },


    28: {
      type: 'town',
      icon: 'MapIconObservationTower',
      notes: 'Observation Tower',
    },
    37: {
      type: 'town',
      icon: 'MapIconRocketSite',
      notes: 'Rocket Site',
    },
    45: {
      type: 'town',
      icon: 'MapIconRelicBase',
      notes: 'Relic Base',
    },
    46: {
      type: 'town',
      icon: 'MapIconRelicBase',
      notes: 'Relic Base',
    },
    47: {
      type: 'town',
      icon: 'MapIconRelicBase',
      notes: 'Relic Base',
    },
    56: {
      type: 'town',
      icon: 'MapIconTownBaseTier1',
      notes: 'Town Hall',
    },
    57: {
      type: 'town',
      icon: 'MapIconTownBaseTier2',
      notes: 'Town Hall',
    },
    58: {
      type: 'town',
      icon: 'MapIconTownBaseTier3',
      notes: 'Town Hall',
    },


    20: {
      type: 'field',
      icon: 'MapIconSalvageColor',
      notes: 'Salvage Field',
    },
    21: {
      type: 'field',
      icon: 'MapIconComponentsColor',
      notes: 'Component Field',
    },
    23: {
      type: 'field',
      icon: 'MapIconSulfurColor',
      notes: 'Sulfur Field',
    },
    32: {
      type: 'field',
      icon: 'MapIconSulfurMineColor',
      notes: 'Sulfur Mine',
    },
    38: {
      type: 'field',
      icon: 'MapIconSalvageMineColor',
      notes: 'Salvage Mine',
    },
    40: {
      type: 'field',
      icon: 'MapIconComponentMineColor',
      notes: 'Component Mine',
    },
    61: {
      type: 'field',
      icon: 'MapIconCoalFieldColor',
      notes: 'Coal Field',
    },
    62: {
      type: 'field',
      icon: 'MapIconOilFieldColor',
      notes: 'Oil Field',
    },
  }


}

module.exports = new WarApi()