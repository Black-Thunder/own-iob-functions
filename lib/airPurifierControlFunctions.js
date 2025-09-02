"use strict";

const commonDefines = require("./commonDefines.js");
const commonFunctions = require("./commonFunctions.js");

const idAirPurifierPrefix = `${commonDefines.idAliasPrefix}Devices.AirPurifier.`;
const airPurifierPowerSuffix = ".ACTUAL";
const airPurifierIonizerSuffix = ".IS_IONIZER_ON";
const airPurifierFanSpeedSuffix = ".FAN_LEVEL";
const airPurifierFavoriteFanSpeedSuffix = ".FAVORITE_FAN_LEVEL";
const airPurifierFilterLifeSuffix = ".FILTER_LIFE";
const airPurifierOperationModeSuffix = ".OPERATION_MODE";
const airPurifierDisplayBrightnessSuffix = ".DISPLAY_BRIGHTNESS";

const objectCache = new Map();

const AIRPURIFIER_OPERATIONMODES = {
	AUTO: 0,
	NIGHT: 1,
	FAVORITE: 2,
	MANUAL: 3,
};

const AIRPURIFIER_MANUAL_FAN_LEVELS = {
	LEVEL1: 1, // entspricht Favorit Stufe 2
	LEVEL2: 2, // entspricht Favorit Stufe 10
	LEVEL3: 3, // entspricht Favorit Stufe 12
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
	LEVEL14: 14,
};

const AIRPURIFIER_DISPLAY_BRIGHTNESS = {
	OFF: 0,
	DIMMED: 1,
	BRIGHT: 2,
};

function getDeviceId(room) {
	if (!hasAirPurifier(room)) {
		return null;
	}
	const engRoom = commonFunctions.translateRoomNameToEnglish(room);
	return `${idAirPurifierPrefix}${engRoom}`;
}

