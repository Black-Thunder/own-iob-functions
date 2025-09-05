/* eslint-disable jsdoc/check-param-names */
"use strict";

const PING_DEVICES = {
	PC_DOMI: "192_168_2_150",
	SMARTFRIENDSBOX: "192_168_2_153",
	SPEED_HOME_WLAN_OMA: "192_168_2_233",
	SMARTPHONE_DOMINIK: "192_168_2_30",
	SMARTPHONE_MARION: "192_168_2_31",
};

const idPingAdapterPrefix = "ping.0.";
const idAliveSuffix = ".alive";
const idRpsSuffix = ".rps";
const idAliveTimeSuffix = ".time";

/**
 * @param {string} id via PING_DEVICES
 * @returns {boolean}
 */
function isDevicePingable(getState, id) {
	return getState(idPingAdapterPrefix + id + idAliveSuffix).val;
}

/**
 * @param {string} id via PING_DEVICES
 * @returns {number}
 */
function getDevicePingRPS(getState, id) {
	return getState(idPingAdapterPrefix + id + idRpsSuffix).val;
}

/**
 * @param {string} id via PING_DEVICES
 * @returns {number}
 */
function getDevicePingAliveTime(getState, id) {
	return getState(idPingAdapterPrefix + id + idAliveTimeSuffix).val;
}

module.exports = {
	PING_DEVICES,
	isDevicePingable,
	getDevicePingRPS,
	getDevicePingAliveTime,
};
