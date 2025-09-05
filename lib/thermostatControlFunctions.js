/* eslint-disable jsdoc/check-param-names */
"use strict";

const commonDefines = require("./commonDefines.js");
const commonFunctions = require("./commonFunctions.js");
const sensorFunctions = require("./sensorFunctions.js");
const weatherSensorFunctions = require("./weatherSensorFunctions.js");

const objectCache = new Map();

const THERMOSTAT_MODES = {
	AUTO: 0,
	MANUAL: 1,
	CLOSED: 2, // existiert nativ so nicht bei den HMIP-Thermostaten, wird aber hier im Code simuliert (s. setThermostatMode())
};

const THERMOSTAT_WINDOW_STATES = {
	CLOSED: 0,
	OPEN: 1,
};

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

const idUserDataThermostatControlPrefix = `${commonDefines.idUserDataPrefix}ThermostatControl`;
const idIsSummerModeActiveSuffix = ".SummerModeActive";

async function getCachedObject(getObjectAsync, id) {
	if (!objectCache.has(id)) {
		objectCache.set(id, await getObjectAsync(id));
	}
	return objectCache.get(id);
}

/**
 * @param {string} room via Rooms
 * @returns {boolean}
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
	if (isSummerActive) {
		mode = THERMOSTAT_MODES.CLOSED;
	}

	switch (mode) {
		// Hier kann der Modus direkt gesetzt werden. Steuerung erfolgt dann nach den Wochenprofilen der CCU
		case THERMOSTAT_MODES.AUTO:
			setThermostatModeDirectly(setState, room, mode);
			break;
		// Hier Modus setzen und neue Soll-Temperatur bestimmen
		case THERMOSTAT_MODES.MANUAL:
			setThermostatModeDirectly(setState, room, mode);
			adjustThermostatTargetTemp(
				log,
				getState,
				setState,
				compareTime,
				room,
				sensorFunctions.getCurrentInsideTemperature(existsState, getState, room),
			);
			break;
		// Simulation des "CLOSED"-Modus: Modus auf "MANUAL" und Solltemperatur auf 5°C setzen
		case THERMOSTAT_MODES.CLOSED:
			setThermostatModeDirectly(setState, room, THERMOSTAT_MODES.MANUAL);
			setThermostatTargetTemperature(getState, setState, room, minThermostatTargetTemp);
			break;
	}
}

/**
 * Passt die gewünschte Soll-Temperatur an die Innen- bzw. Außentemperatur an
 * @param {string} room via Rooms
 * @returns {number}
 */
function getAdjustedTargetTemp(log, getState, compareTime, room, indoorTemp) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}

	// Die gewünschte Temperatur auslesen
	const scheduledTemp = getScheduledTargetTemp(log, getState, compareTime, room);

	// Maximalwert bestimmen
	const maxAdjustmentLimit = getState(
		`${commonDefines.idUserDataPrefix}ThermostatControl.AutomaticTempAdjustmentLimit`,
	).val;
	const maxAdjustedScheduledTemp = scheduledTemp + maxAdjustmentLimit;

	// Evtl. noch an Innentemperatur angleichen
	let adjustedScheduledTemp = adjustTargetTempToInsideTemp(getState, scheduledTemp, room, indoorTemp);

	// Änderung der Soll-Temperatur begrenzen
	if (adjustedScheduledTemp > maxAdjustedScheduledTemp) {
		adjustedScheduledTemp = maxAdjustedScheduledTemp;
	}

	return adjustedScheduledTemp;
}

/**
 * Ermittelt die anhand der aktuellen Zeit gewünschten Soll-Temperatur
 * @param {string} room
 * @returns {number}
 */
function getScheduledTargetTemp(log, getState, compareTime, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	const isDaytime = isThermostatDaytimeSchedule(getState, compareTime, room);
	const scheduledTemp = isDaytime
		? getThermostatDayTemp(log, getState, room)
		: getThermostatNightTemp(log, getState, room);

	return scheduledTemp;
}

