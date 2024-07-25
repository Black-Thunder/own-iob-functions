'use strict';

var commonDefines = require("./commonDefines.js");
var commonFunctions = require("./commonFunctions.js");

const airPurifierPowerSuffix = ".ACTUAL";
const airPurifierIonizerSuffix = ".IS_IONIZER_ON";
const airPurifierFanSpeedSuffix = ".FAN_LEVEL";
const airPurifierFavoriteFanSpeedSuffix = ".FAVORITE_FAN_LEVEL";
const airPurifierFilterLifeSuffix = ".FILTER_LFIE";
const airPurifierOperationModeSuffix = ".OPERATION_MODE";
const airPurifierDisplayBrightnessSuffix = ".DISPLAY_BRIGHTNESS";

const AIRPURIFIER_OPERATIONMODES = {
    AUTO: 0,
    NIGHT: 1,
    FAVORITE: 2,
    MANUAL: 3
};

const AIRPURIFIER_MANUAL_FAN_LEVELS = {
    LEVEL1: 1, // entspricht Favorit Stufe 2
    LEVEL2: 2, // entspricht Favorit Stufe 10
    LEVEL3: 3 // entspricht Favorit Stufe 12
};

const AIRPURIFIER_FAVORITE_FAN_LEVELS = {
    LEVEL0: 0,
    LEVEL1: 1,
    LEVEL2: 2, // entspricht Manuell Stufe 1
    LEVEL3: 3,
    LEVEL4: 4,
    LEVEL5: 5,
    LEVEL6: 6,
    LEVEL7: 7,
    LEVEL8: 8,
    LEVEL9: 9,
    LEVEL10: 10, // entspricht Manuell Stufe 2
    LEVEL11: 11,
    LEVEL12: 12, // entspricht Manuell Stufe 3
    LEVEL13: 13,
    LEVEL14: 14
};

const AIRPURIFIER_DISPLAY_BRIGHTNESS = {
    OFF: 0,
    DIMMED: 1,
    BRIGHT: 2
}

/**
* @param {any} room via Rooms
*/
function hasAirPurifier(room) {
    return commonDefines.ROOMS_WITH_AIR_PURIFIER.includes(room);
}

/**
* @param {string} room via Rooms
*/
function powerAirPurifierOn(log, setState, room) {
    if (!hasAirPurifier(room)) return;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    setState(deviceId + airPurifierPowerSuffix, true);
}

/**
* @param {string} room via Rooms
*/
function powerAirPurifierOff(log, setState, room) {
    if (!hasAirPurifier(room)) return;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    setState(deviceId + airPurifierPowerSuffix, false);
}

/**
* @param {string} room via Rooms
*/
function isAirPurifierPoweredOn(log, getState, room) {
    if (!hasAirPurifier(room)) return false;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    return getState(deviceId + airPurifierPowerSuffix).val;
}

/**
* @param {string} room via Rooms
* @param {boolean} enable
*/
function setAirPurifierIonizerState(log, setState, existsState, room, enable) {
    if (!hasAirPurifier(room)) return;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");

    if (existsState(deviceId + airPurifierIonizerSuffix)) {
        setState(deviceId + airPurifierIonizerSuffix, enable);
    }
}

/**
* @param {string} room via Rooms
* @param {any} mode via AIRPURIFIER_OPERATIONMODES
*/
function setAirPurifierOperationMode(log, setState, room, mode) {
    if (!hasAirPurifier(room)) return;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    setState(deviceId + airPurifierOperationModeSuffix, mode);
}

/**
* @param {string} room via Rooms
*/
function getAirPurifierOperationMode(log, getState, room) {
    if (!hasAirPurifier(room)) return -1;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    return getState(deviceId + airPurifierOperationModeSuffix).val;
}

/**
* @param {string} room via Rooms
* @param {number} speed via AIRPURIFIER_MANUAL_FAN_LEVELS
*/
function setAirPurifierManualFanSpeed(log, setState, room, speed) {
    if (!hasAirPurifier(room)) return;
    speed = commonFunctions.clamp(speed, 1, 3);
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    setState(deviceId + airPurifierFanSpeedSuffix, speed);
}

/**
* @param {string} room via Rooms
*/
function getAirPurifierManualFanSpeed(log, getState, room) {
    if (!hasAirPurifier(room)) return -1;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    return getState(deviceId + airPurifierFanSpeedSuffix).val;
}

/**
* @param {string} room via Rooms
* @param {number} speed via AIRPURIFIER_FAVORITE_FAN_LEVELS
*/
function setAirPurifierFavoriteFanSpeed(log, getObject, setState, room, speed) {
    if (!hasAirPurifier(room)) return;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    const maxFanLevel = getObject(deviceId + airPurifierFavoriteFanSpeedSuffix).common.max;
    speed = commonFunctions.clamp(speed, 0, maxFanLevel);
    setState(deviceId + airPurifierFavoriteFanSpeedSuffix, speed);
}

