import fs from "node:fs";
import path from "node:path";

import YAML from "yaml";

const CONFIG_FILE = path.resolve("data/config.yml");

// !! Blocking
if (!fs.existsSync(CONFIG_FILE)) {
  fs.copyFileSync(path.resolve("data/config.dist.yml"), CONFIG_FILE);
}
class Config {
  /** @type {?ConfigData} */
  _config = null;

  constructor() {
    // !! Blocking
    // !! Throws
    this.readConfig();
    if (process.env.NODE_ENV !== "test") {
      fs.watch(CONFIG_FILE, (event) => {
        if (event === "change") {
          console.info("Config changed. Reloading.");
          this.readConfig();
        }
      });
    }
  }

  get config() {
    if (this._config !== null) {
      return this._config;
    }
    throw new Error("Config not loaded yet");
  }

  readConfig = () => {
    // !! Blocking
    // !! Throws
    const content = fs.readFileSync(CONFIG_FILE, "utf8");
    // !! Throws
    const parsed = /** @type {ConfigData} */ (
      YAML.parse(content, { intAsBigInt: true })
    );
    /**
    if (parsed) {
      this.config = this.configUpdate(parsed);
    }
    */
    this._config = parsed;
  };

  save = () => {
    // !! Blocking
    // !! Throws
    fs.writeFile(
      CONFIG_FILE,
      YAML.stringify(this.config, { intAsBigInt: true }),
      () => {}
    );
  };

  /**
   * Update the config to use a new schema? I can't really tell what this does.
   * @deprecated I think this is no longer needed
   * @param {ConfigData} config
   * @returns {ConfigData}
   */
  configUpdate = (config) => {
    // @ts-ignore Old Schema
    if (config.accessComments) {
      for (const uid in config.access.users) {
        // @ts-ignore Old Schema
        config.access.users[uid] = {
          // @ts-ignore Old Schema
          acl: config.access.users[uid],
          // @ts-ignore Old Schema
          name: config.accessComments.users[uid] || "",
        };
      }
      config.access.discords = {};
      // @ts-ignore Old Schema
      for (const did in config.access.roles) {
        // @ts-ignore Old Schema
        const roles = config.access.roles[did];
        // @ts-ignore Old Schema
        config.access.discords[did] = {
          // @ts-ignore Old Schema
          name: config.accessComments.roles[did].name || "",
          // @ts-ignore Old Schema
          hiddenCode: "",
          // @ts-ignore Old Schema
          roles: {},
        };
        for (const rid in roles) {
          // @ts-ignore Old Schema
          config.access.discords[did].roles[rid] = {
            // @ts-ignore Old Schema
            name: config.accessComments.roles[did][rid] || "",
            // @ts-ignore Old Schema
            acl: config.access.roles[did][rid],
          };
        }
      }
      // @ts-ignore Old Schema
      delete config.access.roles;
      // @ts-ignore Old Schema
      delete config.accessComments;
    }

    return config;
  };
}

export default new Config();

/**
 * Access Entry
 * @typedef {object} AccessEntry
 * @property {string | null} name
 * @property {import("./ACLS.js").Access} acl
 */

/**
 * Access Records
 * @typedef {Record<string, AccessEntry>} AccessRecords
 */

/**
 * Discord Records
 * @typedef {object} DiscordRecord
 * @property {string} name
 * @property {string} hiddenCode
 * @property {AccessRecords} roles
 */

/**
 * Link Record
 * @typedef {object} LinkRecord
 * @property {string} href
 * @property {string} title
 */

/**
 * Config Basic
 * @typedef {object} ConfigBasic
 * @property {string} url
 * @property {string} title
 * @property {string} color
 * @property {LinkRecord[]} links
 */

/**
 * Config Access
 * @typedef {object} ConfigAccess
 * @property {AccessRecords} users
 * @property {Record<string, DiscordRecord>} discords
 */

/**
 * Config Discord
 * @typedef {object} ConfigDiscord
 * @property {string} key
 * @property {string} secret
 */

/**
 * Config Shard
 * @typedef {object} ConfigShard
 * @property {string} name
 * @property {string} url
 */

/**
 * Config Text
 * @typedef {object} ConfigText
 * @property {string} login
 * @property {string} accessDenied
 * @property {string} feedback
 * @property {string} contributors
 */

/**
 * Data included in the Config YAML file
 * @typedef {object} ConfigData
 * @property {ConfigBasic} basic
 * @property {ConfigAccess} access
 * @property {ConfigDiscord} discord
 * @property {ConfigShard} shard
 * @property {ConfigText} text
 */
