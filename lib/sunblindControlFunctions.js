'use strict';

var commonDefines = require("./commonDefines.js");
var dateTimeFunctions = require("./dateTimeFunctions.js");
var pushoverFunctions = require("./pushoverFunctions.js");
var weatherSensorFunctions = require("./weatherSensorFunctions.js");

const idSunblindCurrentState = commonDefines.idUserDataPrefix + "SunblindControl.State";
const idSunblindLastMovement = commonDefines.idUserDataPrefix + "SunblindControl.LastMovement";
const idSunblindDayTimeStart = commonDefines.idUserDataPrefix + "SunblindControl.DaytimeStart";
const idSunblindDayTimeEndOffset = commonDefines.idUserDataPrefix + "SunblindControl.DaytimeEndOffset";
const idSunblindShouldBeControlledByScript = commonDefines.idUserDataPrefix + "SunblindControl.ShouldBeControlledByScript";
var sunblindSetStateTimeout = null;

const SUNBLIND_STATES = {
    LOWERED: "ausgefahren",
    RETRACTED: "eingefahren",
    LOWERING: "wird ausgefahren",
    RECTRACTING: "wird eingefahren",
    HALFWAY: "auf Halbposition",
    STOPPED: "gestoppt",
    BLOCKED: "blockiert!"
};

/**
* @return {boolean} Gibt an, ob sich die Markise nicht mehr in eingefahrener Position befindet
*/
function isSunblindLowered(getState) {
    const state = getSunblindState(getState);
    return state == SUNBLIND_STATES.LOWERED || state == SUNBLIND_STATES.LOWERING || state == SUNBLIND_STATES.HALFWAY || state == SUNBLIND_STATES.STOPPED;
}

/**
* @return {boolean} Gibt an, ob sich die Markise in komplett ausgefahrener Position befindet
*/
function isSunblindCompletelyLowered(getState) {
    const state = getSunblindState(getState);
    return state == SUNBLIND_STATES.LOWERED;
}

/**
* @return {boolean} Gibt an, ob sich die Markise in eingefahrener oder einfahrender Position befindet
*/
function isSunblindRetracted(getState) {
    const state = getSunblindState(getState);
    return state == SUNBLIND_STATES.RETRACTED || state == SUNBLIND_STATES.RECTRACTING;
}

/**
* @return {boolean} Gibt an, ob sich die Markise in Bewegung befindet
*/
function isSunblindMoving(getState) {
    const state = getSunblindState(getState);
    return state == SUNBLIND_STATES.RECTRACTING || state == SUNBLIND_STATES.LOWERING;
}

/**
* @return {boolean} Gibt an, ob sich die Markise physisch wirklich in eingefahrener Position befindet
*/
function isSunblindPhysicallyRetracted(getState) {
    return !getState("alias.0.Sensors.Sunblind.ACTUAL").val;
}

/**
* @return {boolean} Gibt an, ob der Markisenatrieb geladen wird
*/
function isSunblindMotorCharging(getState) {
    return getState("alias.0.Sockets.SunblindCharger.SET").val;
}

/**
* @return {boolean} Gibt zurück, ob die Markise automatisiert gesteuert werden soll
*/
function shouldSunblindBeControlledByScript(getState) {
    return getState(idSunblindShouldBeControlledByScript).val;
}

/**
* Invertiert den State, ob die Markise automatisiert gesteuert werden soll
* @return {boolean} Gibt den neuen Steuerungsmodus zurück
*/
function toggleSunblindBeControlledByScript(getState, setState) {
    const curState = getState(idSunblindShouldBeControlledByScript).val;
    setState(idSunblindShouldBeControlledByScript, !curState);
    return !curState;
}

/**
* @return {boolean} Gibt an, ob der Tageszeitplan für die Markise gilt
*/
function isDayTimeScheduleActive(getState, compareTime) {
    const currentDate = new Date();
    var dayTimeEndDate = weatherSensorFunctions.getSunsetDate(getState);

    if (!dayTimeEndDate) return false;

    const dayTimeEndOffset = getState(idSunblindDayTimeEndOffset).val;
    dayTimeEndDate.setMinutes(dayTimeEndDate.getMinutes() - dayTimeEndOffset);

    const dayTimeStartTime = new Date(getState(idSunblindDayTimeStart).val);
    var dayTimeStartDate = new Date(currentDate.getTime());
    dayTimeStartDate.setHours(dayTimeStartTime.getHours());
    dayTimeStartDate.setMinutes(dayTimeStartTime.getMinutes());
    dayTimeStartDate.setSeconds(dayTimeStartTime.getSeconds());
    dayTimeStartDate.setMilliseconds(dayTimeStartTime.getMilliseconds());

    return compareTime(dayTimeStartDate, dayTimeEndDate, "between", currentDate);
}

/**
* @return {string} Gibt den softwareseitigen Status der Markise zurück (via SunblindStates)
*/
function getSunblindState(getState) {
    return getState(idSunblindCurrentState).val;
}

