import * as path from "path";
import * as fs from "fs";
import * as util from "util";

import { configType } from "../../models/Config";
import { logger as log } from "../logger";
import { dataBase } from "./db";

const readFileAsync = util.promisify(fs.readFile);

export default class LocalDB extends dataBase {

  constructor(config: configType, datapath: string) {
    super(config, datapath)
  }

  async getAllCredentials() {
    var credentials = {};
    let credentialsFilePath = path.join(
      __dirname,
      "../../private/credentials.json"
    );
    try {
      if (fs.existsSync(credentialsFilePath)) {
        credentials = JSON.parse(
          await readFileAsync(credentialsFilePath, "utf8")
        );
      } else {
        log.debug(`File credentials.json does not exists ${credentialsFilePath}`);
      }
    } catch (error) {
      log.error(`Exception in getAllCredentials: ${error}`);
      return {};
    }
    return credentials;
  }

  async getCredentialsForGuid(guid) {
    var credentials = {};
    try {
      credentials = await this.getAllCredentials();
    } catch (error) {
      log.error(`Exception in getCredentialsForGuid: ${error}`);
      credentials = {};
    }
    return credentials[guid];
  }

  // get all credentials in credentials.json file
  async getAllAmtCredentials() {
    try {
      var cred = await this.getAllCredentials();
      // logger.debug(`All AMT credentials: ${JSON.stringify(cred, null, 4)}`);
      return cred;
    } catch (error) {
      log.error(`Exception in getAllAmtCredentials: ${error}`);
      return {};
    }
  }

  // Mock up code, real deployment must use proper data providers
  async getAllGUIDS() {
    let guids = [];
    let guidsFilePath = path.join(__dirname, "../../private/guids.json");
    try {
      if (fs.existsSync(guidsFilePath)) {
        guids = JSON.parse(await readFileAsync(guidsFilePath, "utf8"));
      } else {
        log.debug(`File guids.json does not exists ${guidsFilePath}`);
      }
    } catch (error) {
      log.error(`Exception in getAllGUIDS: ${error}`);
    }
    return guids;
  }

  // check if a GUID is allowed to connect
  async IsGUIDApproved(guid, func) {
    try {
      var result = false;
      if (super.getConfig() && super.getConfig().usewhitelist) {
        var guids = await this.getAllGUIDS();
        if (guids.indexOf(guid) >= 0) {
          result = true;
        }
      } else {
        result = true;
      }
      if (func) {
        func(result);
      }
    } catch (error) {
      log.error(`Exception in IsGUIDApproved: ${error}`);
    }
  }

  // CIRA auth
  async CIRAAuth(guid, username, password, func) {
    try {
      var result = false;
      var cred = await this.getCredentialsForGuid(guid);
      if (cred && cred.mpsuser == username && cred.mpspass == password) {
        result = true;
      } else if (super.getConfig().useglobalmpscredentials) {
        if (super.getConfig().mpsusername == username && super.getConfig().mpspass == password) {
          result = true;
        }
      }
      if (func) func(result);
    } catch (error) {
      log.error(`Exception in CIRAAuth: ${error}`);
    }
  }

  async getAmtPassword(uuid) {
    var result = ["admin", ""];
    try {
      var amtcreds = await this.getCredentialsForGuid(uuid);
      if (amtcreds) {
        result = [amtcreds.amtuser, amtcreds.amtpass];
      }
    } catch (error) {
      log.error(`Exception in getAmtPassword: ${error}`);
    }
    return result;
  }
}