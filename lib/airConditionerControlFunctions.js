'use strict';

var commonDefines = require("./commonDefines.js");
var commonFunctions = require("./commonFunctions.js");
var presenceFunctions = require("./presenceFunctions.js");

const idAliasAirConditionerPrefix = "alias.0.Devices.AirConditioner.";

const idModeSuffix = ".MODE";
const idPowerSuffix = ".POWER";
const idTargetTempSuffix = ".SET";
const idFanSpeedSuffix = ".SPEED";
const idVaneVerticalSuffix = ".VANE_VERTICAL";
const idVaneHorizontalSuffix = ".VANE_HORIZONTAL";
const idRoomTempSuffix = ".ACTUAL";

const minDefaultACTargetCoolTempPresent = 23.5; // Standartwert der minimalen Soll-Temperatur (Kühlen), die bei Anwesenheit automatisch eingestellt werden soll
const maxDefaultACTargetHeatTempPresent = 22.0; // Standartwert der maximalen Soll-Temperatur (Heizen), die bei Anwesenheit automatisch eingestellt werden soll
const ACTargetTempAdjustmentStep = 0.5;

const AIR_CONDITIONING_MODES = {
    HEAT: { value: 1, name: "Heizen" },
    DRY: { value: 2, name: "Entfeuchten" },
    COOL: { value: 3, name: "Kühlen" },
    VENT: { value: 7, name: "Lüften" },
    AUTO: { value: 8, name: "Automatik" },
    UNDEF: { value: -1, name: "UNDEF" }
};

const AIR_CONDITIONING_FAN_SPEEDS = {
    AUTO: { value: 0, name: "Automatisch" },
    LOWEST: { value: 1, name: "Minimal" },
    LOW: { value: 2, name: "Schwach" },
    MEDIUM: { value: 3, name: "Mittel" },
    HIGH: { value: 4, name: "Stark" },
    MAX: { value: 5, name: "Maximal" },
    UNDEF: { value: -1, name: "UNDEF" }
};

const AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS = {
    AUTO: { value: 0, name: "Automatisch" },
    TOPMOST: { value: 1, name: "Ganz oben" },
    UP: { value: 2, name: "Oben" },
    MIDDLE: { value: 3, name: "Mitte" },
    DOWN: { value: 4, name: "Unten" },
    BOTTOMMOST: { value: 5, name: "Ganz unten" },
    SWING: { value: 7, name: "Swing" },
    UNDEF: { value: -1, name: "UNDEF" }
};

const AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS = {
    AUTO: { value: 0, name: "Automatisch" },
    LEFTMOST: { value: 1, name: "Ganz links" },
    LEFT: { value: 2, name: "Links" },
    MIDDLE: { value: 3, name: "Mitte" },
    RIGHT: { value: 4, name: "Rechts" },
    RIGHTMOST: { value: 5, name: "Ganz rechts" },
    FIFTY_FIFTY: { value: 8, name: "50/50" },
    SWING: { value: 12, name: "Swing" },
    UNDEF: { value: -1, name: "UNDEF" }
};

/**
* @param {string} room via Rooms
*/
function hasAirConditioner(room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    return commonDefines.ROOMS_WITH_AIR_CONDITIONING_EN.includes(room);
}

function adjustAllACTargetTempsToRoomTemp(log, getState, setState, existsState, indoorTemps) {
    commonDefines.ROOMS_WITH_AIR_CONDITIONING.forEach(room => {
        setTimeout(() => {
            room = commonFunctions.translateRoomNameToEnglish(room);
            adjustACTargetTempToRoomTemp(log, getState, setState, existsState, room, indoorTemps[room], true);
        }, 0);
    });
}

