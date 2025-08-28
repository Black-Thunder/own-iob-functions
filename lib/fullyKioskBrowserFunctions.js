"use strict";

const commonFunctions = require("./commonFunctions.js");

const idFullyBrowserInstancePrefix = "fullybrowser.0.Smart_Home_Tablet.";
const idFullyBrowserCommands = "Commands.";
const idFullyBrowserLoadStartUrl = "loadStartURL";
const idFulyBrowserScreenBrightness = "screenBrightness";

function goToStartUrl(setState) {
	setState(`${idFullyBrowserInstancePrefix}${idFullyBrowserCommands}${idFullyBrowserLoadStartUrl}`, true);
}

/**
 * @param {number} [bri=50] Wertebereich: 0-100 (0 = Min, 100 = Max; default = 50)
 */
function setDisplayBrightness(setState, bri = 50) {
	if (bri < 0 && bri > 100) bri = 50;
	const mappedValue = commonFunctions.mapRange(bri, 0, 100, 1, 255); // Fully erwartet einen Wertebereich von 1-255

	setState(`${idFullyBrowserInstancePrefix}${idFullyBrowserCommands}${idFulyBrowserScreenBrightness}`, mappedValue);
}

/**
 * @return {number} Helligkeit im Wertebereich: 0-100 (0 = Min, 100 = Max)
 */
function getDisplayBrightness(getState) {
	return getState(`${idFullyBrowserInstancePrefix}${idFullyBrowserCommands}${idFulyBrowserScreenBrightness}`);
}

module.exports = { setDisplayBrightness, getDisplayBrightness, goToStartUrl };