/**
* @param {string} room via Rooms
*/
function getAirPurifierFavoriteFanSpeed(log, getState, room) {
    if (!hasAirPurifier(room)) return -1;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    return getState(deviceId + airPurifierFavoriteFanSpeedSuffix).val;
}

/**
* @param {string} room via Rooms
*/
function getAirPurifierFilterLife(log, getState, room) {
    if (!hasAirPurifier(room)) return -1;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    return getState(deviceId + airPurifierFilterLifeSuffix).val;
}

/**
* @param {string} room via Rooms
* @param {number} bri via AIRPURIFIER_DISPLAY_BRIGHTNESS
*/
function setAirPurifierDisplayBrightness(log, setState, room, bri) {
    if (!hasAirPurifier(room)) return;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");

    // Sonderfall Air Purifier 3H: 0=Brightest, 2=Off -> daher umdrehen
    if (room == commonDefines.ROOMS.SCHLAFZIMMER) {
        bri = Math.abs(bri - 2);
    }

    setState(deviceId + airPurifierDisplayBrightnessSuffix, bri);
}

/**
* @param {string} room via Rooms
*/
function getAirPurifierDisplayBrightness(log, getState, room) {
    if (!hasAirPurifier(room)) return -1;
    const deviceId = getAirPurifierFromRoom(log, room).split(";");
    let bri = getState(deviceId + airPurifierDisplayBrightnessSuffix).val;

    // Sonderfall Air Purifier 3H: 0=Brightest, 2=Off -> daher umdrehen
    if (room == commonDefines.ROOMS.SCHLAFZIMMER) {
        bri = Math.abs(bri - 2);
    }

    return bri;
}

/**
* @param {string} room via Rooms
*/
function getAirPurifierDefaultFavFanSpeedDay(getState, room) {
    if (!hasAirPurifier(room)) return 0;
    return getState(`${commonDefines.idUserDataPrefix}AirPurifierControl.ScriptParamters.DefaultFavFanSpeedDay${room.replace(" ", "_")}`).val;
}

/**
* @param {string} room via Rooms
*/
function getAirPurifierFavFanSpeedNight(getState, room) {
    if (!hasAirPurifier(room)) return 0;
    return getState(`${commonDefines.idUserDataPrefix}AirPurifierControl.ScriptParamters.DefaultFavFanSpeedNight${room.replace(" ", "_")}`).val;
}

/**
* @param {string} room via Rooms
* @param {boolean} enable Activate/deactivate night mode
*/
function setAirPurifierNightMode(setState, room, enable) {
    if (!hasAirPurifier(room)) return;
    setState(`${commonDefines.idUserDataPrefix}AirPurifierControl.ScriptParamters.IsNightModeActive${room.replace(" ", "_")}`, enable);
}

/**
* @param {string} room via Rooms
*/
function getAirPurifierNightMode(getState, room) {
    if (!hasAirPurifier(room)) return false;
    return getState(`${commonDefines.idUserDataPrefix}AirPurifierControl.ScriptParamters.IsNightModeActive${room.replace(" ", "_")}`).val;
}

/**
* Bestimmt dynamisch die ID des Luftfilters im gewünschten Raum (erfasst alle unter alias.0.Devices.AirPurifier.* gemappten Geräte)
* @param {string} room via Rooms
* @param {boolean} [logging] Flag, if errors should be logged (default = true)
* @return {string}
*/
function getAirPurifierFromRoom($, log, room, logging = true) {
    var airPurifierId = "";
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Devices.AirPurifier.*.ACTUAL](rooms=${room})`).each(function (id) {
        id = id.replace(".ACTUAL", "");
        airPurifierId = id;
    });

    if (airPurifierId == "" && logging) {
        log(`getAirPurifierFromRoom(): Kein Luftfilter in Raum '${String(room)}'`, "error");
    }

    return airPurifierId;
}

module.exports = {
    AIRPURIFIER_OPERATIONMODES, AIRPURIFIER_MANUAL_FAN_LEVELS, AIRPURIFIER_FAVORITE_FAN_LEVELS, AIRPURIFIER_DISPLAY_BRIGHTNESS, hasAirPurifier, powerAirPurifierOn, powerAirPurifierOff,
    isAirPurifierPoweredOn, setAirPurifierIonizerState, setAirPurifierOperationMode, getAirPurifierOperationMode, setAirPurifierManualFanSpeed, getAirPurifierManualFanSpeed, setAirPurifierFavoriteFanSpeed,
    getAirPurifierFavoriteFanSpeed, getAirPurifierFilterLife, setAirPurifierDisplayBrightness, getAirPurifierDisplayBrightness, getAirPurifierDefaultFavFanSpeedDay, getAirPurifierFavFanSpeedNight, getAirPurifierNightMode,
    setAirPurifierNightMode, getAirPurifierFromRoom
};