import fs from "node:fs";
import { resolve } from "node:path";
import { EventEmitter } from "node:events";

import config from "./config.js";

export const EVENT = /** @type{const} */ ({
  WAR_UPDATED: "warUpdated",
  WAR_ENDED: "warEnded",
  WAR_PREPARE_NEXT: "warPrepareNext",
  WAR_IN_PROGRESS: "ongoing",
  WAR_RESISTANCE: "resistance",
  WAR_PREPARE: "prepare",
});

export const HEX_NAMES = /** @type{const} */ ([
  "TheFingersHex",
  "TempestIslandHex",
  "GreatMarchHex",
  "MarbanHollow",
  "ViperPitHex",
  "BasinSionnachHex",
  "StemaLandingHex",
  "DeadLandsHex",
  "HeartlandsHex",
  "EndlessShoreHex",
  "WestgateHex",
  "OarbreakerHex",
  "AcrithiaHex",
  "MooringCountyHex",
  "WeatheredExpanseHex",
  "ReaversPassHex",
  "MorgensCrossingHex",
  "LochMorHex",
  "StonecradleHex",
  "KalokaiHex",
  "AllodsBightHex",
  "RedRiverHex",
  "OriginHex",
  "ClahstraHex",
  "HowlCountyHex",
  "SpeakingWoodsHex",
  "ShackledChasmHex",
  "TerminusHex",
  "LinnMercyHex",
  "ClansheadValleyHex",
  "GodcroftsHex",
  "NevishLineHex",
  "CallumsCapeHex",
  "FishermansRowHex",
  "ReachingTrailHex",
  "UmbralWildwoodHex",
  "StlicanShelfHex",
  "CallahansPassageHex",
  "KingsCageHex",
  "AshFieldsHex",
  "DrownedValeHex",
  "FarranacCoastHex",
  "SableportHex",
]);

class WarApi extends EventEmitter {
  // Keeping these here for backwards compatibility
  EVENT_WAR_UPDATED = EVENT.WAR_UPDATED;
  EVENT_WAR_ENDED = EVENT.WAR_ENDED;
  EVENT_WAR_PREPARE = EVENT.WAR_PREPARE_NEXT;
  WAR_IN_PROGRESS = EVENT.WAR_IN_PROGRESS;
  WAR_RESISTANCE = EVENT.WAR_RESISTANCE;
  WAR_PREPARE = EVENT.WAR_PREPARE;

  /** @type{Record<string, string | null>} */
  eTags = {};

  /** @type{?WarData} */
  _warData = null;

  get warData() {
    if (this._warData !== null) {
      return this._warData;
    }
    throw new Error("War data not loaded");
  }

  /**
   * Load the War API data from file and get parse the status
   * @returns {Promise<WarApi>}
   */
  async loadWarData() {
    // !! Throws
    this._warData = fs.existsSync(resolve("data/wardata.json"))
      ? /** @type{WarData} */ (
          JSON.parse(fs.readFileSync(resolve("data/wardata.json"), "utf8"))
        )
      : {
          shard: config.config.shard.name,
          warNumber: 0,
          winner: "NONE",
          status: this.WAR_IN_PROGRESS,
          requiredVictoryTowns: 32,
          conquestEndTime: null,
          conquestStartTime: null,
        };
    if (!this.warData.status) {
      this.warData.status = this.getWarStatus(this.warData);
    }
    return this;
  }

  /**
   * Get the current war status
   * @param {?(WarData | WarStatusData)} data
   * @returns {WarEvent}
   */
  getWarStatus = (data = null) => {
    if (!data) {
      data = this.warData;
    }
    const now = Date.now();
    if (
      data.winner === "NONE" &&
      data.conquestStartTime &&
      now > data.conquestStartTime
    ) {
      return this.WAR_IN_PROGRESS;
    }
    // War end status for 12hours
    if (data.conquestEndTime && data.conquestEndTime + 43_200_000 > now) {
      return this.WAR_RESISTANCE;
    }
    return this.WAR_PREPARE;
  };

