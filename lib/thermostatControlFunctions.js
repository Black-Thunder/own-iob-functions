'use strict';

const commonDefines = require("./commonDefines.js");
const commonFunctions = require("./commonFunctions.js");
const sensorFunctions = require("./sensorFunctions.js");
const weatherSensorFunctions = require("./weatherSensorFunctions.js");

const THERMOSTAT_MODES = {
    AUTO: 0,
    MANUAL: 1,
    CLOSED: 2 // existiert so nicht bei den HMIP-Thermostaten, wird aber hier im Code simuliert (s. setThermostatMode())
}

const minThermostatTargetTemp = 8;
const maxThermostatTargetTemp = 28;

const defaultDayTemp = 21;
const defaultNightTemp = 19;

const idAliasThermostatPrefix = "alias.0.Devices.Thermostats.";

const idOperationModeSuffix = ".MODE";
const idIsApiLockedSuffix = ".IS_API_LOCKED";
const idCurrentTemperature = ".ACTUAL";
const idTargetTemperature = ".SET";
const idBatteryTemperature = ".BATTERY";

const idUserDataThermostatControlPrefix = `${commonDefines.idUserDataPrefix}ThermostatControl`
const idIsSummerModeActiveSuffix = ".SummerModeActive";

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function hasThermostat(room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return commonDefines.ROOMS_WITH_THERMOSTAT_EN.includes(room);
}

/**
* Modus eines einzelnen Thermostats setzen
* @param {string} room via Rooms
* @param {number} mode via ThermostatModes
*/
function setThermostatMode(log, existsState, getState, setState, compareTime, room, mode) {
    if (mode != THERMOSTAT_MODES.AUTO && mode != THERMOSTAT_MODES.MANUAL && mode != THERMOSTAT_MODES.CLOSED) {
        return;
    }

    room = commonFunctions.translateRoomNameToEnglish(room);
    const isSummerActive = isThermostatSummerActive(getState, room);

    // Nur wenn keine Sommerschaltung vorliegt
    if (!isSummerActive) {
        switch (mode) {
            // Hier kann der Modus direkt auf "AUTO" gesetzt werden. Soll-Temperatur muss danach erneut bestimmt und gesetzt werden
            case THERMOSTAT_MODES.AUTO:
                setThermostatModeDirectly(setState, room, mode);
                adjustThermostatTargetTemp(log, getState, setState, compareTime, room, sensorFunctions.getCurrentInsideTemperature(existsState, getState, room));
                break;
            // Hier muss der Modus auf "MANUAL" und die Solltemperatur aufg 5°C gesetzt werden
            case THERMOSTAT_MODES.CLOSED:
                setThermostatModeDirectly(setState, room, THERMOSTAT_MODES.MANUAL);
                setThermostatTargetTemperature(getState, setState, room, 5);
                break;
            // Hier kann der Modus direkt auf "MANUAL" gesetzt werden ohne weitere Anpassung
            case THERMOSTAT_MODES.MANUAL:
                setThermostatModeDirectly(setState, room, mode);
                break;
        }
    }
}

/**
* Passt die gewünschte Soll-Temperatur an die Innen- bzw. Außentemperatur an
* @param {string} room via Rooms
* @return {number}
*/
function getAdjustedTargetTemp(log, getState, compareTime, room, indoorTemp) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;

    // Die gewünschte Temperatur auslesen
    const scheduledTemp = getScheduledTargetTemp(log, getState, compareTime, room);

    // Maximalwert bestimmen
    const stateId = `${commonDefines.idUserDataPrefix}ThermostatControl.AutomaticTempAdjustmentLimit`;
    const maxAdjustmentLimit = getState(stateId).val;
    const maxAdjustedScheduledTemp = scheduledTemp + maxAdjustmentLimit;

    // Evtl. noch an Außentemperatur angleichen
    const adjustedScheduledTempOutdoor = adjustTargetTempToOutsideTemp(getState, scheduledTemp);

    // Evtl. noch an Innentemperatur angleichen
    var adjustedScheduledTempIndoor = adjustTargetTempToInsideTemp(getState, compareTime, adjustedScheduledTempOutdoor, room, indoorTemp);

    // Änderung der Soll-Temperatur begrenzen
    if (adjustedScheduledTempIndoor > maxAdjustedScheduledTemp) adjustedScheduledTempIndoor = maxAdjustedScheduledTemp;

    return adjustedScheduledTempIndoor;
}

/**
* Ermittelt die anhand der aktuellen Zeit gewünschten Soll-Temperatur
* @param {string} room
* @return {number}
*/
function getScheduledTargetTemp(log, getState, compareTime, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    const isDaytime = isThermostatDaytimeSchedule(getState, compareTime, room);
    const scheduledTemp = isDaytime ? getThermostatComfyTemp(log, getState, room) : getThermostatNightTemp(log, getState, room);

    return scheduledTemp;
}