/**
 * Anhand der Außentemperatur die Soll-Temperatur evtl. absenken (Übergang Winter --> Frühjahr)
 * @param {number} targetTemp
 * @returns {number}
 */
function adjustTargetTempToOutsideTemp(getState, targetTemp) {
	const outdoorTemp = weatherSensorFunctions.getCurrentOutsideTemperature(getState);

	if (targetTemp - 1 <= outdoorTemp) {
		// Wenn Außentemparatur weniger als 1°C unter der Soll-Temperatur liegt, die Soll-Temperatur um 1°C senken
		targetTemp -= 1;
	} else if (targetTemp - 3 <= outdoorTemp) {
		// Ansonten wenn Außentemparatur weniger als 3°C unter der Soll-Temperatur liegt, die Soll-Temperatur um 0.5°C senken
		targetTemp -= 0.5;
	}

	return targetTemp;
}

/**
 * Anhand der Innentemperatur des jeweiligen Raums die Soll-Temperatur anpassen
 * @param {number} targetTemp
 * @param {string} room
 * @returns {number}
 */
function adjustTargetTempToInsideTemp(getState, targetTemp, room, indoorTemp) {
	// Reelle Temperatur bereits Soll-Temp erreicht oder darüber
	if (indoorTemp >= targetTemp) {
		return targetTemp;
	}

	room = commonFunctions.translateRoomNameToEnglish(room);
	const thermostatTemp = getCurrentThermostatTemp(getState, room); // Temperatur direkt am Ventil

	const diffTemp = thermostatTemp - indoorTemp;
	let correctedTargetTemp = targetTemp + diffTemp;

	if (correctedTargetTemp < targetTemp) {
		return targetTemp;
	} // nicht nach unten korrigieren

	correctedTargetTemp = commonFunctions.clamp(correctedTargetTemp, minThermostatTargetTemp, maxThermostatTargetTemp); // Auf die maximalen Wertebereiche beschränken

	return Math.round(correctedTargetTemp * 2) / 2; // auf 0.5 runden
}

/// GET
/**
 * @param {string} room
 * @returns {number}
 */
function getThermostatTargetTemp(getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}
	return getState(`${idAliasThermostatPrefix}${room}${idTargetTemperature}`).val;
}

/**
 * @param {string} room
 * @returns {number}
 */
function getThermostatDayTemp(log, getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}

	try {
		const temperaturesJSON = JSON.parse(getState("0_userdata.0.ThermostatControl.TargetTemperatures").val);
		return temperaturesJSON.targetTemperatures.comfort[room];
	} catch {
		log(`getThermostatDayTemp(${room}: Fehler beim Parsen des JSON!`, "error");
		return defaultDayTemp;
	}
}

/**
 * @param {string} room
 * @returns {number}
 */
function getThermostatNightTemp(log, getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}

	try {
		const temperaturesJSON = JSON.parse(getState("0_userdata.0.ThermostatControl.TargetTemperatures").val);
		return temperaturesJSON.targetTemperatures.night[room];
	} catch {
		log(`getThermostatNightTemp(${room}: Fehler beim Parsen des JSON!`, "error");
		return defaultNightTemp;
	}
}

/**
 * @param {string} room
 * @returns {number}
 */
function getCurrentThermostatTemp(getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}
	return getState(`${idAliasThermostatPrefix}${room}${idCurrentTemperature}`).val;
}

/**
 * @param {string} room
 * @returns {number}
 */
function getThermostatMode(getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}
	let mode = getState(`${idAliasThermostatPrefix}${room}${idOperationModeSuffix}`).val;

	// Hier die Simulation des CLOSED-Modus prüfen
	if (mode == THERMOSTAT_MODES.MANUAL && getThermostatTargetTemp(getState, room) == minThermostatTargetTemp) {
		mode = THERMOSTAT_MODES.CLOSED;
	}

	return mode;
}

/**
 * @param {string} room
 * @returns {number}
 */
