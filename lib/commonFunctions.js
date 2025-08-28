"use strict";

const commonDefines = require("./commonDefines.js");

const stateToRoomMap = {};

/**
 * @param {number} value Value to be rounded
 * @param {number} [precision=0] Number of decimal places (default = 0)
 * @return {number} Rounded value
 */
function roundValue(value, precision = 0) {
	var multiplier = Math.pow(10, precision);
	return Math.round(value * multiplier) / multiplier;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @return {number} value limited to min/max parameters
 */
function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

/** Function that counts occurrences of a substring in a string;
 * @param {String} string               The string
 * @param {String} subString            The sub string to search for
 * @param {Boolean} [allowOverlapping]  Optional. (Default:false)
 *
 * @author Vitim.us https://gist.github.com/victornpb/7736865
 * @see Unit Test https://jsfiddle.net/Victornpb/5axuh96u/
 * @see http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
 */
function occurrences(string, subString, allowOverlapping) {
	string += "";
	subString += "";
	if (subString.length <= 0) return string.length + 1;

	var n = 0,
		pos = 0,
		step = allowOverlapping ? 1 : subString.length;

	while (true) {
		pos = string.indexOf(subString, pos);
		if (pos >= 0) {
			++n;
			pos += step;
		} else break;
	}
	return n;
}

/**
 * @param {string} room via commonDefines.ROOMS
 * @return {boolean}
 */
function isRoomIndoor(room) {
	switch (room) {
		case commonDefines.ROOMS.WOHNZIMMER:
		case commonDefines.ROOMS_EN.WOHNZIMMER:
		case commonDefines.ROOMS.SCHLAFZIMMER:
		case commonDefines.ROOMS_EN.SCHLAFZIMMER:
		case commonDefines.ROOMS.ZIMMER_DOMI:
		case commonDefines.ROOMS_EN.ZIMMER_DOMI:
		case commonDefines.ROOMS.KUECHE:
		case commonDefines.ROOMS_EN.KUECHE:
		case commonDefines.ROOMS.BAD:
		case commonDefines.ROOMS_EN.BAD:
		case commonDefines.ROOMS.GANG:
		case commonDefines.ROOMS_EN.GANG:
		case commonDefines.ROOMS.FLUR:
		case commonDefines.ROOMS_EN.FLUR:
			return true;
		default:
			return false;
	}
}

/**
 * Builds a mapping from state IDs to their corresponding room names.
 * Fetches room enums using the provided `getEnums` function, then iterates through each room,
 * assigning each unique member state ID to the room's name in the `stateToRoomMap`.
 *
 * @async
 * @param {function(string): Promise<Array<{name: {de: string}, members: string[]}>>} getEnums -
 *        Async function to retrieve room enums, expects "rooms" as argument.
 * @returns {Promise<void>} Resolves when the mapping is built.
 */
async function buildStateToRoomMap(getEnums) {
	const enums = await getEnums("rooms");

	enums.forEach(roomEnum => {
		const roomName = roomEnum.name.de;
		const uniqueMembers = Array.from(new Set(roomEnum.members));

		uniqueMembers.forEach(stateId => {
			stateToRoomMap[stateId] = roomName;
		});
	});
}

/**
 * Retrieves the room associated with a given state ID by searching through the stateToRoomMap.
 * Traverses up the hierarchy by removing the last path segment from the state ID until a match is found or no segments remain.
 *
 * @param {string} stateId - The ID of the state to find the associated room for.
 * @returns {(string|null)} The room name if found, otherwise null.
 */
function getRoomFromState(stateId) {
	let id = stateId;

	while (id) {
		if (stateToRoomMap[id]) return stateToRoomMap[id];

		// Remove last path segment
		const lastDot = id.lastIndexOf(".");
		if (lastDot === -1) break;
		id = id.substring(0, lastDot);
	}

	return null; // nothing found
}

/**
 * @param {string} stateId State-ID, der das "rooms"-Enum zugeordnet ist
 * @param {number} [roomIndex] Welcher der Räume, falls mehrere zugeordnet wurden (default = 0)
 * @return {string} Gibt den zugeordneten Raum eines states zurück
 */
function getAssignedRoomFromState(getObject, stateId, roomIndex = 0) {
	const rooms = getObject(stateId, "rooms");
	const roomNames = rooms ? rooms.enumNames : "";

	if (roomNames.length === 0 || roomIndex >= roomNames.length) return "";

	return roomNames[roomIndex];
}

/**
 * Bestimmt den Wert des Enums "DefaultValueXX" eines States, z.B."DefaultValue4568" -> 4568
 * @param {string} stateId State-ID, der das Enum "DefaultValueXX" zugeordnet ist
 * @return {string || number} Gibt den Wert von DefaultValue" zurück oder "" wenn nicht zugeordnet
 */
function getDefaultValueEnum(existsState, getObject, stateId) {
	var defValue = "";

	if (existsState(stateId)) {
		const obj = getObject(stateId, "functions");

		if (obj && obj.enumNames) {
			var defEnum = obj.enumNames.find(element => element.startsWith("DefaultValue"));

			if (defEnum) {
				defValue = defEnum.replace("DefaultValue", "");
				defValue = parseInt(defValue); // als number parsen
			}
		}
	}

	return defValue;
}

/**
 * @param {{ [x: string]: any; }} enumeration
 * @param {string} value
 * @return {string}
 */
function stringOfEnum(enumeration, value) {
	for (var k in enumeration) if (enumeration[k] == value) return k;
	return null;
}

/**
 * @param {object} stateObj ioBroker-Objekt, das das State-Mapping enthält
 * @param {string} value Zu mappender Wert
 * @return {string} Gemappter Wert oder "NOT_MAPPED", wenn kein Mapping vorhanden oder Wert im Mapping nicht gefunden
 */
function mapStateValueToStateEnum(stateObj, value) {
	var mappedValue = "NOT_MAPPED";

	if (!stateObj) return mappedValue;

	const statesEnum = stateObj.common.states;

	if (statesEnum && value in statesEnum) {
		mappedValue = stateObj.common.states[value];
	}

	return mappedValue;
}

/**
 * @param {string} room Der zu übersetzende deutsche Raumname
 * @return {string} Der übersetzte englische Raumname oder "" wenn nicht vorhanden
 */
function translateRoomNameToEnglish(room) {
	const source = commonDefines.ROOMS;
	const target = commonDefines.ROOMS_EN;

	// Bereits übersetzt, dann nichts tun
	if (Object.values(target).includes(room)) {
		return room;
	}

	for (const key in source) {
		if (source[key] === room) {
			return target[key];
		}
	}

	return "";
}

/**
 * @param {string} room Der zu übersetzende englische Raumname
 * @return {string} Der übersetzte deutsche Raumname oder "" wenn nicht vorhanden
 */
function translateRoomNameToGerman(room) {
	const source = commonDefines.ROOMS_EN;
	const target = commonDefines.ROOMS;

	// Bereits übersetzt, dann nichts tun
	if (Object.values(target).includes(room)) {
		return room;
	}

	for (const key in source) {
		if (source[key] === room) {
			return target[key];
		}
	}

	return "";
}

/**
 * @param {number} value
 * @param {number} in_min Original range min
 * @param {number} in_max Original range max
 * @param {number} out_min Mapped range min
 * @param {number} out_max Mapped range max
 * @return {number}
 */
function mapRange(value, in_min, in_max, out_min, out_max) {
	if (value < in_min || value > in_max) return value;
	return Math.round(((value - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min);
}

/**
 * @return {boolean} Indicates if the system was restarted less than 5 minutes ago
 */
function wasIoBrokerRebooted(getState) {
	const threshold = 5 * 60; // in seconds
	const uptime = getState("system.host.raspberrypi-gang.uptime").val;
	return uptime && uptime < threshold;
}

/**
 * @return {object} Returns common.states from given id as array
 */
function getStatesObj(getObject, id) {
	if (!getObject(id)) {
		return null;
	}
	var obj = getObject(id);
	if (!obj.common.states) {
		return null;
	}
	var states = obj.common.states;
	if (typeof states == "string") {
		var arr = states.split(";");
		states = {};
		for (var i = 0; i < arr.length; i++) {
			var ele = arr[i].split(":");
			states[ele[0]] = ele[1];
		}
	}
	return states;
}

/**
* @return {string} Returns the corresponding string text from common.states
e.g.
    "states": {
      "0": "No faults",
      "1": "Sensor PM Error",
      "2": "Temp Error",
      "3": "Hum Error",
      "4": "No Filter"
    }

    getStateText("XXX", 2) -> "Temp Error"
*/
function getStateText(getObject, id, val) {
	var states = getStatesObj(getObject, id);
	if (states) return states[val];
	else return null;
}

module.exports = {
	buildStateToRoomMap,
	clamp,
	getAssignedRoomFromState,
	getDefaultValueEnum,
	getRoomFromState,
	getStateText,
	isRoomIndoor,
	mapRange,
	mapStateValueToStateEnum,
	occurrences,
	roundValue,
	stringOfEnum,
	translateRoomNameToEnglish,
	translateRoomNameToGerman,
	wasIoBrokerRebooted,
};
