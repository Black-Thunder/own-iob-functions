'use strict';

const commonDefines = require("./commonDefines.js");
const commonFunctions = require("./commonFunctions.js");

/// Fenster-/Türsensoren
const maxWindowSensors = 5;
const maxDoorSensors = 1;

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasWindowSensor(existsState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return existsState(`${commonDefines.idAliasPrefix}Sensors.Windows.${room}.ACTUAL`);
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isWindowOpened(existsState, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasWindowSensor(existsState, room)) return false;

    const sensorId = `${commonDefines.idAliasPrefix}Sensors.Windows.${room}`;
    return getState(`${sensorId}.ACTUAL`).val;
}

/**
* @return {number}
*/
function getRoomCountWithOpenWindow(getState) {
    return getState(`${commonDefines.idUserDataPrefix}WindowControl.OpenCount`).val;
}


/**
* @return {string}
*/
function getRoomsWithOpenWindow(getState) {
    return getState(`${commonDefines.idUserDataPrefix}WindowControl.OpenRoomNames`).val;
}

/**
* @return {boolean}
*/
function isAnyWindowOpened(getState) {
    return getRoomCountWithOpenWindow(getState) > 0;
}

/**
* @return {boolean}
*/
function areAllWindowsOpened(getState) {
    return getRoomCountWithOpenWindow(getState) == maxWindowSensors;
}


/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasDoorSensor(existsState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return existsState(`${commonDefines.idAliasPrefix}Sensors.Door.${room}.ACTUAL`);
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isDoorOpened(existsState, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasDoorSensor(existsState, room)) return false;

    const sensorId = `${commonDefines.idAliasPrefix}Sensors.Door.${room}`;
    return getState(`${sensorId}.ACTUAL`).val;
}

/**
* @return {number}
*/
function getRoomCountWithOpenDoor(getState) {
    return getState(`${commonDefines.idUserDataPrefix}DoorControl.OpenCount`).val;
}

/**
* @return {string}
*/
function getRoomsWithOpenDoor(getState) {
    return getState(`${commonDefines.idUserDataPrefix}DoorControl.OpenRoomNames`).val;
}

/**
* @return {boolean}
*/
function isAnyDoorOpened(getState) {
    return getRoomCountWithOpenDoor(getState) > 0;
}

/**
* @return {boolean}
*/
function areAllDoorsOpened(getState) {
    return getRoomCountWithOpenDoor(getState) == maxDoorSensors;
}

/**
* @return {number} Wert (in °C), ab dem bei längerem offenen Fenster/Tür gewarnt werden soll
*/
function getOpenWarningTemperatureThreshold(isAstroDay) {
    return isAstroDay() ? 15 : 5;
}

/**
* @return {number} Zeit (in ms), nach der bei längerem offenen Fenster/Tür gewarnt werden soll
*/
function getOpenWarningTimeThreshold(isAstroDay) {
    return isAstroDay() ? 30 * 60 * 1000 : 60 * 60 * 1000;
}

/**
* @return {number} Zeit (in ms), nach der bei längerem offenen Fenster/Tür und laufender Klimaanlage gewarnt werden soll
*/
function getOpenWarningTimeAirConditionerThreshold() {
    return 15 * 60 * 1000;
}
/// Ende Fenster-/Türsensoren

/// Bewegungsmelder
/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasMotionSensor(existsState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return existsState(`${commonDefines.idAliasPrefix}Sensors.Motion.${room}.ACTUAL`);
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isMotionDetected(existsState, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasMotionSensor(existsState, room)) return false;

    const sensorId = `${commonDefines.idAliasPrefix}Sensors.Motion.${room}`;
    return getState(`${sensorId}.ACTUAL`).val;
}