  /**
   * Update the cached war data
   * @returns {Promise<void>}
   */
  warDataUpdate = async () => {
    return await this.war()
      .then((data) => {
        if (data) {
          const shard = config.config.shard.name;
          const status = this.getWarStatus(data);
          data.shard = shard;
          // Buggy Api or already in preparation for next war
          // Ignoring old war data now, waiting for API to reflect next war
          if (
            this.warData.warNumber > data.warNumber &&
            this.warData.shard === shard
          ) {
            return;
          }
          if (
            this.warData.shard !== shard ||
            (((this.warData.status === this.WAR_PREPARE &&
              data.warNumber === this.warData.warNumber) ||
              data.warNumber > this.warData.warNumber) &&
              status === this.WAR_IN_PROGRESS)
          ) {
            // We didn't prepare for this war!
            if (this.warData.status !== this.WAR_PREPARE) {
              console.info("Not prepared for war. Preparing now.");
              this.emit(this.EVENT_WAR_PREPARE, {
                newData: data,
                oldData: { ...this.warData },
              });
            }
            console.info("A new war begins!");
            this.eTags = {};
            this.emit(this.EVENT_WAR_UPDATED, {
              newData: data,
              oldData: { ...this.warData },
            });
          } else if (
            this.warData.status === this.WAR_IN_PROGRESS &&
            status === this.WAR_RESISTANCE
          ) {
            console.info("War is over!");
            this.emit(this.EVENT_WAR_ENDED, {
              newData: data,
              oldData: { ...this.warData },
            });
          } else if (
            (this.warData.status === this.WAR_RESISTANCE ||
              this.warData.status === this.WAR_IN_PROGRESS) &&
            status === this.WAR_PREPARE
          ) {
            console.info("War never ends!");
            data.requiredVictoryTowns;
            const newData = /** @type{WarStatusData} */ ({
              warId: data.warId,
              shard: config.config.shard.name,
              warNumber: data.warNumber + 1,
              winner: "NONE",
              status: this.WAR_PREPARE,
              conquestEndTime: null,
              conquestStartTime: null,
              resistanceStartTime: data.resistanceStartTime,
              requiredVictoryTowns: data.requiredVictoryTowns,
            });
            this.emit(this.EVENT_WAR_PREPARE, {
              newData,
              oldData: { ...this.warData },
            });
          }
          this._warData = { ...data, status, shard };
          fs.writeFile(
            resolve("data/wardata.json"),
            JSON.stringify(data, null, 2),
            (err) => {
              if (err) {
                console.error(err);
              }
            }
          );
        }
      })
      .catch((e) => {
        console.error("error fetching war data", e);
      });
  };

  /**
   * Request a hex's static map data
   * @param {HexName} hexId
   * @returns {Promise<StaticMapData>}
   */
  staticMap = async (hexId) => {
    return await this.request(`worldconquest/maps/${hexId}/static`);
  };

  /**
   * Request a hex's dynamic map data
   * @param {HexName} hexId
   * @returns {Promise<DynamicMapData | null>}
   */
  dynamicMap = async (hexId) => {
    return await this.request(`worldconquest/maps/${hexId}/dynamic/public`);
  };

  /**
   * Request the war status
   * @returns {Promise<WarStatusData | null>}
   */
  war = async () => {
    return await this.requestWithETag("worldconquest/war");
  };

  /**
   * Request the shard map data
   * @returns {Promise<MapData | null>}
   */
  maps = async () => {
    return await this.request("worldconquest/maps");
  };

  /**
   * Request a hex's dynamic map data with an ETag
   * @param {HexName} hexId
   * @param {?number} version
   * @returns {Promise<DynamicMapData | null>}
   */
  dynamicMapETag = async (hexId, version = null) => {
    if (version) {
      this.eTags[`worldconquest/maps/${hexId}/dynamic/public`] = `"${version}"`;
    }
    return await this.requestWithETag(
      `worldconquest/maps/${hexId}/dynamic/public`
    );
  };

  /**
   * @overload
   * @param {WarStatusEndpoint} path
   * @returns {Promise<WarStatusData | null>}
   */

  /**
   * @overload
   * @param {DynamicMapEndpoint} path
   * @returns {Promise<DynamicMapData | null>}
   */