function getThermostatBatteryVoltage(getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}
	return getState(`${idAliasThermostatPrefix}${room}${idBatteryVoltageTemperature}`).val;
}

/**
 * @param {string} room
 * @returns {number}
 */
function getThermostatValveLevel(getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}
	return getState(`${idAliasThermostatPrefix}${room}${idValveLevelSuffix}`).val;
}

/**
 * @param {string} room
 * @returns {number}
 */
function getThermostatWindowState(getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return -1;
	}
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
	if (!hasThermostat(room)) {
		return;
	}

	// wenn Sommerschaltung aktiv oder Fenster offen, immer Minimalsolltemperatur erzwingen, damit Heizung aus bleibt
	if (
		isThermostatSummerModeActive(getState, room) ||
		getThermostatWindowState(getState, room) == THERMOSTAT_WINDOW_STATES.OPEN
	) {
		temp = minThermostatTargetTemp;
	}

	// Nur schreiben, wenn wirkliche Änderung vorliegt -> Kommunikation gering halten
	const currentTargetTemp = getThermostatTargetTemp(getState, room);
	if (currentTargetTemp != temp) {
		setState(`${idAliasThermostatPrefix}${room}${idTargetTemperature}`, temp);
	}
}

/**
 * @param {string} room
 * @param {number} level
 */
function setThermostatValveLevel(getState, setState, room, level) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return;
	}
	if (isThermostatSummerModeActive(getState, room)) {
		level = minThermostatValveLevel;
	} // wenn Sommerschaltung aktiv, immer Ventil ganz schließen erzwingen, damit Heizung aus bleibt
	level = commonFunctions.clamp(level, minThermostatValveLevel, maxThermostatValveLevel);

	// Nur schreiben, wenn wirkliche Änderung vorliegt -> Kommunikation gering halten
	const currentValveLevel = getThermostatValveLevel(getState, room);
	if (currentValveLevel != level) {
		setState(`${idAliasThermostatPrefix}${room}${idValveLevelSuffix}`, level);
	}
}

/**
 * @param {string} room
 * @param {number} state via THERMOSTAT_WINDOW_STATES
 */
function setThermostatWindowState(getState, setState, room, state) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return;
	}
	if (isThermostatSummerModeActive(getState, room)) {
		state = THERMOSTAT_WINDOW_STATES.OPEN;
	} // wenn Sommerschaltung aktiv, immer "WINDOW_OPEN" erzwingen, damit Heizung aus bleibt

	// Nur schreiben, wenn wirkliche Änderung vorliegt -> Kommunikation gering halten
	const currentWindowState = getThermostatWindowState(getState, room);
	if (currentWindowState != state) {
		setState(`${idAliasThermostatPrefix}${room}${idWindowState}`, state);
	}
}

/**
 * @param {string} room via Rooms
 * @param {boolean} isActive
 */
function setThermostatSummerMode(getState, setState, room, isActive) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return;
	}

	// Nur schreiben, wenn wirkliche Änderung vorliegt -> Kommunikation gering halten
	const currentSummerModeState = isThermostatSummerModeActive(getState, room);
	if (currentSummerModeState != isActive) {
		setState(`${idUserDataThermostatControlPrefix}${idIsSummerModeActiveSuffix}${room}`, isActive);
	}
}

/**
 * @param {string} room
 * @param {number} mode via ThermostatModes
 */
function setThermostatModeDirectly(setState, room, mode) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return;
	}
	setState(`${idAliasThermostatPrefix}${room}${idOperationModeSuffix}`, mode);
}

/**
 * Alle Thermostate auf einen einheitlichen Modus setzen
 * @param {number} mode via ThermostatModes
 */
async function setAllThermostatsModes(log, existsState, getState, setState, getObjectAsync, compareTime, mode) {
	const thermostatObj = await getCachedObject(getObjectAsync, "enum.functions.heating");
	const radiators = thermostatObj.common.members;

	for (let i = 0; radiators != null && i < radiators.length; i++) {
		setTimeout(() => {
			setThermostatMode(log, existsState, getState, setState, compareTime, radiators[i], mode);
		}, 0);
	}
}