/**
* @param {string} room via Rooms
* @param {boolean} shouldOverride
*/
function setMotionSensorOverride(existsState, setState, room, shouldOverride) {
    if (!hasMotionSensor(existsState, room)) return;

    const idOverrideMotionSensor = `${commonDefines.idUserDataPrefix}LightingControl.OverrideMotionSensor${room.replace(" ", "_")}`;
    setState(idOverrideMotionSensor, shouldOverride);
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isMotionSensorOverridden(existsState, getState, room) {
    if (!hasMotionSensor(existsState, room)) return false;

    return getState(`${commonDefines.idUserDataPrefix}LightingControl.OverrideMotionSensor${room.replace(" ", "_")}`).val;
}
/// Ende Bewegungsmelder

/// Präsenzmelder
/**
* @param {string} room via ROOMS
* @return {boolean}
*/
function hasPresenceSensor(existsState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return existsState(`${commonDefines.idAliasPrefix}Sensors.Presence.${room}.ACTUAL`);
}

/**
* @param {string} room via ROOMS
* @return {boolean}
*/
function isPresenceDetected(existsState, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasPresenceSensor(existsState, room)) return false;

    const sensorId = `${commonDefines.idAliasPrefix}Sensors.Presence.${room}`;
    return getState(`${sensorId}.ACTUAL`).val;
}

/**
* @param {string} room via ROOMS
*/
/*async function resetPresenceSensorDetectionState(log, room) {
    var presenceSensorId = -1;

    switch (room) {
        case commonDefines.ROOMS.KUECHE: presenceSensorId = 95; break;
        default: log(`resetPresenceSensorDetectionState(): Kein Präsenzmelder in ${room} bekannt.`, "error"); return false;
    }

    const options = {
        url: `http://192.168.2.3:8080/api/90E336BF6D/sensors/${presenceSensorId}/config`,
        body: `{"resetpresence" : true}`
    }

    request.put(options, function (error, response, body) {
        if (error) {
            log(`resetPresenceSensorDetectionState(): Kommando an Präsenzmelder ${room} fehlgeschlagen: ${error}`, "error");
        } else {
            if (body.includes("success")) {
                log(`resetPresenceSensorDetectionState(): Präsenzmelder ${room} erfolgreich zurückgesetzt.`, "info")
            }
            else {
                log(`resetPresenceSensorDetectionState(): Kommando an Präsenzmelder ${room} erfolgreich, aber unerwartete Antwort: ${body}`, "error");
            }
        }
    });
}*/

/**
* @param {string} room via ROOMS
*/
async function setPresenceSensorSensitivity(log, room, sensitivity) {
    var presenceSensorId = -1;

    switch (room) {
        case commonDefines.ROOMS.KUECHE: presenceSensorId = 108; break;
        default: log(`setPresenceSensorSensitivity(): Kein Präsenzmelder in ${room} bekannt.`, "error"); return false;
    }

    const options = {
        url: `http://192.168.2.3:8080/api/90E336BF6D/sensors/${presenceSensorId}/config`,
        body: `{"sensitivity" : ${sensitivity}}`
    }

    request.put(options, function (error, response, body) {
        if (error) {
            log(`setPresenceSensorSensitivity(): Kommando an Präsenzmelder ${room} fehlgeschlagen: ${error}`, "error");
        } else {
            if (body.includes("success")) {
                log(`setPresenceSensorSensitivity(): Präsenzmelder ${room} erfolgreich auf Sensitivität ${sensitivity} gesetzt.`, "info")
            }
            else {
                log(`setPresenceSensorSensitivity(): Kommando an Präsenzmelder ${room} erfolgreich, aber unerwartete Antwort: ${body}`, "error");
            }
        }
    });
}
/// Ende Präsenzmelder

/// Helligkeitssensor
/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasIlluminanceSensor(existsState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return existsState(`${commonDefines.idAliasPrefix}Sensors.Luminance.${room}.ACTUAL`);
}