async function getCachedObject(getObjectAsync, id) {
	if (!objectCache.has(id)) {
		objectCache.set(id, await getObjectAsync(id));
	}
	return objectCache.get(id);
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
function powerAirPurifierOn(setState, room) {
	const deviceId = getDeviceId(room);
	if (deviceId != null) {
		setState(deviceId + airPurifierPowerSuffix, true);
	}
}

/**
 * @param {string} room via Rooms
 */
function powerAirPurifierOff(setState, room) {
	const deviceId = getDeviceId(room);
	if (deviceId != null) {
		setState(deviceId + airPurifierPowerSuffix, false);
	}
}

/**
 * @param {string} room via Rooms
 */
function isAirPurifierPoweredOn(getState, room) {
	const deviceId = getDeviceId(room);
	return deviceId != null ? getState(deviceId + airPurifierPowerSuffix).val : false;
}

/**
 * @param {string} room via Rooms
 * @param {boolean} enable
 */
function setAirPurifierIonizerState(setState, existsState, room, enable) {
	const deviceId = getDeviceId(room);

	if (deviceId != null && existsState(deviceId + airPurifierIonizerSuffix)) {
		setState(deviceId + airPurifierIonizerSuffix, enable);
	}
}

/**
 * @param {string} room via Rooms
 * @param {any} mode via AIRPURIFIER_OPERATIONMODES
 */
function setAirPurifierOperationMode(setState, room, mode) {
	const deviceId = getDeviceId(room);
	if (deviceId != null) {
		setState(deviceId + airPurifierOperationModeSuffix, mode);
	}
}

/**
 * @param {string} room via Rooms
 */
function getAirPurifierOperationMode(getState, room) {
	const deviceId = getDeviceId(room);
	return deviceId != null ? getState(deviceId + airPurifierOperationModeSuffix).val : -1;
}

/**
 * @param {string} room via Rooms
 * @param {number} speed via AIRPURIFIER_MANUAL_FAN_LEVELS
 */
function setAirPurifierManualFanSpeed(setState, room, speed) {
	const deviceId = getDeviceId(room);
	if (deviceId != null) {
		speed = commonFunctions.clamp(speed, 1, 3);
		setState(deviceId + airPurifierFanSpeedSuffix, speed);
	}
}

/**
 * @param {string} room via Rooms
 */
function getAirPurifierManualFanSpeed(getState, room) {
	const deviceId = getDeviceId(room);
	return deviceId != null ? getState(deviceId + airPurifierFanSpeedSuffix).val : -1;
}

/**
 * @param {string} room via Rooms
 * @param {number} speed via AIRPURIFIER_FAVORITE_FAN_LEVELS
 */
async function setAirPurifierFavoriteFanSpeed(getObjectAsync, setStateAsync, room, speed) {
	const deviceId = getDeviceId(room);
	if (deviceId != null) {
		const favoriteFanSpeedObj = await getCachedObject(getObjectAsync, deviceId + airPurifierFavoriteFanSpeedSuffix);
		const maxFanLevel = favoriteFanSpeedObj.common.max;
		speed = commonFunctions.clamp(speed, 0, maxFanLevel);
		setStateAsync(deviceId + airPurifierFavoriteFanSpeedSuffix, speed);
	}
}

/**
 * @param {string} room via Rooms
 */
function getAirPurifierFavoriteFanSpeed(getState, room) {
	const deviceId = getDeviceId(room);
	return deviceId != null ? getState(deviceId + airPurifierFavoriteFanSpeedSuffix).val : -1;
}

/**
 * @param {string} room via Rooms
 */
function getAirPurifierFilterLife(getState, room) {
	const deviceId = getDeviceId(room);
	return deviceId != null ? getState(deviceId + airPurifierFilterLifeSuffix).val : -1;
}

/**
 * @param {string} room via Rooms
 * @param {number} bri via AIRPURIFIER_DISPLAY_BRIGHTNESS
 */
function setAirPurifierDisplayBrightness(setState, room, bri) {
	const deviceId = getDeviceId(room);
	if (deviceId != null) {
		setState(deviceId + airPurifierDisplayBrightnessSuffix, bri);
	}
}

/**
 * @param {string} room via Rooms
 */
function getAirPurifierDisplayBrightness(getState, room) {
	const deviceId = getDeviceId(room);
	const bri = deviceId != null ? getState(deviceId + airPurifierDisplayBrightnessSuffix).val : -1;
	return bri;
}

/**
 * @param {string} room via Rooms
 */
function getAirPurifierDefaultFavFanSpeedDay(getState, room) {
	if (!hasAirPurifier(room)) {
		return 0;
	}
	return getState(
		`${commonDefines.idUserDataPrefix}AirPurifierControl.ScriptParamters.DefaultFavFanSpeedDay${room.replace(" ", "_")}`,
	).val;
}

/**
 * @param {string} room via Rooms
 */
function getAirPurifierFavFanSpeedNight(getState, room) {
	if (!hasAirPurifier(room)) {
		return 0;
	}
	return getState(
		`${commonDefines.idUserDataPrefix}AirPurifierControl.ScriptParamters.DefaultFavFanSpeedNight${room.replace(" ", "_")}`,
	).val;
}

/**
 * @param {string} room via Rooms
 * @param {boolean} enable Activate/deactivate night mode
 */
function setAirPurifierNightMode(setState, room, enable) {
	if (!hasAirPurifier(room)) {
		return;
	}
	setState(
		`${commonDefines.idUserDataPrefix}AirPurifierControl.ScriptParamters.IsNightModeActive${room.replace(" ", "_")}`,
		enable,
	);
}

/**
 * @param {string} room via Rooms
 */
function getAirPurifierNightMode(getState, room) {
	if (!hasAirPurifier(room)) {
		return false;
	}
	return getState(
		`${commonDefines.idUserDataPrefix}AirPurifierControl.ScriptParamters.IsNightModeActive${room.replace(" ", "_")}`,
	).val;
}

module.exports = {
	AIRPURIFIER_OPERATIONMODES,
	AIRPURIFIER_MANUAL_FAN_LEVELS,
	AIRPURIFIER_FAVORITE_FAN_LEVELS,
	AIRPURIFIER_DISPLAY_BRIGHTNESS,
	hasAirPurifier,
	powerAirPurifierOn,
	powerAirPurifierOff,
	isAirPurifierPoweredOn,
	setAirPurifierIonizerState,
	setAirPurifierOperationMode,
	getAirPurifierOperationMode,
	setAirPurifierManualFanSpeed,
	getAirPurifierManualFanSpeed,
	setAirPurifierFavoriteFanSpeed,
	getAirPurifierFavoriteFanSpeed,
	getAirPurifierFilterLife,
	setAirPurifierDisplayBrightness,
	getAirPurifierDisplayBrightness,
	getAirPurifierDefaultFavFanSpeedDay,
	getAirPurifierFavFanSpeedNight,
	getAirPurifierNightMode,
	setAirPurifierNightMode,
};
