'use strict';

var commonDefines = require("/opt/iobroker/iobroker-data/modules/commonDefines.js");
var commonFunctions = require("/opt/iobroker/iobroker-data/modules/commonFunctions.js");

/// Fenster-/Türsensoren
const maxWindowSensors = 5;
const maxDoorSensors = 1;

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasWindowSensor(room) {
    var foundWindowSensor = false;
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Windows.*.ACTUAL](rooms=${room})`).each(function () {
        foundWindowSensor = true;
        return false; // frühzeitig rausspringen, da gefunden
    });

    return foundWindowSensor;
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isWindowOpened(log, getState, room) {
    if (!hasWindowSensor(room)) return false;
    const sensorId = getWindowSensorFromRoom(log, room);
    return sensorId != "" ? getState(`${sensorId}.ACTUAL`).val : false;
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
function hasDoorSensor(room) {
    var foundDoorSensor = false;
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Door.*.ACTUAL](rooms=${room})`).each(function () {
        foundDoorSensor = true;
        return false; // frühzeitig rausspringen, da gefunden
    });

    return foundDoorSensor;
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isDoorOpened(log, getState, room) {
    if (!hasDoorSensor(room)) return false;
    const sensorId = getDoorSensorFromRoom(log, room);
    return sensorId != "" ? getState(`${sensorId}.ACTUAL`).val : false;
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
    return 10 * 60 * 1000;
}
/// Ende Fenster-/Türsensoren

/// Bewegungsmelder
/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasMotionSensor(room) {
    var foundMotionSensor = false;
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Motion.*.ACTUAL](rooms=${room})`).each(function () {
        foundMotionSensor = true;
        return false; // frühzeitig rausspringen, da gefunden
    });

    return foundMotionSensor;
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isMotionDetected(log, getState, room) {
    if (!hasMotionSensor(room)) return false;
    const sensorId = getMotionSensorFromRoom(log, room);
    return sensorId != "" ? getState(`${sensorId}.ACTUAL`).val : false;
}

/**
* @param {string} room via Rooms
* @param {boolean} shouldOverride
*/
function setMotionSensorOverride(setState, room, shouldOverride) {
    if (!hasMotionSensor(room)) return;

    const idOverrideMotionSensor = `${commonDefines.idUserDataPrefix}LightingControl.OverrideMotionSensor${room.replace(" ", "_")}`;
    setState(idOverrideMotionSensor, shouldOverride);
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isMotionSensorOverridden(getState, room) {
    if (!hasMotionSensor(room)) return false;

    return getState(`${commonDefines.idUserDataPrefix}LightingControl.OverrideMotionSensor${room.replace(" ", "_")}`).val;
}
/// Ende Bewegungsmelder

/// Präsenzmelder
/**
* @param {string} room via ROOMS
* @return {boolean}
*/
function hasPresenceSensor(room) {
    var foundPresenceSensor = false;
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Presence.*.ACTUAL](rooms=${room})`).each(function () {
        foundPresenceSensor = true;
        return false; // frühzeitig rausspringen, da gefunden
    });

    return foundPresenceSensor;
}

/**
* @param {string} room via ROOMS
* @return {boolean}
*/
function isPresenceDetected(log, getState, room) {
    if (!hasPresenceSensor(room)) return false;
    const sensorId = getPresenceSensorFromRoom(log, room);
    return sensorId != "" ? getState(`${sensorId}.ACTUAL`).val : false;
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
function hasIlluminanceSensor(room) {
    var foundIlluminanceSensor = false;
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Luminance.*.ACTUAL](rooms=${room})`).each(function () {
        foundIlluminanceSensor = true;
        return false; // frühzeitig rausspringen, da gefunden
    });

    return foundIlluminanceSensor;
}

/**
* @param {string} room via Rooms
* @return {number} Maximale Helligkeit aller vorhandenen Sensoren
*/
function getBrightness(log, getState, room) {
    const sensorIds = getIlluminanceSensorFromRoom(log, room);
    let brightnessLevels = [];

    sensorIds.forEach(sensorId => {
        brightnessLevels.push(getState(`${sensorId}.ACTUAL`).val);
    });

    return brightnessLevels.length > 0 ? brightnessLevels.reduce((a, b) => Math.max(a, b), -Infinity) : - 1;
}
/// Ende Helligkeitssensor

/// Temperatur-/Luftfeuchtigkeitssensor
/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasTemperatureSensor(room) {
    var foundTemperatureSensor = false;
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Temperature.*.ACTUAL](functions=thermostatTemperatureSensors)(rooms=${room})`).each(function () {
        foundTemperatureSensor = true;
        return false; // frühzeitig rausspringen, da gefunden
    });

    return foundTemperatureSensor;
}

