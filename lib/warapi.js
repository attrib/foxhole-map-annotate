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

  war = () => {
    return this.request('worldconquest/war');
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
      icon: 'scrap_field',
      notes: 'Salvage Field',
    },
    21: {
      type: 'field',
      icon: 'comp_field',
      notes: 'Component Field',
    },
    23: {
      type: 'field',
      icon: 'sulfur_field',
      notes: 'Sulfur Field',
    },
    32: {
      type: 'field',
      icon: 'sulfur_mine',
      notes: 'Sulfur Mine',
    },
    38: {
      type: 'field',
      icon: 'scrap_mine',
      notes: 'Salvage Mine',
    },
    40: {
      type: 'field',
      icon: 'comp_mine',
      notes: 'Component Mine',
    },
    61: {
      type: 'field',
      icon: 'coal_field',
      notes: 'Coal Field',
    },
    62: {
      type: 'field',
      icon: 'oil_field',
      notes: 'Oil Field',
    },
  }


}

module.exports = new WarApi()