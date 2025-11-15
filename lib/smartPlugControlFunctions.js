/* eslint-disable jsdoc/check-param-names */
"use strict";

const dateTimeFunctions = require("./dateTimeFunctions.js");

/// alias: Sockets-struct:
//  Sockets
//      SocketName
//          CURRENT
//          SET
//          LAST_UPDATED
//          WORKING
//          ...

const aliasStatePrefix = "alias.0.Sockets.";
const powerSuffix = ".SET";
const connectionSuffix = ".WORKING";
const lastUpdateSuffix = ".LAST_UPDATED";

const PLUGS = {
	OSMOSEANLAGE: "ReverseOsmosisSystem",
	TERRARIUM_ADA_LED_PANEL: "TerrariumADA.LEDPanel",
	TERRARIUM_NEPENTHES_LICHT: "TerrariumNepenthes.Lighting",
	MARKISE: "SunblindCharger",
};

/**
 * @param {string} plug via PLUGS
 * @param {number} [duration] power off socket again after given amount of time (in seconds, default = -1)
 */
function enablePlug(setState, setStateDelayed, plug, duration = -1) {
	const powerState = `${aliasStatePrefix}${plug}${powerSuffix}`;

	setState(powerState, true);

	if (duration > 0) {
		setStateDelayed(powerState, false, duration * 1000, true);
	}
}

/**
 * @param {string} plug via PLUGS
 */
function disablePlug(setState, plug) {
	const powerState = `${aliasStatePrefix}${plug}${powerSuffix}`;
	setState(powerState, false);
}

/**
 * @param {string} plug via PLUGS
 * @returns {boolean}
 */
function getPlugState(getState, plug) {
	const powerState = `${aliasStatePrefix}${plug}${powerSuffix}`;
	return getState(powerState).val;
}

/**
 * @param {string} plug via PLUGS
 * @returns {boolean}
 */
function isPlugConnected(log, getState, compareTime, existsState, plug) {
	const connectionState = `${aliasStatePrefix}${plug}${connectionSuffix}`;

	if (existsState(connectionState)) {
		return getState(connectionState).val;
	}

	// Nicht jede Steckdose liefert connectionState direkt; Versuch über letztes Update
	const lastUpdateState = `${aliasStatePrefix}${plug}${lastUpdateSuffix}`;

	if (existsState(lastUpdateState)) {
		const lastUpdateDate = new Date(getState(lastUpdateState).val);

		if (lastUpdateDate == null) {
			log(`isPlugConnected(): Ermittlung des Zustands von '${plug}' fehlgeschlagen!`, "error");
			return false;
		}

		let oldestAllowedUpdateDate = new Date(lastUpdateDate);
		oldestAllowedUpdateDate = dateTimeFunctions.manipulateDate(oldestAllowedUpdateDate, 5); // letztes Update darf max. 5 Minuten her sein

		return compareTime(lastUpdateDate, oldestAllowedUpdateDate, "between");
	}

	log(`isPlugConnected(): Ermittlung des Zustands von '${plug}' fehlgeschlagen!`, "error");
	return false; // wenn gar nix geht
}

module.exports = {
	PLUGS,
	enablePlug,
	disablePlug,
	getPlugState,
	isPlugConnected,
};