/**
* @param {string} room via Rooms
* @return {number} Maximale Helligkeit aller vorhandenen Sensoren
*/
function getBrightness(existsState, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasIlluminanceSensor(existsState, room)) return false;

    // Sonderfall: 2 Sensoren vorhanden, Maximum bestimmen
    if (room == commonDefines.ROOMS_EN.KUECHE) {
        let brightnessLevels = [];
        brightnessLevels.push(getState(`${commonDefines.idAliasPrefix}Sensors.Luminance.${room}.ACTUAL`).val);
        brightnessLevels.push(getState(`${commonDefines.idAliasPrefix}Sensors.Luminance.${room}PresenceSensor.ACTUAL`).val);

        return brightnessLevels.length > 0 ? brightnessLevels.reduce((a, b) => Math.max(a, b), -Infinity) : - 1;
    }
    else {
        const sensorId = `${commonDefines.idAliasPrefix}Sensors.Luminance.${room}`;
        return getState(`${sensorId}.ACTUAL`).val;
    }
}
/// Ende Helligkeitssensor

/// Temperatur-/Luftfeuchtigkeitssensor
/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasTemperatureSensor(existsState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return existsState(`${commonDefines.idAliasPrefix}Sensors.Temperature.${room}.ACTUAL`);
}

/**
* @param {string} room via Rooms
* @param {boolean} [useRounding=false] flag, if value should be rounded to 1 decimal place (default = false)
* @return {number}
*/
function getCurrentInsideTemperature(existsState, getState, room, useRounding = false) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasTemperatureSensor(existsState, room)) return false;

    const sensorId = `${commonDefines.idAliasPrefix}Sensors.Temperature.${room}`;
    var sensorValue = getState(`${sensorId}.ACTUAL`).val;
    if (useRounding) sensorValue = commonFunctions.roundValue(sensorValue, 1);
    return sensorValue;
}

/**
* @param {boolean} [useRounding=false] flag, if value should be rounded to 1 decimal place (default = false)
* @return {number}
*/
function getAllCurrentInsideTemperatures(existsState, getState, useRounding = false) {
    var temps = {};

    Object.values(commonDefines.ROOMS_EN).forEach(room => {
        const temp = getCurrentInsideTemperature(existsState, getState, room, useRounding);
        if (temp != -1) temps[room] = temp;
    });

    return temps;
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasHumidtySensor(existsState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return existsState(`${commonDefines.idAliasPrefix}Sensors.Humidity.${room}.ACTUAL`);
}

/**
* @param {string} room via Rooms
* @param {boolean} [useRounding=false] flag, if value should be rounded to full integer (default = false)
* @return {number}
*/
function getCurrentInsideHumidity(existsState, getState, room, useRounding = false) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasHumidtySensor(existsState, room)) return false;

    const sensorId = `${commonDefines.idAliasPrefix}Sensors.Humidity.${room}`;
    var sensorValue = getState(`${sensorId}.ACTUAL`).val;
    if (useRounding) sensorValue = commonFunctions.roundValue(sensorValue, 1);
    return sensorValue;
}
/// Ende Temperatur-/Luftfeuchtigkeitssensor

module.exports = {
    maxWindowSensors, maxDoorSensors, hasWindowSensor, hasDoorSensor, isWindowOpened, getRoomCountWithOpenWindow, getRoomsWithOpenWindow, isAnyWindowOpened,
    areAllWindowsOpened, isDoorOpened, getRoomCountWithOpenDoor, getRoomsWithOpenDoor, isAnyDoorOpened, areAllDoorsOpened, getOpenWarningTemperatureThreshold,
    getOpenWarningTimeThreshold, getOpenWarningTimeAirConditionerThreshold, hasMotionSensor, isMotionDetected, setMotionSensorOverride, isMotionSensorOverridden,
    hasPresenceSensor, isPresenceDetected, setPresenceSensorSensitivity,/*resetPresenceSensorDetectionState,*/ hasIlluminanceSensor, getBrightness, hasTemperatureSensor,
    getCurrentInsideTemperature, getAllCurrentInsideTemperatures, hasHumidtySensor, getCurrentInsideHumidity
};