/**
 * @param {number} indoorTemps
 */
async function adjustAllThermostatsTargetTemps(
	log,
	getEnums,
	getState,
	setState,
	getObjectAsync,
	compareTime,
	indoorTemps,
) {
	const thermostatObj = await getCachedObject(getObjectAsync, "enum.functions.heating");
	const radiators = thermostatObj.common.members;

	for (let i = 0; radiators != null && i < radiators.length; i++) {
		setTimeout(async () => {
			let room = await commonFunctions.getRoomFromState(getEnums, radiators[i]);

			if (room == null) {
				return;
			}

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
	if (
		!hasThermostat(room) ||
		isThermostatSummerModeActive(getState, room) ||
		getThermostatWindowState(getState, room) == THERMOSTAT_WINDOW_STATES.OPEN
	) {
		return;
	} // wenn Sommermodus aktiv oder Fenster geöffnet, nichts tun

	const adjustedTargetTemp = getAdjustedTargetTemp(log, getState, compareTime, room, indoorTemp);
	setThermostatTargetTemperature(getState, setState, room, adjustedTargetTemp);
}
/// ENDE SET

/**
 * @param {string} room via Rooms
 * @returns {boolean}
 */
function isThermostatSummerModeActive(getState, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return false;
	}
	return getState(`${idUserDataThermostatControlPrefix}${idIsSummerModeActiveSuffix}${room}`).val;
}

/**
 * Prüft, ob Tag- oder Nachtmodus aktiv ist basierend auf aktueller Uhrzeit
 * @param {string} room via Rooms
 * @returns {boolean}
 */
function isThermostatDaytimeSchedule(getState, compareTime, room) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	if (!hasThermostat(room)) {
		return false;
	}

	let isDaytime = false;
	const currentDate = new Date();
	const currentDay = currentDate.getDay();
	const currentTime = `${currentDate.getHours()}:${currentDate.getMinutes()}`;
	const isWorkday = currentDay != 6 && currentDay != 0; // 6 = Samstag, 0 = Sonntag
	const scheduledTimes = getThermostatSchedulingTimes(getState, room, isWorkday);

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
 * @returns {string[]}
 */
function getThermostatSchedulingTimes(getState, room, isWorkday) {
	room = commonFunctions.translateRoomNameToEnglish(room);
	const dayStart = getState(
		`${commonDefines.idUserDataPrefix}ThermostatControl.ScheduleDayStart${isWorkday ? "Workday" : "Weekend"}${room}`,
	).val;
	const nightStart = getState(
		`${commonDefines.idUserDataPrefix}ThermostatControl.ScheduleNightStart${isWorkday ? "Workday" : "Weekend"}${room}`,
	).val;

	return [dayStart, nightStart];
}

module.exports = {
	THERMOSTAT_MODES,
	THERMOSTAT_WINDOW_STATES,
	hasThermostat,
	setThermostatMode,
	getAdjustedTargetTemp,
	getScheduledTargetTemp,
	adjustTargetTempToOutsideTemp,
	adjustTargetTempToInsideTemp,
	getThermostatTargetTemp,
	getThermostatDayTemp,
	getThermostatNightTemp,
	getCurrentThermostatTemp,
	getThermostatMode,
	getThermostatBatteryVoltage,
	getThermostatValveLevel,
	getThermostatWindowState,
	setThermostatTargetTemperature,
	setThermostatModeDirectly,
	setAllThermostatsModes,
	setThermostatValveLevel,
	setThermostatWindowState,
	setThermostatSummerMode,
	adjustAllThermostatsTargetTemps,
	adjustThermostatTargetTemp,
	isThermostatSummerModeActive,
	isThermostatDaytimeSchedule,
	getThermostatSchedulingTimes,
};