  /**
   * Fetches the data from the API and returns it if it has changed
   * @param {WarStatusEndpoint | DynamicMapEndpoint} path
   * @returns {Promise<WarStatusData | DynamicMapData | null>}
   */
  requestWithETag = async (path) => {
    // !! Throws
    // !! No Abort Controller
    return await fetch(`https://${config.config.shard.url}/api/${path}`, {
      headers: {
        "If-None-Match": this.eTags[path] ?? "",
        "Content-Type": "application/json",
        "User-Agent": "warden.express",
      },
    }).then(async (response) => {
      if (response.ok) {
        this.eTags[path] = response.headers.get("etag");
        return await response.json();
      }
      return null;
    });
  };

  /**
   * @overload
   * @param {StaticMapEndpoint} path
   * @returns {Promise<StaticMapData>}
   */

  /**
   * @overload
   * @param {MapEndpoint} path
   * @returns {Promise<MapData>}
   */

  /**
   * @overload
   * @param {DynamicMapEndpoint} path
   * @returns {Promise<DynamicMapData>}
   */

  /**
   * Fetches the data from the API and returns it
   * @param {string} path
   * @returns {Promise<any | null>}
   */
  request = async (path) => {
    // !! Throws
    // !! No Abort Controller
    return await fetch(`https://${config.config.shard.url}/api/${path}`, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "warden.express",
      },
    }).then(async (response) => {
      if (response.ok) {
        return await response.json();
      }
      return null;
    });
  };

  /**
   * Convert a teamId to a team name
   * @param {TeamID} teamId
   * @returns {"" | "Colonial" | "Warden"}
   */
  getTeam = (teamId) => {
    if (teamId === "COLONIALS") {
      return "Colonial";
    }
    if (teamId === "WARDENS") {
      return "Warden";
    }
    return "";
  };

  /**
   * @param {WarEvent} event
   * @param {WarEventData} data
   */
  emit = (event, data) => {
    return super.emit(event, data);
  };

  /**
   * @param {WarEvent} event
   * @param {(data: WarEventData) => void} listener
   */
  on = (event, listener) => {
    return super.on(event, listener);
  };

  iconTypes = /** @type{const} */ ({
    11: {
      type: "industry",
      icon: "MapIconMedical",
      notes: "Hospital",
    },
    12: {
      type: "industry",
      icon: "MapIconVehicle",
      notes: "Vehicle Factory ",
    },
    15: {
      type: "industry",
      icon: "MapIconWorkshop",
      notes: "Workshop",
    },
    16: {
      type: "industry",
      icon: "MapIconManufacturing",
      notes: "Manufacturing Plant",
    },
    17: {
      type: "industry",
      icon: "MapIconManufacturing",
      notes: "Refinery",
    },
    18: {
      type: "industry",
      icon: "MapIconShipyard",
      notes: "Shipyard",
    },
    19: {
      type: "industry",
      icon: "MapIconTechCenter",
      notes: "Tech Center",
    },
    33: {
      type: "industry",
      icon: "MapIconStorageFacility",
      notes: "Storage Depot",
    },
    34: {
      type: "industry",
      icon: "MapIconFactory",
      notes: "Factory",
    },
    36: {
      type: "industry",
      icon: "MapIconAmmoFactory",
      notes: "Ammo Factory",
    },
    39: {
      type: "industry",
      icon: "MapIconConstructionYard",
      notes: "Construction Yard",
    },
    51: {
      type: "industry",
      icon: "MapIconMassProductionFactory",
      notes: "Mass Production Factory",
    },
    52: {
      type: "industry",
      icon: "MapIconSeaport",
      notes: "Seaport",
    },
    53: {
      type: "industry",
      icon: "MapIconCoastalGun",
      notes: "Coastal Gun",
    },

    27: {
      type: "town",
      icon: "MapIconFortKeep",
      notes: "Keep",
      conquer: true,
    },
    28: {
      type: "town",
      icon: "MapIconObservationTower",
      notes: "Observation Tower",
    },
    35: {
      type: "town",
      icon: "MapIconSafehouse",
      notes: "Safehouse",
    },
    45: {
      type: "town",
      icon: "MapIconRelicBase",
      notes: "Small Relic Base",
      conquer: true,
    },
    46: {
      type: "town",
      icon: "MapIconRelicBase",
      notes: "Medium Relic Base",
      conquer: true,
    },
    47: {
      type: "town",
      icon: "MapIconRelicBase",
      notes: "Big Relic Base",
      conquer: true,
    },
    56: {
      type: "town",
      icon: "MapIconTownBaseTier1",
      notes: "Town Hall",
      conquer: true,
    },
    57: {
      type: "town",
      icon: "MapIconTownBaseTier2",
      notes: "Town Hall",
      conquer: true,
    },
    58: {
      type: "town",
      icon: "MapIconTownBaseTier3",
      notes: "Town Hall",
      conquer: true,
    },
    84: {
      type: "town",
      icon: "MapIconMortarHouse",
      notes: "Mortar House",
      conquer: false,
    },

    37: {
      type: "stormCannon",
      icon: "MapIconRocketSite",
      notes: "Rocket Site",
    },
    70: {
      type: "stormCannon",
      icon: "MapIconRocketTarget",
      notes: "Rocket Target",
    },
    71: {
      type: "stormCannon",
      icon: "MapIconRocketGroundZero",
      notes: "Rocket Ground Zero",
    },
    72: {
      type: "stormCannon",
      icon: "MapIconRocketSiteWithRocket",
      notes: "Rocket Site With Rocket",
    },
    59: {
      type: "stormCannon",
      icon: "MapIconStormCannon",
      notes: "Storm Cannon",
    },
    60: {
      type: "stormCannon",
      icon: "MapIconIntelCenter",
      notes: "Intel Center",
    },
    83: {
      type: "stormCannon",
      icon: "MapIconWeatherStation",
      notes: "Weather Station",
    },
    48: {
      // DevBranch Bug?
      type: "stormCannon",
      icon: "MapIconBunkerBaseTier1",
      notes: "Bunker Base T1",
    },
    49: {
      // DevBranch Bug?
      type: "stormCannon",
      icon: "MapIconBunkerBaseTier2",
      notes: "Bunker Base T2",
    },
    50: {
      // DevBranch Bug?
      type: "stormCannon",
      icon: "MapIconBunkerBaseTier3",
      notes: "Bunker Base T3",
    },
    55: {
      // DevBranch Bug?
      type: "stormCannon",
      icon: "MapIconBorderBase",
      notes: "Border Base",
    },
    8: {
      // DevBranch Bug?
      type: "stormCannon",
      icon: "MapIconForwardBase1",
      notes: "Forward Base",
    },

    20: {
      type: "field",
      icon: "MapIconSalvageColor",
      notes: "Salvage Field",
    },
    21: {
      type: "field",
      icon: "MapIconComponentsColor",
      notes: "Component Field",
    },
    23: {
      type: "field",
      icon: "MapIconSulfurColor",
      notes: "Sulfur Field",
    },
    32: {
      type: "field",
      icon: "MapIconSulfurMineColor",
      notes: "Sulfur Mine",
    },
    38: {
      type: "field",
      icon: "MapIconSalvageMineColor",
      notes: "Salvage Mine",
    },
    40: {
      type: "field",
      icon: "MapIconComponentMineColor",
      notes: "Component Mine",
    },
    61: {
      type: "field",
      icon: "MapIconCoalFieldColor",
      notes: "Coal Field",
    },
    62: {
      type: "field",
      icon: "MapIconOilFieldColor",
      notes: "Oil Field",
    },
    75: {
      type: "field",
      icon: "MapIconFacilityMineOilRig",
      notes: "Facility Mine Oil Rig",
    },
  });

  /**
   * Helper function to check if war is in progress
   * @returns {boolean}
   */
  isWarInProgress() {
    return this.warData.status === this.WAR_IN_PROGRESS;
  }

  /**
   * Helper function to check if war is in resistance
   * @returns {boolean}
   */
  isWarInResistance() {
    return this.warData.status === this.WAR_RESISTANCE;
  }

  /**
   * Helper function to type guard a number type to an icon type
   * @param {number} value
   * @returns {value is keyof typeof this.iconTypes}
   */
  isIconType(value) {
    return value in this.iconTypes;
  }

  /**
   * Helper function to type guard a number type to an icon type of a specific type.
   * @template {typeof this.iconTypes[keyof typeof this.iconTypes]['type']} T
   * @param {number} value
   * @param {...T} params
   * @returns {value is { [K in keyof typeof this.iconTypes]: typeof this.iconTypes[K]['type'] extends T ? K : never }[keyof typeof this.iconTypes]}
   */
  isIconTypeOfType(value, ...params) {
    return this.isIconType(value)
      ? params.some((entry) => this.iconTypes[value].type === entry)
      : false;
  }

  /**
   * Helper function to type guard a number type to an icon type of a specific icon.
   * @template {typeof this.iconTypes[keyof typeof this.iconTypes]['icon']} T
   * @param {number} value
   * @param {...T} params
   * @returns {value is { [K in keyof typeof this.iconTypes]: typeof this.iconTypes[K]['icon'] extends T ? K : never }[keyof typeof this.iconTypes]}
   */
  isIconTypeOfIcon(value, ...params) {
    return this.isIconType(value)
      ? params.some((entry) => this.iconTypes[value].icon === entry)
      : false;
  }

  /**
   * Helper function to type guard a number type to an icon type with a conquer flag.
   * @param {number} value
   * @returns {value is { [K in keyof typeof this.iconTypes]: typeof this.iconTypes[K]['conquer'] extends true ? K : never }[keyof typeof this.iconTypes]}
   */
  isIconTypeOfConquerType(value) {
    return this.isIconType(value) && "conquer" in this.iconTypes[value];
  }
}