/**
* Adjusts the target temperature of the AC units automatically depending on the current operation mode and room temperature 
* @param {string} room via Rooms
* @param {number} roomTemp Actual room temperature
* @param {boolean} [isInitialRun] Flag, if this is the first adjustment or the temperature limit was changed
*/
function adjustACTargetTempToRoomTemp(log, getState, setState, existsState, room, roomTemp, isInitialRun) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    const mode = getAirConditionerOperationMode(log, getState, room);

    if (!commonFunctions.isRoomIndoor(room) || !hasAirConditioner(room) || !isAirConditionerEnabled(log, getState, room) || (mode != AIR_CONDITIONING_MODES.COOL && mode != AIR_CONDITIONING_MODES.HEAT)) return;

    const isCooling = mode == AIR_CONDITIONING_MODES.COOL;
    var targetTempLimit = getACTargetTempLimit(getState, existsState, room, isCooling);
    const currentTarget = getAirConditionerTargetTemperature(log, getState, room);
    const acRoomTemp = getAirConditionerRoomTemperature(getState, room);

    // Raumtemperatur bei Kühlen/Heizen als Minimum/Maximum von Gerätetemperatur und Sensortemperatur im Raum festlegen
    roomTemp = isCooling ? Math.min(acRoomTemp, roomTemp) : Math.max(acRoomTemp, roomTemp);

    // Anpassung für Modus "Kühlen"
    if (isCooling) {
        if (!presenceFunctions.isAnybodyAtHome(getState)) targetTempLimit += 1;

        // Wenn händisch eine kleinere Soll-Temperatur als das Limit eingestellt wurde, nicht wieder überschreiben (außer bei der ersten Anpassung nach dem Einschalten bzw. Verändern des Limits)
        if (!isInitialRun && currentTarget < targetTempLimit) return;

        // Soll-Temp schrittweise um 'targetTempAdjustmentStep'°C senken, bis untere Grenze erreicht
        var newTargetTemp = roomTemp - ACTargetTempAdjustmentStep;
        newTargetTemp = Math.round(newTargetTemp * 2) / 2; // auf 0.5 runden

        // Niemals nach oben korrigieren (außer bei der ersten Anpassung nach dem Einschalten)
        if (isInitialRun && newTargetTemp > currentTarget) newTargetTemp = currentTarget;

        // Verhindert, dass die untere Grenze nie erreicht wird, wenn sich die Raumtemperatur mit der eingestellten Soll-Temperatur nicht weiter senken lässt (nicht bei der ersten Anpassung)
        if (!isInitialRun && newTargetTemp == currentTarget) newTargetTemp -= ACTargetTempAdjustmentStep;

        // Bei minTargetTemp deckeln
        if (newTargetTemp < targetTempLimit) newTargetTemp = targetTempLimit;
    }
    // Anpassung für Modus "Heizen"
    else {
        if (!presenceFunctions.isAnybodyAtHome(getState)) targetTempLimit -= 1;

        // Wenn händisch eine höhere Soll-Temperatur als das Limit eingestellt wurde, nicht wieder überschreiben (außer bei der ersten Anpassung nach dem Einschalten)
        if (!isInitialRun && currentTarget > targetTempLimit) return;

        // Soll-Temp schrittweise um 'targetTempAdjustmentStep'°C erhöhen, bis obere Grenze erreicht
        var newTargetTemp = roomTemp + ACTargetTempAdjustmentStep;
        newTargetTemp = Math.round(newTargetTemp * 2) / 2; // auf 0.5 runden

        // Niemals nach unten korrigieren (außer bei der ersten Anpassung nach dem Einschalten)
        if (isInitialRun && newTargetTemp < currentTarget) newTargetTemp = currentTarget;

        // Verhindert, dass die obere Grenze nie erreicht wird, wenn sich die Raumtemperatur mit der eingestellten Soll-Temperatur nicht weiter erhöhen lässt (nicht bei der ersten Anpassung)
        if (!isInitialRun && newTargetTemp == currentTarget) newTargetTemp += ACTargetTempAdjustmentStep;

        // Bei maxTargetTemp deckeln
        if (newTargetTemp > targetTempLimit) newTargetTemp = targetTempLimit;
    }

    // Neue Zieltemepratur setzen
    setAirConditionerTargetTemperature(log, getState, setState, room, newTargetTemp);
}

/**
* @param {string} room via Rooms
* @param {boolean} forCooling
* @return {number} Limit for automatic temperature adjustment depending on AC operation mode
*/
function getACTargetTempLimit(getState, existsState, room, forCooling) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (forCooling) {
        const stateId = `${commonDefines.idUserDataPrefix}AirConditioningControl.AutomaticMinCoolTemp${room.replace(" ", "_")}`;
        return existsState(stateId) ? getState(stateId).val : minDefaultACTargetCoolTempPresent;
    }

    const stateId = `${commonDefines.idUserDataPrefix}AirConditioningControl.AutomaticMaxHeatTemp${room.replace(" ", "_")}`;
    return existsState(stateId) ? getState(stateId).val : maxDefaultACTargetHeatTempPresent;
}