/**
* @param {string} room via Rooms
* @param {boolean} [useRounding=false] flag, if value should be rounded to 1 decimal place (default = false)
* @return {number}
*/
function getCurrentInsideTemperature(log, getState, room, useRounding = false) {
    if (!hasTemperatureSensor(room)) return -1;
    const sensorId = getTemperatureSensorFromRoom(log, room);
    var sensorValue = sensorId != "" ? getState(`${sensorId}.ACTUAL`).val : -1;
    if (useRounding) sensorValue = commonFunctions.roundValue(sensorValue, 1);
    return sensorValue;
}

/**
* @param {boolean} [useRounding=false] flag, if value should be rounded to 1 decimal place (default = false)
* @return {number}
*/
function getAllCurrentInsideTemperatures(log, getState, useRounding = false) {
    var temps = {};

    Object.values(commonDefines.ROOMS).forEach(room => {
        const temp = getCurrentInsideTemperature(log, getState, room);
        if (temp != -1) temps[room] = temp;
    });

    return temps;
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasHumidtySensor(room) {
    var foundHumiditySensor = false;
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Humidity.*.ACTUAL](functions=thermostatHumiditySensors)(rooms=${room})`).each(function () {
        foundHumiditySensor = true;
        return false; // frühzeitig rausspringen, da gefunden
    });

    return foundHumiditySensor;
}

/**
* @param {string} room via Rooms
* @param {boolean} [useRounding=false] flag, if value should be rounded to full integer (default = false)
* @return {number}
*/
function getCurrentInsideHumidity(log, getState, room, useRounding = false) {
    if (!hasHumidtySensor(room)) return -1;
    const sensorId = getHumiditySensorFromRoom(log, room);
    var sensorValue = sensorId != "" ? getState(`${sensorId}.ACTUAL`).val : -1;
    if (useRounding) sensorValue = commonFunctions.roundValue(sensorValue, 0);
    return sensorValue;
}
/// Ende Temperatur-/Luftfeuchtigkeitssensor

/**
* Bestimmt dynamisch die ID des Fenstersensors im gewünschten Raum (erfasst alle unter alias.0.Sensors.Windows.* gemappten Sensoren)
* @param {string} room via Rooms
* @param {boolean} [logging] Flag, if errors should be logged (default = true)
* @return {string}
*/
function getWindowSensorFromRoom(log, room, logging = true) {
    var windowSensorId = "";
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Windows.*.ACTUAL](rooms=${room})`).each(function (id) {
        id = id.replace(".ACTUAL", "");
        windowSensorId = id;
    });

    if (windowSensorId == "" && logging) {
        log(`getWindowSensorFromRoom(): Kein Fenstersensor in Raum '${String(room)}'`, "error");
    }

    return windowSensorId;
}

/**
* Bestimmt dynamisch die ID des Türsensors im gewünschten Raum (erfasst alle unter alias.0.Sensors.Door.* gemappten Sensoren)
* @param {string} room via Rooms
* @param {boolean} [logging] Flag, if errors should be logged (default = true)
* @return {string}
*/
function getDoorSensorFromRoom(log, room, logging = true) {
    var doorSensorId = "";

    if (room == "Wohnzimmer") room = "Balkon";  // paarweises Mapping der Balkontür
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Door.*.ACTUAL](rooms=${room})`).each(function (id) {
        id = id.replace(".ACTUAL", "");
        doorSensorId = id;
    });

    if (doorSensorId == "" && logging) {
        log(`getDoorSensorFromRoom(): Kein Tüsensor in Raum '${String(room)}'`, "error");
    }

    return doorSensorId;
}

/**
* Bestimmt dynamisch die IDs des Bewegungsmelders im gewünschten Raum (erfasst alle unter alias.0.Sensors.Motion.* gemappten Sensoren)
* @param {string} room via Rooms
* @param {boolean} [logging] Flag, if errors should be logged (default = true)
* @return {string}
*/
function getMotionSensorFromRoom(log, room, logging = true) {
    var motionSensorId = "";
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Motion.*.ACTUAL](rooms=${room})`).each(function (id) {
        id = id.replace(".ACTUAL", "");
        motionSensorId = id;
    });

    if (motionSensorId == "" && logging) {
        log(`getMotionSensorFromRoom(): Kein Bewegungsmelder in Raum '${String(room)}'`, "error");
    }

    return motionSensorId;
}