const warApi = await new WarApi().loadWarData();

export default warApi;

/**
 * A War Event
 * @typedef {typeof EVENT[keyof typeof EVENT]} WarEvent
 */

/**
 * War Event Data
 * @typedef {object} WarEventData
 * @property {WarStatusData} newData
 * @property {WarData} oldData
 */

/**
 * @typedef {"NONE" | "COLONIALS" | "WARDENS"} TeamID
 */

/**
 * War Status Endpoint
 * @typedef {"worldconquest/war"} WarStatusEndpoint
 */

/**
 * Map Endpoint
 * @typedef {"worldconquest/maps"} MapEndpoint
 */

/**
 * Dynamic Map Endpoint
 * @typedef {`worldconquest/maps/${HexName}/dynamic/public`} DynamicMapEndpoint
 */

/**
 * Static Map Endpoint
 * @typedef {`worldconquest/maps/${HexName}/static`} StaticMapEndpoint
 */

/**
 * War Status
 * @typedef {object} WarStatusData
 * @property {string} warId
 * @property {number} warNumber
 * @property {TeamID} winner
 * @property {?number} conquestStartTime
 * @property {?number} conquestEndTime
 * @property {?number} resistanceStartTime
 * @property {number} requiredVictoryTowns
 */

/**
 * Map Hex name
 * @typedef {typeof HEX_NAMES[number]} HexName
 */

