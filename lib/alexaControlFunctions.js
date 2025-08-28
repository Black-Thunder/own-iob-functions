"use strict";

const commonFunctions = require("./commonFunctions.js");
const presenceFunctions = require("./presenceFunctions.js");

const idAlexaEchoDevicesPrefix = "alexa2.0.Echo-Devices.";

const ECHO_DEVICES = {
	FLUR: "G0911W0794153HRJ",
	KUECHE: "G0911M0793154PLW",
	BAD: "G0G2HN03401402AX",
	SCHLAFZIMMER: "G0G2HN03339300TM",
	FIRE_TV_CUBE: "G0723H0724130AMW",
	STEREO_PAAR: "8290d11ce3aa4f7f8fc23d8fd0dbc8e8",
	EVERYWHERE: "182c16b373b342d7b54966a2ebbd4d28",
};

const ECHO_CURATED_TTS_TYPES = {
	GOODBYE: "goodbye",
	CONFIRMATIONS: "confirmations",
	GOODMORNING: "goodmorning",
	COMPLIMENTS: "compliments",
	GEBURTSTAG: "birthday",
	GOODNIGHT: "goodnight",
	IAMHOME: "iamhome",
};

const allEchoDevices = [
	ECHO_DEVICES.FLUR,
	ECHO_DEVICES.KUECHE,
	ECHO_DEVICES.BAD,
	ECHO_DEVICES.SCHLAFZIMMER,
	ECHO_DEVICES.FIRE_TV_CUBE,
];

/**
 * @param {number} [level] Volume level (default = 16)
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.FLUR)
 */
function changeAlexaPlayerVolume(setState, level = 16, echoDeviceId = ECHO_DEVICES.FLUR) {
	if (level < 0) level = 0;
	if (level > 100) level = 100;
	setState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Player.volume`, level);
}

/**
 * @param {boolean} [enable] DND ein- oder ausschalten
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.FLUR)
 */
function setAlexaDND(setState, enable, echoDeviceId = ECHO_DEVICES.FLUR) {
	setState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Commands.doNotDisturb`, enable);
}

/**
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.FLUR)
 */
function getAlexaDND(getState, echoDeviceId = ECHO_DEVICES.FLUR) {
	return getState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Commands.doNotDisturb`).val;
}

/**
 * @param {string} ttsType Pre-defined TTS output (via ECHO_CURATED_TTS_TYPES)
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.FLUR)
 */
function triggerAlexaCuratedTTS(setState, ttsType, echoDeviceId = ECHO_DEVICES.FLUR) {
	changeAlexaPlayerVolume(setState, 0);
	setState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Commands.curatedtts`, ttsType);
	setTimeout(() => changeAlexaPlayerVolume(setState), 5000);
}

/**
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.STEREO_PAAR)
 */
function pauseAlexaPlayer(setState, echoDeviceId = ECHO_DEVICES.STEREO_PAAR) {
	setState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Player.controlPause`, true);
}

/**
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.STEREO_PAAR)
 */
function startAlexaPlayer(setState, echoDeviceId = ECHO_DEVICES.STEREO_PAAR) {
	setState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Player.controlPlay`, true);
}

/**
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.STEREO_PAAR)
 * @return {string}
 */
function getAlexaPlayerCurrentTitle(getState, echoDeviceId = ECHO_DEVICES.STEREO_PAAR) {
	return getState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Player.currentTitle`).val;
}

/**
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.STEREO_PAAR)
 * @return {string}
 */
function getAlexaPlayerCurrentProviderId(getState, echoDeviceId = ECHO_DEVICES.STEREO_PAAR) {
	return getState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Player.providerId`).val;
}

/**
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.STEREO_PAAR)
 * @return {boolean}
 */
function getAlexaPlayerCurrentState(getState, echoDeviceId = ECHO_DEVICES.STEREO_PAAR) {
	return getState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Player.currentState`).val;
}

/**
 * @param {string} text
 * @param {boolean} voiceOutput
 * @param {boolean} pushOutput
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.FLUR)
 * @param {boolean} [overrideDND] DND ignorieren (default = false)
 * @param {number} [overrideVolume] Temporäre Lautstärke, falls DND ignoriert wird (default = 50)
 */
function outputToAlexa(
	getState,
	setState,
	text,
	voiceOutput,
	pushOutput,
	echoDeviceId = ECHO_DEVICES.FLUR,
	overrideDND = false,
	overrideVolume = 50,
) {
	if (text == "") return;

	if (voiceOutput) {
		outputToEchoDot(getState, setState, text, echoDeviceId, overrideDND, overrideVolume);
	}
	if (pushOutput) {
		outputToAlexaApp(setState, text, echoDeviceId);
	}
}

/**
 * @param {string} voiceText Doku: https://developer.amazon.com/de-DE/docs/alexa/custom-skills/speech-synthesis-markup-language-ssml-reference.html
 * @param {string} [echoDeviceId] Device ID (via ECHO_DEVICES, default = ECHO_DEVICES.FLUR)
 * @param {boolean} [overrideDND] DND ignorieren (default = false)
 * @param {number} [overrideVolume] Temporäre Lautstärke, falls DND ignoriert wird (default = 50)
 */
function outputToEchoDot(
	getState,
	setState,
	voiceText,
	echoDeviceId = ECHO_DEVICES.FLUR,
	overrideDND = false,
	overrideVolume = 50,
) {
	// Um DND zu ignorieren, speak benutzen
	if (overrideDND) {
		overrideVolume = commonFunctions.clamp(overrideVolume, 0, 100);
		voiceText = `${overrideVolume};<speak>${voiceText}</speak>`;
		setState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Commands.speak`, voiceText); // speak ignoriert DND
	}
	// default SSML
	else if (presenceFunctions.isAnybodyAtHome(getState)) {
		voiceText = `<speak><prosody volume=\"+6dB\">"${voiceText}</prosody></speak>`; // immer mit erhöhter Lautstärke ausgeben
		setState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Commands.ssml`, voiceText); // ssml berücksichtigt DND
	}
}

/**
 * @param {string} pushText
 * @param {string} echoDeviceId Device ID (via ECHO_DEVICES)
 */
function outputToAlexaApp(setState, pushText, echoDeviceId) {
	pushText = pushText.replace(",", ""); // Kommata entfernen (diese dienen nur als Pause bei der Sprachausgabe)
	setState(`${idAlexaEchoDevicesPrefix}${echoDeviceId}.Commands.notification`, pushText);
}

module.exports = {
	ECHO_DEVICES,
	ECHO_CURATED_TTS_TYPES,
	allEchoDevices,
	changeAlexaPlayerVolume,
	setAlexaDND,
	getAlexaDND,
	triggerAlexaCuratedTTS,
	pauseAlexaPlayer,
	startAlexaPlayer,
	getAlexaPlayerCurrentTitle,
	getAlexaPlayerCurrentProviderId,
	getAlexaPlayerCurrentState,
	outputToAlexa,
	outputToEchoDot,
	outputToAlexaApp,
};
