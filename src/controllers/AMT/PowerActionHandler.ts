/*********************************************************************
* Copyright (c) Intel Corporation 2019
* SPDX-License-Identifier: Apache-2.0
* Description: Handler to execute a power action on amt device
**********************************************************************/

import { Response, Request } from "express";
import { logger as log } from "../../utils/logger";
import { IAmtHandler } from "../../models/IAmtHandler";
import { mpsMicroservice } from "../../mpsMicroservice";

import { wscomm, wsman, amt, DMTFPowerStates } from "../../utils/constants";
import { ErrorResponse } from "../../utils/amtHelper";

export class PowerActionHandler implements IAmtHandler {
  mpsService: mpsMicroservice;
  name: string;

  constructor(mpsService: mpsMicroservice) {
    this.name = "PowerAction";
    this.mpsService = mpsService;
  }

  async AmtAction(req: Request, res: Response) {
    try {
      let payload = req.body.payload;
      if (payload.guid) {
        if (payload.action) {
          let ciraconn = this.mpsService.mpsserver.ciraConnections[payload.guid];
          if (!isNaN(payload.action) && DMTFPowerStates.includes(parseInt(payload.action))) {
            if (ciraconn && ciraconn.readyState == "open") {
              var cred = await this.mpsService.db.getAmtPassword(payload.guid);
              var wsstack = new wsman(wscomm,payload.guid,16992,cred[0],cred[1],0,this.mpsService);
              var amtstack = new amt(wsstack);
              this.getBootData(payload.guid, payload.action, amtstack, res);
            } else {
              return res.status(404).send(ErrorResponse(404, `guid : ${payload.guid}`, "device"));
            }
          } else {
            log.error(`Invalid Power state change request for guid : ${JSON.stringify(req.body,null,2)}.`);
            return res.status(400).send(ErrorResponse(400,`Invalid Power state change request`));
          }
        } else {
          log.error(`Power action does not exists : ${JSON.stringify(req.body,null,2)}.`);
          return res.status(404).send(ErrorResponse(404, null, "action"));
        }
      } else {
        res.set({ "Content-Type": "application/json" });
        return res.status(404).send(ErrorResponse(404, null, "guid"));
      }
    } catch (error) {
      log.error(`Exception in Power action : ${error}`);
      return res.status(500).send(ErrorResponse(500, "Request failed during AMT Power action execution."));
    }
  }
  //Get AMT_BootSettingData
  getBootData(uuid, action, amtstack, res) {
    //TODO: Advanced Menu
    let amtPowerBootCapabilities;
    amtstack.Get("AMT_BootSettingData", (stack, name, response, status) => {
        if (status != 200) {
          log.error( `Power Action failed during PUT AMT_BootSettingData for guid : ${uuid}`
          );
          return res.status(status).send(ErrorResponse(status,"Power Action failed during GET AMT_BootSettingData."));
        }
        var r = response.Body;
        if (action == 999) {
          /*r["BIOSPause"] = AvdPowerDlg.BIOSPause;
            r["BIOSSetup"] = AvdPowerDlg.BIOSSetup;
            r["BootMediaIndex"] = AvdPowerDlg.BootMediaIndex;
            r["ConfigurationDataReset"] = AvdPowerDlg.ConfigurationDataReset;
            r["FirmwareVerbosity"] = AvdPowerDlg.FirmwareVerbosity;
            r["ForcedProgressEvents"] = AvdPowerDlg.ForcedProgressEvents;
            r["IDERBootDevice"] = AvdPowerDlg.IDERBootDevice; // 0 = Boot on Floppy, 1 = Boot on IDER
            r["LockKeyboard"] = AvdPowerDlg.LockKeyboard;
            r["LockPowerButton"] = AvdPowerDlg.LockPowerButton;
            r["LockResetButton"] = AvdPowerDlg.LockResetButton;
            r["LockSleepButton"] = AvdPowerDlg.LockSleepButton;
            r["ReflashBIOS"] = AvdPowerDlg.ReflashBIOS;
            r["UseIDER"] = AvdPowerDlg.UseIDER;
            r["UseSOL"] = AvdPowerDlg.UseSOL;
            r["UseSafeMode"] = AvdPowerDlg.UseSafeMode;
            r["UserPasswordBypass"] = AvdPowerDlg.UserPasswordBypass;
            if (r["SecureErase"]) { r["SecureErase"] = ((AvdPowerDlg.SecureErase) && (amtPowerBootCapabilities["SecureErase"] == true)); }
            */
        } else {
          r["BIOSPause"] = false;
          r["BIOSSetup"] = action > 99 && action < 104;
          r["BootMediaIndex"] = 0;
          r["ConfigurationDataReset"] = false;
          r["FirmwareVerbosity"] = 0;
          r["ForcedProgressEvents"] = false;
          r["IDERBootDevice"] = action == 202 || action == 203 ? 1 : 0; // 0 = Boot on Floppy, 1 = Boot on IDER
          r["LockKeyboard"] = false;
          r["LockPowerButton"] = false;
          r["LockResetButton"] = false;
          r["LockSleepButton"] = false;
          r["ReflashBIOS"] = false;
          r["UseIDER"] = action > 199 && action < 300;
          r["UseSOL"] = false; //TODO: Fix SOL if connected.  If we are looking at the terminal, turn on SOL.
          r["UseSafeMode"] = false;
          r["UserPasswordBypass"] = false;
          if (r["SecureErase"]) {
            r["SecureErase"] =
              action == 104 && amtPowerBootCapabilities["SecureErase"] == true;
          }
        }
        this.putBootData(uuid, action, amtstack, r, res);
      },
      0,
      1
    );
  }