/**
* @param {string} room via Rooms
* @param {number} value Operation mode to be set (via AIR_CONDITIONING_MODES)
*/
function setAirConditionerOperationMode(log, getState, setState, room, value) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`setAirConditionerOperationMode(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return;
    }

    const currentMode = getAirConditionerOperationMode(log, getState, room);

    if (currentMode.value != value) {
        setState(idAliasAirConditionerPrefix + room.replace(" ", "") + idModeSuffix, value);
    }
}

/**
* @param {string} room via Rooms
* @return {object} Current AC operation mode as enum (via AIR_CONDITIONING_MODES)
*/
function getAirConditionerOperationMode(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`getAirConditionerOperationMode(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return AIR_CONDITIONING_MODES.UNDEF;
    }

    const modeValue = getState(idAliasAirConditionerPrefix + room.replace(" ", "") + idModeSuffix).val;

    switch (modeValue) {
        case AIR_CONDITIONING_MODES.HEAT.value: return AIR_CONDITIONING_MODES.HEAT;
        case AIR_CONDITIONING_MODES.DRY.value: return AIR_CONDITIONING_MODES.DRY;
        case AIR_CONDITIONING_MODES.COOL.value: return AIR_CONDITIONING_MODES.COOL;
        case AIR_CONDITIONING_MODES.VENT.value: return AIR_CONDITIONING_MODES.VENT;
        case AIR_CONDITIONING_MODES.AUTO.value: return AIR_CONDITIONING_MODES.AUTO;
        default: return AIR_CONDITIONING_MODES.UNDEF;
    }
}

/**
* @param {string} room via Rooms
* @param {boolean} enable Flag, if AC should be enabled or disabled
*/
function enableAirConditioner(log, getState, setState, room, enable) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`enableAirConditioner(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return;
    }

    if (isAirConditionerEnabled(log, getState, room) != enable) {
        setState(idAliasAirConditionerPrefix + room.replace(" ", "") + idPowerSuffix, enable);
    }
}

/**
* @param {string} room via Rooms
* @return {boolean} 
*/
function isAirConditionerEnabled(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`isAirConditionerEnabled(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return false;
    }

    return getState(idAliasAirConditionerPrefix + room.replace(" ", "") + idPowerSuffix).val;
}

/**
* @return {boolean} 
*/
function isAnyAirConditionerEnabled(log, getState) {
    var anyOn = false;

    commonDefines.ROOMS_WITH_AIR_CONDITIONING.some(room => {
        room = commonFunctions.translateRoomNameToEnglish(room);
        anyOn = isAirConditionerEnabled(log, getState, room);
        return anyOn === true;
    });

    return anyOn;
}

/**
* @param {string} room via Rooms
* @return {number} 
*/
function getAirConditionerRoomTemperature(getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`getAirConditionerRoomTemperature(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return -1;
    }

    return getState(idAliasAirConditionerPrefix + room.replace(" ", "") + idRoomTempSuffix).val;
}

/**
* @param {string} room via Rooms
* @param {number} temp
*/
function setAirConditionerTargetTemperature(log, getState, setState, room, temp) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`setAirConditionerTargetTemperature(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return;
    }

    if (getAirConditionerTargetTemperature(log, getState, room) != temp) {
        setState(idAliasAirConditionerPrefix + room.replace(" ", "") + idTargetTempSuffix, temp);
    }
}

/**
* @param {string} room via Rooms
* @return {number} 
*/
function getAirConditionerTargetTemperature(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`getAirConditionerTargetTemperature(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return -1;
    }

    return getState(idAliasAirConditionerPrefix + room.replace(" ", "") + idTargetTempSuffix).val;
}

/**
* @param {string} room via Rooms
* @param {number} value Fan speed of the AC unit (via AIR_CONDITIONING_FAN_SPEEDS)
*/
function setAirConditionerFanSpeed(log, getState, setState, room, value) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`setAirConditionerFanSpeed(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return;
    }

    if (getAirConditionerFanSpeed(log, getState, room).value != value) {
        setState(idAliasAirConditionerPrefix + room.replace(" ", "") + idFanSpeedSuffix, value);
    }
}

