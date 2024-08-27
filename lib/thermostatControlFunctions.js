'use strict';

const commonDefines = require("./commonDefines.js");
const commonFunctions = require("./commonFunctions.js");
const sensorFunctions = require("./sensorFunctions.js");
const weatherSensorFunctions = require("./weatherSensorFunctions.js");

const THERMOSTAT_MODES = {
    AUTO: 0,
    MANUAL: 1,
    CLOSED: 2 // existiert nativ so nicht bei den HMIP-Thermostaten, wird aber hier im Code simuliert (s. setThermostatMode())
}

const THERMOSTAT_WINDOW_STATES = {
    CLOSED: 0,
    OPEN: 1
}

const minThermostatTargetTemp = 5;
const maxThermostatTargetTemp = 30;
const minThermostatValveLevel = 0;
const maxThermostatValveLevel = 100;

const defaultDayTemp = 21;
const defaultNightTemp = 19;

const idAliasThermostatPrefix = "alias.0.Devices.Thermostats.";

const idOperationModeSuffix = ".MODE";
const idValveLevelSuffix = ".VALVE_LEVEL";
const idCurrentTemperature = ".ACTUAL";
const idTargetTemperature = ".SET";
const idBatteryVoltageTemperature = ".BATTERY_VOLTAGE";
const idWindowState = ".WINDOW_STATE";

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
    const isSummerActive = isThermostatSummerModeActive(getState, room);

    // Während Sommerschaltung immer "CLOSED" erzwingen
    if (isSummerActive) mode = THERMOSTAT_MODES.CLOSED;

    switch (mode) {
        // Hier kann der Modus direkt gesetzt werden. WINDOW_STATE wieder auf "CLOSED" setzen -> damit wird die vorher eingestellte Temperatur zurückgeschrieben
        // Danach neue Soll-Temperatur bestimmen (kurz verzögert)
        case THERMOSTAT_MODES.AUTO:
        case THERMOSTAT_MODES.MANUAL:
            setThermostatModeDirectly(setState, room, mode);
            setThermostatWindowState(getState, setState, room, THERMOSTAT_WINDOW_STATES.CLOSED);
            setTimeout(() => { adjustThermostatTargetTemp(log, getState, setState, compareTime, room, sensorFunctions.getCurrentInsideTemperature(existsState, getState, room)); }, 500);
            break;
        // Simulation des CLOSED Modus: Modus auf "MANUAL" und WINDOW_STATE auf "OPEN" setzen -> damit die Solltemperatur auf 5°C gesetzt (Einstellung im Gerät selbst)
        case THERMOSTAT_MODES.CLOSED:
            setThermostatModeDirectly(setState, room, THERMOSTAT_MODES.MANUAL);
            setThermostatWindowState(getState, setState, room, THERMOSTAT_WINDOW_STATES.OPEN);
            break;
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
    const scheduledTemp = isDaytime ? getThermostatDayTemp(log, getState, room) : getThermostatNightTemp(log, getState, room);

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
    return getState(`${idAliasThermostatPrefix}${room}${idTargetTemperature}`).val;
}

/**
* @param {string} room
* @return {number}
*/
function getThermostatDayTemp(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;

    try {
        const temperaturesJSON = JSON.parse(getState("0_userdata.0.ThermostatControl.TargetTemperatures").val);
        return temperaturesJSON.targetTemperatures.comfort[room];
    }
    catch {
        log(`getThermostatDayTemp(${room}: Fehler beim Parsen des JSON!`, "error");
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
function getThermostatBatteryVoltage(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;
    return getState(`${idAliasThermostatPrefix}${room}${idBatteryVoltageTemperature}`).val;
}

/**
* @param {string} room
* @return {number}
*/
function getThermostatValveLevel(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;
    return getState(`${idAliasThermostatPrefix}${room}${idValveLevelSuffix}`).val;
}

/**
* @param {string} room
* @return {number}
*/
function getThermostatWindowState(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return -1;
    return getState(`${idAliasThermostatPrefix}${room}${idWindowState}`).val;
}
/// ENDE GET

/// SET
/**
* @param {string} room
* @param {number} temp
*/
function setThermostatTargetTemperature(getState, setState, room, temp) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return;
    if (isThermostatSummerModeActive(getState, room)) temp = minThermostatTargetTemp; // wenn Sommerschaltung aktiv, immer Minimalsolltemperatur erzwingen, damit Heizung aus bleibt
    setState(`${idAliasThermostatPrefix}${room}${idTargetTemperature}`, temp);
}

/**
* @param {string} room
* @param {number} level
*/
function setThermostatValveLevel(getState, setState, room, level) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return;
    if (isThermostatSummerModeActive(getState, room)) level = minThermostatValveLevel; // wenn Sommerschaltung aktiv, immer Ventil ganz schließen erzwingen, damit Heizung aus bleibt
    level = commonFunctions.clamp(level, minThermostatValveLevel, maxThermostatValveLevel);
    setState(`${idAliasThermostatPrefix}${room}${idValveLevelSuffix}`, level);
}

/**
* @param {string} room
* @param {number} state via THERMOSTAT_WINDOW_STATES
*/
function setThermostatWindowState(getState, setState, room, state) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return;
    if (isThermostatSummerModeActive(getState, room)) state = THERMOSTAT_WINDOW_STATES.OPEN; // wenn Sommerschaltung aktiv, immer "WINDOW_OPEN" erzwingen, damit Heizung aus bleibt
    setState(`${idAliasThermostatPrefix}${room}${idWindowState}`, state);
}

/**
* @param {string} room via Rooms
* @param {boolean} isActive
*/
function setThermostatSummerMode(setState, room, isActive) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return;
    setState(`${idUserDataThermostatControlPrefix}${idIsSummerModeActiveSuffix}${room}`, isActive);
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

/**
* @param {number} indoorTemps
*/
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
* @param {number} indoorTemp
*/
function adjustThermostatTargetTemp(log, getState, setState, compareTime, room, indoorTemp) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room) || isThermostatSummerModeActive(getState, room) || (getThermostatWindowState(getState, room) == THERMOSTAT_WINDOW_STATES.OPEN)) return; // Heizung aus oder Sommermodus aktiv

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
function isThermostatSummerModeActive(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasThermostat(room)) return false;
    return getState(`${idUserDataThermostatControlPrefix}${idIsSummerModeActiveSuffix}${room}`).val;
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
    getThermostatTargetTemp, getThermostatDayTemp, getThermostatNightTemp, getCurrentThermostatTemp, getThermostatMode, getThermostatBatteryVoltage, getThermostatValveLevel, getThermostatWindowState,
    setThermostatTargetTemperature, setThermostatModeDirectly, setAllThermostatsModes, setThermostatValveLevel, setThermostatWindowState, setThermostatSummerMode,
    adjustAllThermostatsTargetTemps, adjustThermostatTargetTemp, isThermostatSummerModeActive, isThermostatDaytimeSchedule, getThermostatSchedulingTimes
};