/**
* @param {string} state via SunblindStates
*/
function setSunblindState(getState, setState, state) {
    if (getSunblindState(getState) == state) return;

    setState(idSunblindCurrentState, state);
    dateTimeFunctions.saveCurrentDateTimeToStateAsDate(setState, idSunblindLastMovement);
}

/**
* Markise komplett ausfahren lassen
* @param {boolean} [shouldStateBeSet=true] shouldStateBeSet Flag, ob Status anschließend auf "ausgefahren" gesetzt werden soll (default=true)
*/
function lowerSunblind(getState, setState, shouldStateBeSet = true) {
    var loweredDelay = 15 * 1000; // default 15s bis von Halbposition ausgefahren

    // Wenn nicht in Halbposition, erst nach 25s auf "ausgefahren" setzen
    if (getSunblindState(getState) != SUNBLIND_STATES.HALFWAY) {
        loweredDelay = 25 * 1000;
    }

    setState("alias.0.Devices.SunblindMotor.MOVE_DOWN", true);
    setSunblindState(getState, setState, SUNBLIND_STATES.LOWERING);

    if (shouldStateBeSet) {
        sunblindSetStateTimeout = setTimeout(() => {
            // Nur wenn das Ausfahren wirklich geklappt hat; ansonsten greift die Überwachung und schickt den Befehl ein zweites Mal
            if (!isSunblindPhysicallyRetracted(getState)) {
                setSunblindState(getState, setState, SUNBLIND_STATES.LOWERED);
            }

            sunblindSetStateTimeout = null;
        }, loweredDelay);
    }
}

/**
* Markise komplett einfahren lassen
*/
function retractSunblind(getState, setState) {
    setState("alias.0.Devices.SunblindMotor.MOVE_UP", true);
    setSunblindState(getState, setState, SUNBLIND_STATES.RECTRACTING);
}

/**
* Markise stoppen
* @param {boolean} [shouldStateBeSet=true] shouldStateBeSet Flag, ob Status auf "gestoppt" gesetzt werden soll (default=true)
*/
function stopSunblind(getState, setState, shouldStateBeSet = true) {
    if (sunblindSetStateTimeout != null) {
        clearTimeout(sunblindSetStateTimeout);
        sunblindSetStateTimeout = null;
    }

    setState("alias.0.Devices.SunblindMotor.MOVE_STOP", true);
    if (shouldStateBeSet) setSunblindState(getState, setState, SUNBLIND_STATES.STOPPED);
}

/**
* Markise auf Halbposition ausfahren, nur möglich wenn Markise entweder komplett ein- oder ausgefahren ist
*/
function moveSunblindHalfway(getState, setState, sendTo) {
    if (!isSunblindPhysicallyRetracted(getState) && !isSunblindCompletelyLowered(getState)) {
        pushoverFunctions.sendPushMessage(sendTo, "Markisensteuerung - Muss entweder komplett ein- oder ausgefahren sein, um auf Mittelposition zu fahren.");
        return;
    }

    if (isSunblindPhysicallyRetracted(getState)) {
        lowerSunblind(getState, setState, false); // ohne Status auf "ausgefahren" zu setzen

        sunblindSetStateTimeout = setTimeout(() => {
            stopSunblind(getState, setState, false); // ohne Status auf "gestoppt" zu setzen

            // Nur wenn Markise auf Befehl reagiert hat, ansonsten greift die Überwachung unter "Sunblind/MovementControl" und versucht es nochmal
            if (!isSunblindPhysicallyRetracted(getState)) {
                setSunblindState(getState, setState, SUNBLIND_STATES.HALFWAY);
            }

            sunblindSetStateTimeout = null;
        }, 15 * 1000); // Zeit (in ms), bis Markise ca. zur Hälfte ausgefahren ist
    }
    else if (isSunblindCompletelyLowered(getState)) {
        retractSunblind(getState, setState);

        sunblindSetStateTimeout = setTimeout(() => {
            stopSunblind(getState, setState, false); // ohne Status auf "gestoppt" zu setzen
            setSunblindState(getState, setState, SUNBLIND_STATES.HALFWAY);
            sunblindSetStateTimeout = null;
        }, 10 * 1000); // Zeit (in ms), bis Markise ca. zur Hälfte eingefahren ist
    }
}

module.exports = {
    SUNBLIND_STATES, idSunblindCurrentState, idSunblindLastMovement, idSunblindDayTimeStart, idSunblindDayTimeEndOffset, idSunblindShouldBeControlledByScript,
    isSunblindLowered, isSunblindCompletelyLowered, isSunblindRetracted, isSunblindMoving, isSunblindPhysicallyRetracted, isSunblindMotorCharging, getSunblindState, setSunblindState, shouldSunblindBeControlledByScript,
    toggleSunblindBeControlledByScript, lowerSunblind, retractSunblind, stopSunblind, moveSunblindHalfway, isDayTimeScheduleActive
};