/**
* Anhand der Außentemperatur die Soll-Temperatur evtl. absenken (Übergang Winter --> Frühjahr)
* @param {number} targetTemp
* @return {number}
*/
function adjustTargetTempToOutsideTemp(getState, targetTemp) {
    const outdoorTemp = weatherSensorFunctions.getCurrentOutsideTemperature(getState);

    // Wenn Außentemparatur weniger als 1°C unter der Soll-Temperatur liegt, die Soll-Temperatur um 1°C senken
    if ((targetTemp - 1) <= outdoorTemp) {
        targetTemp -= 1;
    }
    // Ansonten wenn Außentemparatur weniger als 3°C unter der Soll-Temperatur liegt, die Soll-Temperatur um 0.5°C senken
    else if ((targetTemp - 3) <= outdoorTemp) {
        targetTemp -= 0.5;
    }

    return targetTemp;
}

/**
* Anhand der Innentemperatur des jeweiligen Raums die Soll-Temperatur anpassen
* @param {number} targetTemp
* @param {string} room
* @return {number}
*/
function adjustTargetTempToInsideTemp(getState, compareTime, targetTemp, room, indoorTemp) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    const thermostatTemp = getCurrentThermostatTemp(getState, room); // Temperatur direkt am Ventil

    // Wenn reelle Temperatur bereits Soll-Temp erreicht hat, nichts anpassen
    if (indoorTemp >= targetTemp) {
        if (isThermostatDaytimeSchedule(getState, compareTime, room)) {
            return Math.round((thermostatTemp - 1) * 2) / 2; // tagsüber auf 1° unter Ventiltemperatur setzen, damit Heizung nicht ganz aus ist
        }

        return targetTemp; // nachts auf eingestellter Soll-Temperatur bleiben, damit nicht zu stark geheizt wird
    }

    const diffTemp = thermostatTemp - indoorTemp;
    var correctedTargetTemp = targetTemp + diffTemp;

    if (correctedTargetTemp < targetTemp) return targetTemp; // nicht nach unten korrigieren

    correctedTargetTemp = commonFunctions.clamp(correctedTargetTemp, minThermostatTargetTemp, maxThermostatTargetTemp); // Auf die maximalen Wertebereiche beschränken

    return Math.round(correctedTargetTemp * 2) / 2; // auf 0.5 runden
}

/// GET
/**
* @param {string} room
* @return {number}
*/
function getThermostatTargetTemp(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;
    const targetTemp = getState(`${idAliasThermostatPrefix}${room}${idTargetTemperature}`).val;
    const mode = getThermostatMode(getState, room);
    return mode == THERMOSTAT_MODES.CLOSED ? -1 : targetTemp;
}

/**
* @param {string} room
* @return {number}
*/
function getThermostatComfyTemp(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;

    try {
        const temperaturesJSON = JSON.parse(getState("0_userdata.0.ThermostatControl.TargetTemperatures").val);
        return temperaturesJSON.targetTemperatures.comfort[room];
    }
    catch {
        log(`getThermostatComfyTemp(${room}: Fehler beim Parsen des JSON!`, "error");
        return defaultDayTemp;
    }
}

/**
* @param {string} room
* @return {number}
*/
function getThermostatNightTemp(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;

    try {
        const temperaturesJSON = JSON.parse(getState("0_userdata.0.ThermostatControl.TargetTemperatures").val);
        return temperaturesJSON.targetTemperatures.night[room];
    }
    catch {
        log(`getThermostatNightTemp(${room}: Fehler beim Parsen des JSON!`, "error");
        return defaultNightTemp;
    }
}

/**
* @param {string} room
* @return {number}
*/
function getCurrentThermostatTemp(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;
    return getState(`${idAliasThermostatPrefix}${room}${idCurrentTemperature}`).val;
}

/**
* @param {string} room
* @return {number}
*/
function getThermostatMode(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;
    return getState(`${idAliasThermostatPrefix}${room}${idOperationModeSuffix}`).val;
}

/**
* @param {string} room
* @return {number}
*/
function getThermostatBattery(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;
    return getState(`${idAliasThermostatPrefix}${room}${idBatteryTemperature}`).val;
}
/// ENDE GET

/// SET
/**
* @param {string} room
* @param {number} temp
*/
function setThermostatTargetTemperature(getState, setState, room, temp) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room) || isThermostatSummerActive(getState, room)) return; // wenn Sommerschaltung aktiv, nichts setzen, sonst schaltet sich das Thermostat ein
    setState(`${idAliasThermostatPrefix}${room}${idTargetTemperature}`, temp);
}