/**
* Bestimmt dynamisch die IDs der Präsenzmelder im gewünschten Raum (erfasst alle unter alias.0.Sensors.Presence.* gemappten Sensoren)
* @param {string} room via Rooms
* @param {boolean} [logging] Flag, if errors should be logged (default = true)
* @return {string}
*/
function getPresenceSensorFromRoom(log, room, logging = true) {
    var presenceSensorId = "";
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Presence.*.ACTUAL](rooms=${room})`).each(function (id) {
        id = id.replace(".ACTUAL", "");
        presenceSensorId = id;
    });

    if (presenceSensorId == "" && logging) {
        log(`getPresenceSensorFromRoom(): Kein Präsenzmelder in Raum '${String(room)}'`, "error");
    }

    return presenceSensorId;
}

/**
* Bestimmt dynamisch die IDs der Helligkeitssensoren im gewünschten Raum (erfasst alle unter alias.0.Sensors.Luminance.* gemappten Sensoren)
* @param {string} room via Rooms
* @param {boolean} [logging] Flag, if errors should be logged (default = true)
* @return {string[]}
*/
function getIlluminanceSensorFromRoom(log, room, logging = true) {
    var illuminanceSensorIds = [];
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Luminance.*.ACTUAL](rooms=${room})`).each(function (id) {
        id = id.replace(".ACTUAL", "");
        illuminanceSensorIds.push(id);
    });

    if (illuminanceSensorIds.length == 0 && logging) {
        log(`getIlluminanceSensorFromRoom(): Kein Helligkeitssensor in Raum '${String(room)}'`, "error");
    }

    return illuminanceSensorIds;
}

/**
* Bestimmt dynamisch die ID des Raumtemperatursensors im gewünschten Raum (erfasst alle unter alias.0.Sensors.Temperature.* gemappten Sensoren)
* @param {string} room via Rooms
* @param {boolean} [logging] Flag, if errors should be logged (default = true)
* @return {string}
*/
function getTemperatureSensorFromRoom(log, room, logging = true) {
    var temperatureSensorId = "";
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Temperature.*.ACTUAL](functions=thermostatTemperatureSensors)(rooms=${room})`).each(function (id) {
        id = id.replace(".ACTUAL", "");
        temperatureSensorId = id;
    });

    if (temperatureSensorId == "" && logging) {
        log(`getTemperatureSensorFromRoom(): Kein Raumtemperatursensor in Raum '${String(room)}'`, "error");
    }

    return temperatureSensorId;
}


/**
* Bestimmt dynamisch die ID des Raum-LF-Sensors im gewünschten Raum (erfasst alle unter alias.0.Sensors.Humidity.* gemappten Sensoren)
* @param {string} room via Rooms
* @param {boolean} [logging] Flag, if errors should be logged (default = true)
* @return {string}
*/
function getHumiditySensorFromRoom(log, room, logging = true) {
    var humiditySensorId = "";
    room = room.replace(/ /g, '_'); // Leerezeichen durch "_" ersetzen

    $(`state[state.id=alias.0.Sensors.Humidity.*.ACTUAL](functions=thermostatHumiditySensors)(rooms=${room})`).each(function (id) {
        id = id.replace(".ACTUAL", "");
        humiditySensorId = id;
    });

    if (humiditySensorId == "" && logging) {
        log(`getHumiditySensorFromRoom(): Kein Raum-LF-Sensor in Raum '${String(room)}'`, "error");
    }

    return humiditySensorId;
}


module.exports = {
    maxWindowSensors, maxDoorSensors, hasWindowSensor, hasDoorSensor, isWindowOpened, getRoomCountWithOpenWindow, getRoomsWithOpenWindow, isAnyWindowOpened,
    areAllWindowsOpened, isDoorOpened, getRoomCountWithOpenDoor, getRoomsWithOpenDoor, isAnyDoorOpened, areAllDoorsOpened, getOpenWarningTemperatureThreshold,
    getOpenWarningTimeThreshold, getOpenWarningTimeAirConditionerThreshold, hasMotionSensor, isMotionDetected, setMotionSensorOverride, isMotionSensorOverridden,
    hasPresenceSensor, isPresenceDetected, setPresenceSensorSensitivity,/*resetPresenceSensorDetectionState,*/ hasIlluminanceSensor, getBrightness, hasTemperatureSensor, getCurrentInsideTemperature, getAllCurrentInsideTemperatures, hasHumidtySensor, getCurrentInsideHumidity,
    getWindowSensorFromRoom, getDoorSensorFromRoom, getMotionSensorFromRoom, getPresenceSensorFromRoom, getIlluminanceSensorFromRoom, getTemperatureSensorFromRoom, getHumiditySensorFromRoom
};