/**
 * Map Data
 * @typedef {HexName[]} MapData
 */

/**
 * Map Item
 * @typedef {object} MapItem
 * @property {TeamID} teamId
 * @property {number} iconType
 * @property {number} x
 * @property {number} y
 * @property {number} flags
 * @property {number} viewDirection
 */

/**
 * Map Text Item
 * @typedef {object} MapTextItem
 * @property {string} text
 * @property {number} x
 * @property {number} y
 * @property {"Major" | "Minor"} mapMarkerType
 */

/**
 * Dynamic Map Data
 * @typedef {object} DynamicMapData
 * @property {number} regionId
 * @property {number} scorchedVictoryTowns
 * @property {MapItem[]} mapItems
 * @property {never[]} mapItemsC
 * @property {never[]} mapItemsW
 * @property {never[]} mapTextItems
 * @property {number} lastUpdated
 * @property {number} version
 */

/**
 * Static Map Data
 * @typedef {object} StaticMapData
 * @property {number} regionId
 * @property {number} scorchedVictoryTowns
 * @property {never[]} mapItems
 * @property {never[]} mapItemsC
 * @property {never[]} mapItemsW
 * @property {MapTextItem[]} mapTextItems
 * @property {number} lastUpdated
 * @property {number} version
 */

/**
 * WarData
 * @typedef {object} WarData
 * @property {WarEvent} status
 * @property {import("./config.js").ConfigData['shard']['name']} shard
 * @property {WarStatusData['requiredVictoryTowns']} requiredVictoryTowns
 * @property {number} warNumber
 * @property {TeamID} winner
 * @property {?number} conquestEndTime
 * @property {?number} conquestStartTime
 */
