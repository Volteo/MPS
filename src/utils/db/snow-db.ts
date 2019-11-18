import * as path from "path";
import * as util from "util";
import * as CryptoJS from 'crypto-js';
import axios from 'axios';

import { configType } from "../../models/Config";
import { logger as log } from "../logger";
import { dataBase } from "./db";


export default class SnowDB extends dataBase {
  constructor(config: configType, datapath: string) {
    super(config, datapath)
  }

  async getAllGUIDS() {
    try {
      const whitelistPath = "/whitelisted"
      var resp = await axios({
        url: super.getConfig().snowUrl + whitelistPath,
        auth: {
          username: super.getConfig().snowAuthUsername,
          password: super.getConfig().snowAuthPassword
        }
      });

      return resp.data.result;
    }catch(error){
      log.error(`Exception in getAllGUIDS: ${error}`);
    }

    return [];
  }

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

  // No MPS password support in SNOW yet
  async CIRAAuth(guid, username, password, func) {
    try {
      var result = false;
      // var cred = await this.getCredentialsForGuid(guid);
      // if (cred && cred.mpsuser == username && cred.mpspass == password) {
      //   result = true;
    if (super.getConfig().useglobalmpscredentials) {
        if (super.getConfig().mpsusername == username && super.getConfig().mpspass == password) {
          result = true;
        }
      }
      if (func) func(result);
    } catch (error) {
      log.error(`Exception in CIRAAuth: ${error}`);
    }
  }

  async getAllAmtCredentials() {
    try {
      var resp = await axios({
        url: super.getConfig().snowUrl,
        params: {
          guid: ""
        },
        auth: {
          username: super.getConfig().snowAuthUsername,
          password: super.getConfig().snowAuthPassword
        }
      });

      var secret = super.getConfig().snowSecret

      Object.keys(resp.data.result).map(function (key) {
        var code = CryptoJS.AES.decrypt(resp.data.result[key].amtpass, secret);
        var decryptedMessage = code.toString(CryptoJS.enc.Utf8);
        resp.data.result[key].amtpass = decryptedMessage
        return key;
      }, 0);

      return resp.data.result;
    } catch (error){
        log.error(`Exception in getAmtPassword: ${error}`);
    }
    return {};
  }

  async getAmtPassword(uuid: string) {
    var result = ["admin", ""];
    try {
      var resp = await axios({
        url: super.getConfig().snowUrl,
        params: {
          guid: uuid
        },
        auth: {
          username: super.getConfig().snowAuthUsername,
          password: super.getConfig().snowAuthPassword
        }
      });

      var code = CryptoJS.AES.decrypt(resp.data.result[uuid].amtpass, super.getConfig().snowSecret);
      var decryptedMessage = code.toString(CryptoJS.enc.Utf8);

      if (resp) {
        result = [resp.data.result.user, decryptedMessage];
      }
    } catch (error) {
      log.error(`Exception in getAmtPassword: ${error}`);
    }
    return result;
  }
}
