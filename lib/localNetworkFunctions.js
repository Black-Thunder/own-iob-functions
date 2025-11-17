/* eslint-disable jsdoc/check-types */
/* eslint-disable jsdoc/check-param-names */
"use strict";

const axios = require("axios");
const { exec } = require("child_process");

const piholeHost = "192.168.2.5"; // Pi-hole (Container) IP
const piholePort = 8180;
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
		if (l.hwaddr && l.ip) {
			map[l.hwaddr.toLowerCase()] = l.ip;
		}
	}
	return map;
}

/**
 * Retrieves the system ARP table by executing "arp -an" and parsing its output.
 *
 * The promise resolves to an object whose keys are MAC addresses (lowercased,
 * colon-separated) and whose values are the corresponding IPv4 addresses as strings.
 * If the command fails or produces no output, the promise resolves to an empty object.
 *
 * Uses a regex to extract entries like:
 *   ? (192.168.2.160) at 04:cf:8c:b1:e3:ef [ether] on br0
 *
 * @async
 * @returns {Promise<Record<string, string>>} Promise resolving to a map of MAC -> IP.
 * @example
 * // Returns:
 * // { '04:cf:8c:b1:e3:ef': '192.168.2.160', 'aa:bb:cc:dd:ee:ff': '192.168.2.161' }
 */
function getArpTable() {
	return new Promise(resolve => {
		exec("arp -an", (error, stdout) => {
			const result = {};

			if (error || !stdout) {
				return resolve(result);
			}

			/*
			 * Example ARP output line:
			 * ? (192.168.2.160) at 04:cf:8c:b1:e3:ef [ether] on br0
			 */
			const regex = /\((.*?)\)\s+at\s+([0-9a-f:]{17})/gi;

			let match;
			while ((match = regex.exec(stdout)) !== null) {
				const ip = match[1];
				const mac = match[2].toLowerCase();
				result[mac] = ip;
			}

			resolve(result);
		});
	});
}

/**
 * ARP + DHCP
 *
 * macMapping = {
 *    licht1: ["04:cf:xx", "randomFallbackMac"],
 *    strip2: ["aa:bb:cc:dd:ee:ff"]
 * }
 *
 * Priority:
 * 1. ARP-table (most up to date, only if device active)
 * 2. DHCP lease table
 * 3. null
 *  @param {Object.<string, Array<string>>} macMapping - Object mapping logical names to arrays of MAC addresses to lookup.
 * @returns {Promise<Object>} Object mapping logical names to IP addresses (null if not found).
 */
async function getIpsForMacMappingCombined(getStateAsync, macMapping) {
	const { sid } = await getSid(getStateAsync);

	// load data
	const [leases, arpMap] = await Promise.all([getDhcpLeases(sid), getArpTable()]);

	const dhcpMap = leasesToMacIpMap(leases);

	const result = {};

	for (const logicalName of Object.keys(macMapping)) {
		const macList = macMapping[logicalName];
		let ip = null;

		// 1️⃣ ARP: live devices
		for (const mac of macList) {
			const m = mac.toLowerCase();
			if (arpMap[m]) {
				ip = arpMap[m];
				break;
			}
		}

		// 2️⃣ DHCP fallback
		if (!ip) {
			for (const mac of macList) {
				const m = mac.toLowerCase();
				if (dhcpMap[m]) {
					ip = dhcpMap[m];
					break;
				}
			}
		}

		result[logicalName] = ip;
	}

	return result;
}

module.exports = {
	getIpsForMacMappingCombined,
};
