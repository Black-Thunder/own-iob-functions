'use strict';

var dateTimeFunctions = require("/opt/iobroker/iobroker-data/modules/dateTimeFunctions.js");

/// alias: Sockets-struct:
//  Sockets
//      SocketName
//          CURRENT
//          SET
//          LAST_UPDATED
//          WORKING
//          ...

const aliasStatePrefix = "alias.0.Sockets.";
const powerSuffix = ".SET";
const connectionSuffix = ".WORKING";
const lastUpdateSuffix = ".LAST_UPDATED";

const PLUGS = {
    OSMOSEANLAGE: "ReverseOsmosisSystem",
    AQUARIUM_80CM_CO2: "Aquarium80.CO2",
    AQUARIUM_80CM_LUEFTER: "Aquarium80.Ventilation",
    AQUARIUM_DOOA_CO2: "AquariumDOOA30.CO2",
    TERRARIUM_ADA_LED_PANEL: "TerrariumADA.LEDPanel",
    TERRARIUM_NEPENTHES_LICHT: "TerrariumNepenthes.Lighting",
    PALUDARIUM_VERNEBLER: "Paludarium.Misting",
    PALUDARIUM_LUEFTER: "Paludarium.Ventilation",
    PALUDARIUM_WASSERPUMPE: "Paludarium.WaterPump",
    TABLET: "SmartHomeTabletCharger",
    MARKISE: "SunblindCharger"
}

/**
* @param {string} plug via PLUGS
* @param {number} [duration=-1] power off socket again after given amount of time (in seconds, default = -1) 
*/
function enablePlug(setState, setStateDelayed, plug, duration = -1) {
    const powerState = `${aliasStatePrefix}${plug}${powerSuffix}`;

    setState(powerState, true);

    if (duration > 0) {
        setStateDelayed(powerState, false, duration * 1000, true);
    }
}

/**
* @param {string} plug via PLUGS
*/
function disablePlug(setState, plug) {
    const powerState = `${aliasStatePrefix}${plug}${powerSuffix}`;
    setState(powerState, false);
}

/**
* @param {string} plug via PLUGS
* @return {boolean}
*/
function getPlugState(getState, plug) {
    const powerState = `${aliasStatePrefix}${plug}${powerSuffix}`;
    return getState(powerState).val;
}

/**
* @param {string} plug via PLUGS
* @return {boolean}
*/
function isPlugConnected(log, getState, compareTime, existsState, plug) {
    const connectionState = `${aliasStatePrefix}${plug}${connectionSuffix}`;

    if (existsState(connectionState)) {
        return getState(connectionState).val;
    }

    // Nicht jede Steckdose liefert connectionState direkt; Versuch über letztes Update
    const lastUpdateState = `${aliasStatePrefix}${plug}${lastUpdateSuffix}`;

    if (existsState(lastUpdateState)) {
        const lastUpdateDate = new Date(getState(lastUpdateState).val);

        if (lastUpdateDate == null) {
            log(`isPlugConnected(): Ermittlung des Zustands von '${plug}' fehlgeschlagen!`, "error");
            return false;
        }

        var oldestAllowedUpdateDate = new Date(lastUpdateDate);
        oldestAllowedUpdateDate = dateTimeFunctions.manipulateDate(oldestAllowedUpdateDate, 5); // letztes Update darf max. 5 Minuten her sein

        return compareTime(lastUpdateDate, oldestAllowedUpdateDate, "between");
    }

    log(`isPlugConnected(): Ermittlung des Zustands von '${plug}' fehlgeschlagen!`, "error");
    return false; // wenn gar nix geht
}

module.exports = {
    PLUGS, enablePlug, disablePlug, getPlugState, isPlugConnected
};