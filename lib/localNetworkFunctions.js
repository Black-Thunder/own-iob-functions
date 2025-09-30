/* eslint-disable jsdoc/check-types */
/* eslint-disable jsdoc/check-param-names */
"use strict";

const axios = require("axios");

const piholeHost = "192.168.2.5"; // Pi-hole (Container) IP
const piholePort = 8080;
const baseUrl = `http://${piholeHost}:${piholePort}`;
const idPihholeApiPassword = "0_userdata.0.SecretsManager.PiholeApiPassword";

/**
 * Authenticate and get SID
 */
async function getSid(getStateAsync) {
	const url = `${baseUrl}/api/auth`;
	const pwObj = await getStateAsync(idPihholeApiPassword);
	const pwd = pwObj ? pwObj.val : null;
	const payload = { password: pwd };
	const res = await axios.post(url, payload, { timeout: 5000 });

	if (!res.data || !res.data.session || !res.data.session.sid) {
		return {};
	}

	return { sid: res.data.session.sid, csrf: res.data.session.csrf, validity: res.data.session.validity };
}

/**
 * Retrieves the list of DHCP leases from the local network Pi-hole API.
 *
 * @async
 * @param {string} sid - The session ID used for authentication in the request header.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of DHCP lease objects. Returns an empty array if no leases are found.
 */
async function getDhcpLeases(sid) {
	const url = `${baseUrl}/api/dhcp/leases`;
	const res = await axios.get(url, { headers: { "X-FTL-SID": sid }, timeout: 5000 });

	if (!res.data || !Array.isArray(res.data.leases)) {
		return [];
	}

	return res.data.leases;
}

/**
 * Converts an array of lease objects to a mapping of MAC addresses to IP addresses.
 *
 * @param {Array<{ hwaddr: string, ip: string }>} leases - Array of lease objects containing MAC and IP addresses.
 *  example for leases entry:
        {
            "expires": 1759269116,
            "hwaddr": "04:cf:8c:b1:e3:b3",
            "ip": "192.168.2.200",
            "name": "yeelink-light-strip2_miape3b3",
            "clientid": "*"
        }
 * @returns {Object.<string, string>} An object mapping MAC addresses (lowercased) to their corresponding IP addresses.
 */
function leasesToMacIpMap(leases) {
	const map = {};

	for (const l of leases) {
		const mac = l.hwaddr;
		const ip = l.ip;
		if (mac && ip) {
			map[mac.toLowerCase()] = ip;
		}
	}
	return map;
}

/**
 * Retrieves IP addresses for multiple MAC addresses in one call.
 *
 * @param {Array<string>} macAddresses - Array of MAC addresses to lookup.
 * @returns {Promise<Object>} Object mapping MAC addresses to IP addresses (null if not found).
 */
async function getIpsForMacAddresses(getStateAsync, macAddresses) {
	const { sid } = await getSid(getStateAsync);
	const leases = await getDhcpLeases(sid);
	const mac2ip = leasesToMacIpMap(leases);

	const result = {};
	for (const mac of macAddresses) {
		const normalizedMac = mac.toLowerCase();
		result[mac] = mac2ip[normalizedMac] || null;
	}
	return result;
}

module.exports = {
	getIpsForMacAddresses,
};