  //Put AMT_BootSettingData
  putBootData(uuid, action, amtstack, bootSettingData, res) {
    amtstack.Put("AMT_BootSettingData", bootSettingData, (stack, name, response, status, tag) => {
        if (status != 200) {
          log.error(
            `Power Action failed during PUT AMT_BootSettingData for guid : ${uuid}`
          );
          return res.status(status).send(ErrorResponse(status,"Power Action failed during PUT AMT_BootSettingData."));
        }
        this.setBootConfRole(uuid, action, amtstack, res);
      },
      bootSettingData,
      1
    );
  }

  //SET BootConfigRole
  setBootConfRole(uuid, action, amtstack, res) {
    //ToDo: Advance options
    let idx_d24ForceBootDevice;
    amtstack.SetBootConfigRole(
      1,
      (stack, name, response, status) => {
        if (status != 200) {
          log.error(`Power Action failed during SetBootConfigRole for guid : ${uuid}`
          );
          return res.status(status).send(ErrorResponse(status,"Power Action failed during SetBootConfigRole."));
        }
        var bootSource = null;
        if (action == 999) {
          if (idx_d24ForceBootDevice.value > 0) {
            bootSource = ["Force CD/DVD Boot","Force PXE Boot", "Force Hard-drive Boot", "Force Diagnostic Boot"][idx_d24ForceBootDevice.value - 1];
          }
        } else {
          if (action == 300 || action == 301) {
            bootSource = "Force Diagnostic Boot";
          }
          if (action == 400 || action == 401) {
            bootSource = "Force PXE Boot";
          }
        }
        if (bootSource != null) {
          bootSource =
            '<Address xmlns="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2004/08/addressing</Address><ReferenceParameters xmlns="http://schemas.xmlsoap.org/ws/2004/08/addressing"><ResourceURI xmlns="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd">http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_BootSourceSetting</ResourceURI><SelectorSet xmlns="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd"><Selector Name="InstanceID">Intel(r) AMT: ' +
            bootSource +
            "</Selector></SelectorSet></ReferenceParameters>";
        }
        this.changeBootOrder(uuid, action, amtstack, bootSource, res);
      },
      0,
      1
    );
  }

  //Change BootOrder
  changeBootOrder(uuid, action, amtstack, bootSource, res) {
    amtstack.CIM_BootConfigSetting_ChangeBootOrder(
      bootSource,
      (stack, name, response, status) => {
        if (status != 200) {
          log.error(
            `Power Action failed during ChangeBootOrder for guid : ${uuid}`
          );
          return res
            .status(status)
            .send(
              ErrorResponse(
                status,
                "Power Action failed during ChangeBootOrder."
              )
            );
        }
        if ( action == 100 || action == 201 || action == 203 || action == 300 || action == 401 )
          action = 2; // Power up
        if ( action == 101 || action == 200 ||  action == 202 || action == 301 || action == 400 )
          action = 10; // Reset
        if (action == 11) {
          action = 10;
        }

        //TODO: Advanced power actions
        if (action == 104) action = 10; // Reset with Remote Secure Erase
        //if (action == 999) action = AvdPowerDlg.Action;
        //console.log('RequestPowerStateChange:' + action);

        if (action < 999) {
          this.powerStateChange(uuid, action, amtstack, res);
        } else {
          //TODO: Advanced options
        }
      }
    );
  }

  //Request Power Change
  powerStateChange(uuid, action, amtstack, res) {
    amtstack.RequestPowerStateChange(
      action,
      (stack, name, response, status) => {
        if (status == 200) {
          // log.info(`Power state change request successful for guid : ${uuid}`);
          return res.send(response);
        } else {
          log.error(`Power state change request failed for guid : ${uuid}`);
          return res
            .status(status)
            .send(ErrorResponse(status, "PowerStateChange request failed."));
        }
      }
    );
  }
}
