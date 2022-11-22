const http = require("https");
const fs = require("fs");
const config = require('./config')

class WarApi {

  EVENT_WAR_UPDATED = 'warUpdated'
  EVENT_WAR_ENDED = 'warEnded'
  EVENT_WAR_PREPARE = 'warPrepareNext'
  WAR_IN_PROGRESS = 'ongoing'
  WAR_RESISTANCE = 'resistance'
  WAR_PREPARE = 'prepare'

  eTags = {}
  callbacks = {}

  constructor() {
    this.warData = fs.existsSync('./data/wardata.json') ? require('../data/wardata.json') : {shard: config.config.shard.name, warNumber: 0, winner: 'NONE', status: this.WAR_IN_PROGRESS, conquestEndTime: null, conquestStartTime: null}
    if (!this.warData.status) {
      this.warData.status = this.getWarStatus(this.warData)
    }
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

  getWarStatus = (data = null) => {
    if (!data) {
      data = this.warData
    }
    const now = Date.now()
    if (data.winner === 'NONE' && data.conquestStartTime && now > data.conquestStartTime) {
      return this.WAR_IN_PROGRESS
    }
    // War end status for 12hours
    if (data.conquestEndTime && data.conquestEndTime + 43200000 > now) {
      return this.WAR_RESISTANCE
    }
    return this.WAR_PREPARE
  }

  warDataUpdate = () => {
    return this.war()
      .then((data) => {
        if (data) {
          data.shard = config.config.shard.name
          data.status = this.getWarStatus(data)
          // Buggy Api or already in preparation for next war
          // Ignoring old war data now, waiting for API to reflect next war
          if (this.warData.warNumber > data.warNumber) {
            return
          }
          if (((this.warData.status === this.WAR_PREPARE && data.warNumber === this.warData.warNumber) || (data.warNumber > this.warData.warNumber)) && data.status === this.WAR_IN_PROGRESS) {
            // We didn't prepare for this war!
            if (this.warData.status !== this.WAR_PREPARE) {
              console.log('Not prepared for war. Preparing now.')
              this.emit(this.EVENT_WAR_PREPARE, {
                newData: data,
                oldData: {...this.warData},
              })
            }
            console.log('A new war begins!')
            this.emit(this.EVENT_WAR_UPDATED, {
              newData: data,
              oldData: {...this.warData},
            })
          }
          else if (this.warData.status === this.WAR_IN_PROGRESS && data.status === this.WAR_RESISTANCE) {
            console.log('War is over!')
            this.emit(this.EVENT_WAR_ENDED, {
              newData: data,
              oldData: {...this.warData},
            })
          }
          else if ((this.warData.status === this.WAR_RESISTANCE || this.warData.status === this.WAR_IN_PROGRESS) && data.status === this.WAR_PREPARE) {
            console.log('War never ends!')
            data = {shard: 'Abel', warNumber: data.warNumber + 1, winner: 'NONE', status: this.WAR_PREPARE, conquestEndTime: null, conquestStartTime: null}
            this.emit(this.EVENT_WAR_PREPARE, {
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
      if (version === 'DEACTIVATED') {
        return new Promise((resolve) => {
          resolve(null)
        })
      }
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
        host: config.config.shard.url,
        headers: {
          authorization: 'Bearer ' + this.token,
          'Content-Type': 'application/json',
          'If-None-Match': (path in this.eTags && this.eTags[path])  ? this.eTags[path] : ''
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
        host: config.config.shard.url,
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