/**
* @param {string} room via Rooms
* @return {object} Current AC fan speed as enum (via AIR_CONDITIONING_FAN_SPEEDS)
*/
function getAirConditionerFanSpeed(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`getAirConditionerFanSpeed(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return AIR_CONDITIONING_FAN_SPEEDS.UNDEF;
    }

    const fanSpeedValue = getState(idAliasAirConditionerPrefix + room.replace(" ", "") + idFanSpeedSuffix).val;

    switch (fanSpeedValue) {
        case AIR_CONDITIONING_FAN_SPEEDS.AUTO.value: return AIR_CONDITIONING_FAN_SPEEDS.AUTO;
        case AIR_CONDITIONING_FAN_SPEEDS.LOWEST.value: return AIR_CONDITIONING_FAN_SPEEDS.LOWEST;
        case AIR_CONDITIONING_FAN_SPEEDS.LOW.value: return AIR_CONDITIONING_FAN_SPEEDS.LOW;
        case AIR_CONDITIONING_FAN_SPEEDS.MEDIUM.value: return AIR_CONDITIONING_FAN_SPEEDS.MEDIUM;
        case AIR_CONDITIONING_FAN_SPEEDS.HIGH.value: return AIR_CONDITIONING_FAN_SPEEDS.HIGH;
        case AIR_CONDITIONING_FAN_SPEEDS.MAX.value: return AIR_CONDITIONING_FAN_SPEEDS.MAX;
        default: return AIR_CONDITIONING_FAN_SPEEDS.UNDEF;
    }
}

/**
* @param {string} room via Rooms
* @param {number} value Direction of vertical vane (via AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS)
*/
function setAirConditionerVaneVerticalDirection(log, getState, setState, room, value) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`setAirConditionerVaneVerticalDirection(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return;
    }

    if (getAirConditionerVaneVerticalDirection(log, getState, room).value != value) {
        setState(idAliasAirConditionerPrefix + room.replace(" ", "") + idVaneVerticalSuffix, value);
    }
}

/**
* @param {string} room via Rooms
* @return {object} Current direction of vertical vane as enum (via AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS)
*/
function getAirConditionerVaneVerticalDirection(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`getAirConditionerVaneVerticalDirection(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.UNDEF;
    }

    const vaneVerticalValue = getState(idAliasAirConditionerPrefix + room.replace(" ", "") + idVaneVerticalSuffix).val;

    switch (vaneVerticalValue) {
        case AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.AUTO.value: return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.AUTO;
        case AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.TOPMOST.value: return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.TOPMOST;
        case AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.UP.value: return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.UP;
        case AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.MIDDLE.value: return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.MIDDLE;
        case AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.DOWN.value: return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.DOWN;
        case AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.BOTTOMMOST.value: return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.BOTTOMMOST;
        case AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.SWING.value: return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.SWING;
        default: return AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS.UNDEF;
    }
}

/**
* @param {string} room via Rooms
* @param {number} value Direction of horizontal vane (via AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS)
*/
function setAirConditionerVaneHorizontalDirection(log, getState, setState, room, value) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`setAirConditionerVaneHorizontalDirection(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return;
    }

    if (getAirConditionerVaneHorizontalDirection(log, getState, room).value != value) {
        setState(idAliasAirConditionerPrefix + room.replace(" ", "") + idVaneHorizontalSuffix, value);
    }
}

/**
* @param {string} room via Rooms
* @return {object} Current direction of horizontal vane as enum (via AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS)
*/
function getAirConditionerVaneHorizontalDirection(log, getState, room) {
    room = commonFunctions.translateRoomNameToEnglish(room);
    if (!hasAirConditioner(room)) {
        log(`getAirConditionerVaneHorizontalDirection(): Raum '${room}' hat keine Klimaanlage!`, "error");
        return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.UNDEF;
    }

    const vaneHorizontalValue = getState(idAliasAirConditionerPrefix + room.replace(" ", "") + idVaneHorizontalSuffix).val;

    switch (vaneHorizontalValue) {
        case AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.AUTO.value: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.AUTO;
        case AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.LEFTMOST.value: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.LEFTMOST;
        case AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.LEFT.value: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.LEFT;
        case AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.MIDDLE.value: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.MIDDLE;
        case AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.RIGHT.value: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.RIGHT;
        case AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.RIGHTMOST.value: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.RIGHTMOST;
        case AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.FIFTY_FIFTY.value: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.FIFTY_FIFTY;
        case AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.SWING.value: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.SWING;
        default: return AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS.UNDEF;
    }
}

module.exports = {
    AIR_CONDITIONING_MODES, AIR_CONDITIONING_FAN_SPEEDS, AIR_CONDITIONING_VANE_VERTICAL_DIRECTIONS, AIR_CONDITIONING_VANE_HORIZONTAL_DIRECTIONS,
    hasAirConditioner, adjustAllACTargetTempsToRoomTemp, adjustACTargetTempToRoomTemp, getACTargetTempLimit, setAirConditionerOperationMode, getAirConditionerOperationMode,
    enableAirConditioner, isAirConditionerEnabled, isAnyAirConditionerEnabled, getAirConditionerRoomTemperature, setAirConditionerTargetTemperature, getAirConditionerTargetTemperature,
    setAirConditionerFanSpeed, getAirConditionerFanSpeed, setAirConditionerVaneVerticalDirection, getAirConditionerVaneVerticalDirection,
    setAirConditionerVaneHorizontalDirection, getAirConditionerVaneHorizontalDirection
};