/**
* @param {string} room
* @param {number} mode via ThermostatModes
*/
function setThermostatModeDirectly(setState, room, mode) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return;
    return setState(`${idAliasThermostatPrefix}${room}${idOperationModeSuffix}`, mode);
}

/**
* Alle Thermostate auf einen einheitlichen Modus setzen
* @param {number} mode via ThermostatModes
*/
function setAllThermostatsModes(getState, setState, getObject, mode) {
    var radiators = getObject("enum.functions.heating").common.members;

    for (let i = 0; i < radiators.length; i++) {
        setTimeout(() => {
            setThermostatMode(getState, setState, getObject, radiators[i], mode);
        }, 0);
    }
}

function adjustAllThermostatsTargetTemps(log, getState, setState, getObject, compareTime, indoorTemps) {
    var radiators = getObject("enum.functions.heating").common.members;

    for (let i = 0; i < radiators.length; i++) {
        setTimeout(() => {
            var room = commonFunctions.getAssignedRoomFromState(getObject, radiators[i]);
            room = commonFunctions.translateRoomNameToEnglish(room);
            adjustThermostatTargetTemp(log, getState, setState, compareTime, room, indoorTemps[room]);
        }, 0);
    }
}

/**
* @param {string} room via Rooms
*/
function adjustThermostatTargetTemp(log, getState, setState, compareTime, room, indoorTemp) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room) || getThermostatMode(getState, room) == THERMOSTAT_MODES.CLOSED || isThermostatSummerActive(getState, room)) return; // Heizung == AUS oder Sommermodus aktiv

    const currentTargetTemp = getThermostatTargetTemp(getState, room);
    const adjustedTargetTemp = getAdjustedTargetTemp(log, getState, compareTime, room, indoorTemp);

    if (adjustedTargetTemp != currentTargetTemp) {
        setThermostatTargetTemperature(getState, setState, room, adjustedTargetTemp);
    }
}
/// ENDE SET

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isThermostatLocked(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return false;
    return getState(`${idAliasThermostatPrefix}${room}${idIsApiLockedSuffix}`).val
}

/**
* @param {string} room via Rooms
* @return {boolean}
*/
function isThermostatSummerActive(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return false;
    return getState(`${idUserDataThermostatControlPrefix}${idIsSummerModeActiveSuffix}${room}`).val
}

/**
* Prüft, ob Tag- oder Nachtmodus aktiv ist basierend auf aktueller Uhrzeit
* @param {string} room via Rooms
* @return {boolean}
*/
function isThermostatDaytimeSchedule(getState, compareTime, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return false;

    var isDaytime = false;
    var currentDate = new Date();
    var currentDay = currentDate.getDay();
    var currentTime = currentDate.getHours() + ":" + currentDate.getMinutes();
    var isWorkday = (currentDay != 6 && currentDay != 0); // 6 = Samstag, 0 = Sonntag
    var scheduledTimes = getThermostatSchedulingTimes(getState, room, isWorkday);

    if (scheduledTimes == null) {
        return isDaytime;
    }

    isDaytime = compareTime(scheduledTimes[0], scheduledTimes[1], "between", currentTime);

    return isDaytime;
}

// Gibt den Zeitplan für ein spezielles Thermostat zurück; Format: ["StartTag", "StartNacht"]
/**
* @param {string} room via Rooms
* @param {boolean} isWorkday
* @return {string[]}
*/
function getThermostatSchedulingTimes(getState, room, isWorkday) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    var dayStart = getState(`${commonDefines.idUserDataPrefix}ThermostatControl.ScheduleDayStart${(isWorkday ? "Workday" : "Weekend")}${room}`).val;
    var nightStart = getState(`${commonDefines.idUserDataPrefix}ThermostatControl.ScheduleNightStart${(isWorkday ? "Workday" : "Weekend")}${room}`).val;

    return [dayStart, nightStart];
}

module.exports = {
    THERMOSTAT_MODES, hasThermostat, setThermostatMode, getAdjustedTargetTemp, getScheduledTargetTemp, adjustTargetTempToOutsideTemp, adjustTargetTempToInsideTemp,
    getThermostatTargetTemp, getThermostatComfyTemp, getThermostatNightTemp, getCurrentThermostatTemp, getThermostatMode,
    getThermostatBattery, setThermostatTargetTemperature, setThermostatModeDirectly, setAllThermostatsModes,
    adjustAllThermostatsTargetTemps, adjustThermostatTargetTemp, isThermostatLocked, isThermostatSummerActive, isThermostatDaytimeSchedule, getThermostatSchedulingTimes
};