"use strict";

const commonDefines = require("./commonDefines.js");
const commonFunctions = require("./commonFunctions.js");

const YEELIGHT_SCENES = {
	CANDLE_FLICKER: "candle_flicker",
	HAPPY_BIRTHDAY: "happy_birthday",
	NOTIFICATION: "notification",
	ROMANTIC_LIGTHS: "romantic_lights",
	SUNRISE: "sunrise",
	SUNSET: "sunset",
};

const idYeelightPowerSuffix = ".control.power";
const idYeelightBgPowerSuffix = ".control.bg_power";
const idYeelightSetSceneSuffix = ".control.set_scene";
const idYeelightColorTemperatureSuffix = ".control.ct";
const idYeelightBgColorTemperatureSuffix = ".control.bg_ct";
const idYeelightBrightnessSuffix = ".control.active_bright";
const idYeelightBgBrightnessSuffix = ".control.bg_bright";
const idYeelightBgRgbSuffix = ".control.bg_rgb";
const idYeelightMoonModeSuffix = ".control.moon_mode";
const idYeelightReachableSuffix = ".info.connect";
const idYeelightScenenSuffix = ".scenen.";

const idAliasPowerSuffix = ".SET";
const idAliasReachableSuffix = ".WORKING";
const idAliasBrightnessSuffix = ".BRIGHTNESS";
const idAliasColorTemperatureSuffix = ".COLOR_TEMPERATURE";

const mainLightColorTemperaturDay = 4000; // in K
const mainLightColorTemperaturNight = 3000; // in K
const ambientLightColorTemperaturDay = 5500; // in K
const ambientLightColorTemperaturNight = 4000; // in K
const defaultColorTemperaturDay = 5500; // in K
const defaultColorTemperaturNight = 4000; // in K

const colorNight = 16775347;
const colorDay = 16777215;

const lightAliasMap = new Map(); // Hält die Zuordnung der yeelight-Objekte zu den zugehörigen Alias-Objekten
let isLightAliasMapInitialized = false;
const lightAliasMapPendantAmbienceSuffix = "_Pendant_Ambience"; // nötig zur Unterscheidung, da Pendelleuchten mit derselben ID sowohl auf Main als auch Ambience gemappt sind
const lightAliasMapPendantMainSuffix = "_Pendant_Main";

//#region Hauptfunktionen AmbientLights

/**
 * @param {string} room via Rooms
 * @returns {boolean}
 */
function hasAmbientLights($, room) {
	return (
		$(
			`state[state.id=alias.0.Lights.Ambience.${commonFunctions.translateRoomNameToEnglish(room)}.*${idAliasPowerSuffix}]`,
		).length > 0
	);
}

/**
 * @param {string} room via Rooms
 */
function invertAmbientLightsState(
	$,
	log,
	getEnums,
	getState,
	setState,
	setStateDelayed,
	getObject,
	existsState,
	clearStateDelayed,
	room,
	isNight,
) {
	const ambientOnArray = getAmbientLightStates($, log, getState, getObject, room);

	if (!ambientOnArray || ambientOnArray.length == 0) {
		return;
	}

	// Das erste Element finden, das erreichbar ist (Index 2) und diesen Zustand auswerten (Index 1)
	let isOn = false;
	ambientOnArray.some(function (ambientInfo, index) {
		if (ambientInfo[2]) {
			isOn = ambientInfo[1];
			return true;
		}
	});

	isOn
		? powerAmbientLightsOff($, log, getState, setState, setStateDelayed, getObject, room)
		: powerAmbientLightsOn(
				$,
				log,
				getEnums,
				getState,
				setState,
				getObject,
				existsState,
				clearStateDelayed,
				room,
				isNight,
			);
}

/**
 * @param {string} room via Rooms
 */
function invertAmbientLightsColorTemperature($, log, getState, setState, getObject, existsState, room) {
	const ambientCTs = getAmbientLightsColorTemperature($, log, getState, getObject, existsState, room);

	if (!ambientCTs || ambientCTs.length == 0) {
		return;
	}

	// Immer auf das erste Element gehen und diesen Zustand auswerten
	ambientCTs[0][1] == ambientLightColorTemperaturDay
		? setAmbientLightsColorTemperature(
				$,
				log,
				getState,
				setState,
				getObject,
				existsState,
				room,
				ambientLightColorTemperaturNight,
			)
		: setAmbientLightsColorTemperature(
				$,
				log,
				getState,
				setState,
				getObject,
				existsState,
				room,
				ambientLightColorTemperaturDay,
			);
}

/**
 * @param {string} room via Rooms
 * @param {number} level
 */
function setAmbientLightsBrightnessLevel($, log, getState, setState, getObject, existsState, room, level) {
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);

	if (ambientLightIds.length == 0) {
		log(`setAmbientLightsBrightnessLevel() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	if (level > 100) {
		level = 100;
	}
	if (level < 0) {
		level = 0;
	}

	ambientLightIds.forEach(ambientLightId => {
		setTimeout(() => {
			if (ambientLightId.includes("alias.")) {
				setAliasDeviceBrightness(getState, setState, existsState, ambientLightId, level);
			} else {
				setYeelightBrightness(getState, setState, ambientLightId, level);
			}
		}, 0);
	});
}

/**
 * Setzt die Standardhelligkeit für alle Ambientebeleuchtungen in einem Raum (nur wenn jeweilige Leuchte eingeschaltet)
 * @param {string} room via Rooms
 */
function setAmbientLightsDefaultBrightnessLevel($, log, getEnums, getState, setState, getObject, existsState, room) {
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);

	if (ambientLightIds.length == 0) {
		log(`setAmbientLightsDefaultBrightnessLevel() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	ambientLightIds.forEach(ambientLightId => {
		setTimeout(async () => {
			const defBri = await getLightDefaultBrightnessLevel(
				getEnums,
				getObject,
				existsState,
				ambientLightId,
				false,
			);

			if (ambientLightId.includes("alias.")) {
				if (isAliasDeviceOn(getState, ambientLightId)) {
					setAliasDeviceBrightness(getState, setState, existsState, ambientLightId, defBri);
				}
			} else {
				if (isYeelightOn(getState, ambientLightId)) {
					setYeelightBrightness(getState, setState, ambientLightId, defBri);
				}
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @param {number} [step] Step in which brightnes should be increased (default = 1)
 */
function increaseAmbientLightsBrightnessLevel($, log, getState, setState, getObject, existsState, room, step = 1) {
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);

	if (ambientLightIds.length == 0) {
		log(`increaseAmbientLightsBrightnessLevel() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	ambientLightIds.forEach(ambientLightId => {
		setTimeout(() => {
			if (ambientLightId.includes("alias.")) {
				var newBrightness = getAliasDeviceBrightness(getState, room) + step;
				if (newBrightness > 100) {
					newBrightness = 5;
				}
				setAliasDeviceBrightness(getState, setState, existsState, ambientLightId, newBrightness);
			} else {
				var newBrightness = getYeelightBrightness(getState, room) + step;
				if (newBrightness > 100) {
					newBrightness = 5;
				}
				setYeelightBrightness(getState, setState, ambientLightId, newBrightness);
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @param {boolean} isNight Flag, ob Nachtfarben und -helligkeit gewünscht wird
 */
function powerAmbientLightsOn(
	$,
	log,
	getEnums,
	getState,
	setState,
	getObject,
	existsState,
	clearStateDelayed,
	room,
	isNight,
) {
	// Zuerst prüfen, ob es eine passende Lichtergruppe gibt, über die man schalten kann -> nur ein Befehl statt x-Einzelbefehlen
	const lightingGroupId = getLightingGroupIdFromRoom($, room, false);

	if (lightingGroupId != "") {
		setState(lightingGroupId + idAliasPowerSuffix, true);

		// Kurz verzögern, da Setzen der Lichtfarbe nur im eingeschalteten Zustand erlaubt ist und es sonst evtl. zu einem Timingproblem kommt
		setTimeout(() => {
			setAmbientLightsDefaultBrightnessLevel($, log, getEnums, getState, setState, getObject, existsState, room);
			setAmbientLightsDefaultColorTemperature($, log, getState, setState, getObject, existsState, room, isNight);
		}, 1000);
	}

	// Verbleibende Leuchten einzeln schalten, die in keiner Gruppe sind (Yeelight)
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);

	if (ambientLightIds.length == 0) {
		log(`powerAmbientLightsOn() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	const desiredColor = getDesiredColor(isNight);
	const desiredColorTemperatureAmbient = getDesiredColorTemperature(room, false, isNight);

	ambientLightIds.forEach(ambientLightId => {
		setTimeout(async () => {
			const desiredBrightnessAmbient = await getLightDefaultBrightnessLevel(
				getEnums,
				getObject,
				existsState,
				ambientLightId,
				false,
			);

			if (ambientLightId.includes("alias.")) {
				// Wurde sonst schon über die Gruppe geschaltet
				if (lightingGroupId == "") {
					powerOnAliasDevice(
						getState,
						setState,
						existsState,
						ambientLightId,
						desiredColorTemperatureAmbient,
						desiredBrightnessAmbient,
					);
				}
			} else {
				powerOnYeelight(
					getState,
					setState,
					clearStateDelayed,
					ambientLightId,
					isNight,
					"color",
					desiredColor,
					desiredBrightnessAmbient,
					null,
					true,
				);
				powerOnYeelight(
					getState,
					setState,
					clearStateDelayed,
					ambientLightId,
					isNight,
					"ct",
					desiredColorTemperatureAmbient,
					desiredBrightnessAmbient,
					null,
					true,
				);
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @param {number} [delay] Delay when powering off (default = 0)
 */
function powerAmbientLightsOff($, log, getState, setState, setStateDelayed, getObject, room, delay = 0) {
	// Zuerst prüfen, ob es eine passende Lichtergruppe gibt, über die man schalten kann -> nur ein Befehl statt x-Einzelbefehlen
	const lightingGroupId = getLightingGroupIdFromRoom($, room, false);

	if (lightingGroupId != "") {
		setState(lightingGroupId + idAliasPowerSuffix, false);
	}

	// Verbleibende Leuchten einzeln schalten, die in keiner Gruppe sind (Yeelight)
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);

	if (ambientLightIds.length == 0) {
		log(`powerAmbientLightsOff() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	ambientLightIds.forEach(ambientLightId => {
		setTimeout(() => {
			if (ambientLightId.includes("alias.")) {
				// Wurde sonst schon über die Gruppe geschaltet
				if (lightingGroupId == "") {
					powerOffAliasDevice(getState, setStateDelayed, ambientLightId);
				}
			} else {
				powerOffYeelight(getState, setStateDelayed, ambientLightId, delay * 1000, true);
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @param {number} ct (in Kelvin)
 */
function setAmbientLightsColorTemperature($, log, getState, setState, getObject, existsState, room, ct) {
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);

	if (ambientLightIds.length == 0) {
		log(`setAmbientLightsColorTemperature() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	ambientLightIds.forEach(ambientLightId => {
		setTimeout(() => {
			if (ambientLightId.includes("alias.")) {
				setColorTemperatureAliasDevice(getState, setState, existsState, ambientLightId, ct, true);
			} else {
				setColorTemperatureYeelight(getState, setState, existsState, ambientLightId, ct);
			}
		}, 0);
	});
}

/**
 * Setzt die Standardfarbtemperatur für alle Ambientebeleuchtungen in einem Raum (nur wenn jeweilige Leuchte eingeschaltet)
 Wert wird entweder aus der State-Zuordnung "DefaultValueXX" (enum.functions) oder - falls nicht zugeordnet - aus der Funktion "getDesiredColorTemperature" bestimmt
 * @param {string} room via Rooms
 * @param {boolean} isNight Flag, ob Nachtfarben und -helligkeit gewünscht wird
 */
function setAmbientLightsDefaultColorTemperature($, log, getState, setState, getObject, existsState, room, isNight) {
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);

	if (ambientLightIds.length == 0) {
		log(`setAmbientLightsDefaultColorTemperature() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	ambientLightIds.forEach(ambientLightId => {
		setTimeout(() => {
			let defValue = getDesiredColorTemperature(room, false, isNight); // zunächst die fix hinterlegte Farbtemperatur als Standard nehmen

			if (ambientLightId.includes("alias.")) {
				if (isAliasDeviceOn(getState, ambientLightId)) {
					const ctStateId = ambientLightId + idAliasColorTemperatureSuffix;
					const defaultValueEnum = commonFunctions.getDefaultValueEnum(existsState, getObject, ctStateId);
					defValue = defaultValueEnum != "" ? defaultValueEnum : defValue;

					setColorTemperatureAliasDevice(getState, setState, existsState, ambientLightId, defValue, true);
				}
			} else {
				if (isYeelightOn(getState, ambientLightId)) {
					const isPendant = isYeelightPendant(ambientLightId);
					const ctSuffix = isPendant ? idYeelightBgColorTemperatureSuffix : idYeelightColorTemperatureSuffix;
					const ctYeelightStateId = ambientLightId + ctSuffix;

					if (existsState(ctYeelightStateId)) {
						if (lightAliasMap.has(ambientLightId)) {
							const aliasId = lightAliasMap.get(ambientLightId);
							const ctAliasStateId = aliasId + idAliasColorTemperatureSuffix;
							const defaultValueEnum = commonFunctions.getDefaultValueEnum(
								existsState,
								getObject,
								ctAliasStateId,
							);
							defValue = defaultValueEnum != "" ? defaultValueEnum : defValue;
						}
					}

					setColorTemperatureYeelight(getState, setState, ambientLightId, defValue);
				}
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @returns {boolean[]} Array with all ambient light IDs und flag indicating if they're powered on and reachable [ID, isPoweredOn, isReachable] (sort order: alias -> yeelight)
 */
function getAmbientLightStates($, log, getState, getObject, room) {
	const areOn = [];

	// Zunächst prüfen, ob es eine Gruppe gibt -> Dann nur diesen Zustand zurückgeben, da die einzelnen Geräte in der Gruppe nicht den korrekten Zustand aufweisen
	const lightingGroupId = getLightingGroupIdFromRoom($, room, false);

	if (lightingGroupId != "") {
		const element = [lightingGroupId, getState(`${lightingGroupId}${idAliasPowerSuffix}`).val, true]; // Gruppe immer als erreichbar markieren
		areOn.push(element);
	}

	// Verbleibende Lichter auswerten
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);

	if (ambientLightIds.length == 0) {
		log(`getAmbientLightStates() - Unbekannter Raum: '${room}'`, "error");
		return areOn;
	}

	ambientLightIds.forEach(ambientLightId => {
		if (ambientLightId.includes("alias.")) {
			// Nur wenn nicht in einer Gruppe enthalten
			if (lightingGroupId == "") {
				var element = [
					ambientLightId,
					isAliasDeviceOn(getState, ambientLightId),
					isAliasDeviceReachable(getState, ambientLightId),
				];
				areOn.push(element);
			}
		} else {
			var element = [
				ambientLightId,
				isYeelightOn(getState, ambientLightId),
				isYeelightReachable(getState, ambientLightId),
			];
			areOn.push(element);
		}
	});

	return areOn;
}

/**
 * @param {string} room via Rooms
 * @returns {boolean} flag indicating if any ambient light is powered on and reachable
 */
function isAnyAmbientLightPoweredOn($, log, getState, getObject, room) {
	const ambientLightStates = getAmbientLightStates($, log, getState, getObject, room);
	let isAnyOn = false;

	ambientLightStates.forEach(state => {
		if (state[2] && state[1]) {
			isAnyOn = true;
		}
		return false; // frühzeitig rausspringen, da gefunden
	});

	return isAnyOn;
}

/**
 * @param {string} room via Rooms
 * @returns {number[]} Array with all ambient light IDs und color temperatures [ID, colorTemperature] (sort order: alias -> yeelight)
 */
function getAmbientLightsColorTemperature($, log, getState, getObject, existsState, room) {
	const ambientLightIds = getLightingIdsFromRoom($, log, getObject, room, false);
	const colorTemperatures = [];

	if (ambientLightIds.length == 0) {
		log(`getAmbientLightsColorTemperature() - Unbekannter Raum: '${room}'`, "error");
		return colorTemperatures;
	}

	ambientLightIds.forEach(ambientLightId => {
		if (ambientLightId.includes("alias.")) {
			var element = [ambientLightId, getAliasDeviceColorTemperature(getState, existsState, ambientLightId)];
			areOn.push(element);
		} else {
			var element = [ambientLightId, getYeelightColorTemperature(getState, existsState, ambientLightId)];
			colorTemperatures.push(element);
		}
	});

	return colorTemperatures;
}

//#endregion

//#region Hauptfunktionen MainLights
/**
 * @param {string} room via Rooms
 */
function hasMainLights($, room) {
	return (
		$(
			`state[state.id=alias.0.Lights.Main.${commonFunctions.translateRoomNameToEnglish(room)}.*${idAliasPowerSuffix}]`,
		).length > 0
	);
}

/**f
 * @param {string} room via Rooms
 */
function invertMainLightsState(
	$,
	log,
	getEnums,
	getState,
	setState,
	setStateDelayed,
	getObject,
	existsState,
	clearStateDelayed,
	room,
	isNight,
) {
	const mainOnArray = getMainLightStates($, log, getState, getObject, room);

	if (!mainOnArray || mainOnArray.length == 0) {
		return false;
	}

	// Das erste Element finden, das erreichbar ist (Index 2) und diesen Zustand auswerten (Index 1)
	let isOn = false;
	mainOnArray.some(function (mainInfo) {
		if (mainInfo[2]) {
			isOn = mainInfo[1];
			return true;
		}
	});

	isOn
		? powerMainLightsOff($, log, getState, setState, setStateDelayed, getObject, room)
		: powerMainLightsOn(
				$,
				log,
				getEnums,
				getState,
				setState,
				getObject,
				existsState,
				clearStateDelayed,
				room,
				isNight,
			);
}

/**
 * @param {string} room via Rooms
 */
function invertMainLightsColorTemperature($, log, getState, setState, getObject, existsState, room) {
	const mainCTs = getMainLightsColorTemperature($, log, getState, getObject, existsState, room);

	if (!mainCTs || mainCTs.length == 0) {
		return false;
	}

	mainCTs[0][1] == mainLightColorTemperaturDay
		? setMainLightsColorTemperature(
				$,
				log,
				getState,
				setState,
				getObject,
				existsState,
				room,
				mainLightColorTemperaturNight,
			)
		: setMainLightsColorTemperature(
				$,
				log,
				getState,
				setState,
				getObject,
				existsState,
				room,
				mainLightColorTemperaturDay,
			);
}

/**
 * @param {string} room via Rooms
 * @param {number} level (between 0 and 100)
 */
function setMainLightsBrightnessLevel($, log, getState, setState, getObject, existsState, room, level) {
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`setMainLightsBrightnessLevel() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	if (level > 100) {
		level = 100;
	}
	if (level < 0) {
		level = 0;
	}

	mainLightIds.forEach(mainLightId => {
		setTimeout(() => {
			if (mainLightId.includes("alias.")) {
				setAliasDeviceBrightness(getState, setState, existsState, mainLightId, level);
			} else {
				setYeelightBrightness(getState, setState, mainLightId, level);
			}
		}, 0);
	});
}

/**
 * Setzt die Standardhelligkeit für alle Hauptbeleuchtungen in einem Raum (nur wenn jeweilige Leuchte eingeschaltet)
 * @param {string} room via Rooms
 */
function setMainLightsDefaultBrightnessLevel($, log, getEnums, getState, setState, getObject, existsState, room) {
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`setMainLightsDefaultBrightnessLevel() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	mainLightIds.forEach(mainLightId => {
		setTimeout(async () => {
			const defBri = await getLightDefaultBrightnessLevel(getEnums, getObject, existsState, mainLightId, true);

			if (mainLightId.includes("alias.")) {
				if (isAliasDeviceOn(getState, mainLightId)) {
					setAliasDeviceBrightness(getState, setState, existsState, mainLightId, defBri);
				}
			} else {
				if (isYeelightOn(getState, mainLightId)) {
					setYeelightBrightness(getState, setState, mainLightId, defBri);
				}
			}
		}, 0);
	});
}

/**
 * @param {string} room
 * @param {number} [step] Step in which brightnes should be increased (default = 1)
 */
function increaseMainLightsBrightnessLevel($, log, getState, setState, getObject, existsState, room, step = 1) {
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`increaseMainLightsBrightnessLevel() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	mainLightIds.forEach(mainLightId => {
		setTimeout(() => {
			if (mainLightId.includes("alias.")) {
				var newBrightness = getAliasDeviceBrightness(getState, mainLightId) + step;
				if (newBrightness > 100) {
					newBrightness = 5;
				}
				setAliasDeviceBrightness(getState, setState, existsState, mainLightId, newBrightness);
			} else {
				var newBrightness = getYeelightBrightness(getState, mainLightId) + step;
				if (newBrightness > 100) {
					newBrightness = 5;
				}
				setYeelightBrightness(getState, setState, mainLightId, newBrightness);
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @param {boolean} isNight Flag, ob Nachtfarben und -hhelligkeit gewünscht wird
 */
function powerMainLightsOn(
	$,
	log,
	getEnums,
	getState,
	setState,
	getObject,
	existsState,
	clearStateDelayed,
	room,
	isNight,
) {
	// Zuerst prüfen, ob es eine passende Lichtergruppe gibt, über die man schalten kann -> nur ein Befehl statt x-Einzelbefehlen
	const lightingGroupId = getLightingGroupIdFromRoom($, room, true);

	if (lightingGroupId != "") {
		setState(lightingGroupId + idAliasPowerSuffix, true);

		// Kurz verzögern, da Setzen der Lichtfarbe nur im eingeschalteten Zustand erlaubt ist und es sonst evtl. zu einem Timingproblem kommt
		setTimeout(() => {
			setMainLightsDefaultBrightnessLevel($, log, getEnums, getState, setState, getObject, existsState, room);
			setMainLightsDefaultColorTemperature($, log, getState, setState, getObject, existsState, room, isNight);
		}, 1000);
	}

	// Verbleibende Leuchten einzeln schalten, die in keiner Gruppe sind (Yeelight)
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`powerMainLightsOn() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	const desiredColorTemperature = getDesiredColorTemperature(room, true, isNight);

	mainLightIds.forEach(mainLightId => {
		setTimeout(async () => {
			const desiredBrightness = await getLightDefaultBrightnessLevel(
				getEnums,
				getObject,
				existsState,
				mainLightId,
				true,
			);

			if (mainLightId.includes("alias.")) {
				// Wurde sonst schon über die Gruppe geschaltet
				if (lightingGroupId == "") {
					powerOnAliasDevice(
						getState,
						setState,
						existsState,
						mainLightId,
						desiredColorTemperature,
						desiredBrightness,
					);
				}
			} else {
				powerOnYeelight(
					getState,
					setState,
					clearStateDelayed,
					mainLightId,
					isNight,
					"ct",
					desiredColorTemperature,
					desiredBrightness,
				);
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @param {number} [delay] Delay when powering off (default = 0)
 */
function powerMainLightsOff($, log, getState, setState, setStateDelayed, getObject, room, delay = 0) {
	// Zuerst prüfen, ob es eine passende Lichtergruppe gibt, über die man schalten kann -> nur ein Befehl statt x-Einzelbefehlen
	const lightingGroupId = getLightingGroupIdFromRoom($, room, true);

	if (lightingGroupId != "") {
		setState(lightingGroupId + idAliasPowerSuffix, false);
	}

	// Verbleibende Leuchten einzeln schalten, die in keiner Gruppe sind (Yeelight)
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`powerMainLightsOff() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	mainLightIds.forEach(mainLightId => {
		setTimeout(() => {
			if (mainLightId.includes("alias.")) {
				// Wurde sonst schon über die Gruppe geschaltet
				if (lightingGroupId == "") {
					powerOffAliasDevice(getState, setStateDelayed, mainLightId, delay);
				}
			} else {
				powerOffYeelight(getState, setStateDelayed, mainLightId, delay);
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @param {number} ct
 */
function setMainLightsColorTemperature($, log, getState, setState, getObject, existsState, room, ct) {
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`setMainLightsColorTemperature() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	mainLightIds.forEach(mainLightId => {
		setTimeout(() => {
			if (mainLightId.includes("alias.")) {
				setColorTemperatureAliasDevice(getState, setState, existsState, mainLightId, ct, true);
			} else {
				setColorTemperatureYeelight(getState, setState, mainLightId, ct);
			}
		}, 0);
	});
}

/**
 * Setzt die Standardfarbtemperatur für alle Hauptbeleuchtungen in einem Raum (nur wenn jeweilige Leuchte eingeschaltet)
 Wert wird entweder aus der State-Zuordnung "DefaultValueXX" (enum.functions) oder - falls nicht zugeordnet - aus der Funktion "getDesiredColorTemperature" bestimmt
 * @param {string} room via Rooms
 * @param {boolean} isNight Flag, ob Nachtfarben und -helligkeit gewünscht wird
 */
function setMainLightsDefaultColorTemperature($, log, getState, setState, getObject, existsState, room, isNight) {
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`setMainLightsDefaultColorTemperature() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	mainLightIds.forEach(mainLightId => {
		setTimeout(() => {
			let defValue = getDesiredColorTemperature(room, true, isNight); // zunächst die fix hinterlegte Farbtemperatur als Standard nehmen

			if (mainLightId.includes("alias.")) {
				if (isAliasDeviceOn(getState, mainLightId)) {
					const ctStateId = mainLightId + idAliasColorTemperatureSuffix;
					const defaultValueEnum = commonFunctions.getDefaultValueEnum(existsState, getObject, ctStateId);
					defValue = defaultValueEnum != "" ? defaultValueEnum : defValue;

					setColorTemperatureAliasDevice(getState, setState, existsState, mainLightId, defValue, true);
				}
			} else {
				if (isYeelightOn(getState, mainLightId)) {
					const isPendant = isYeelightPendant(mainLightId);
					const ctSuffix = isPendant ? idYeelightBgColorTemperatureSuffix : idYeelightColorTemperatureSuffix;
					const ctYeelightStateId = mainLightId + ctSuffix;

					if (existsState(ctYeelightStateId)) {
						if (lightAliasMap.has(mainLightId)) {
							const aliasId = lightAliasMap.get(mainLightId);
							const ctAliasStateId = aliasId + idAliasColorTemperatureSuffix;
							const defaultValueEnum = commonFunctions.getDefaultValueEnum(
								existsState,
								getObject,
								ctAliasStateId,
							);
							defValue = defaultValueEnum != "" ? defaultValueEnum : defValue;
						}
					}

					setColorTemperatureYeelight(getState, setState, mainLightId, defValue);
				}
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @param {boolean} toEnable Flag, if moon mode should be enabled or not
 */
function setMainLightsMoonMode($, log, getState, setState, getObject, room, toEnable) {
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`setMainLightsMoonMode() - Unbekannter Raum: '${room}'`, "error");
		return;
	}

	mainLightIds.forEach(mainLightId => {
		setTimeout(() => {
			if (mainLightId.includes("alias.")) {
				// nichts tun, nur spezifisch für Yeelight
			} else {
				setYeelightMoonMode(getState, setState, mainLightId, toEnable);
			}
		}, 0);
	});
}

/**
 * @param {string} room via Rooms
 * @returns {boolean[]} Array with all main light IDs und flag indicating if they're powered on and reachable [ID, isPoweredOn, isReachable] (sort order: alias -> yeelight)
 */
function getMainLightStates($, log, getState, getObject, room) {
	const areOn = [];

	// Zunächst prüfen, ob es eine Gruppe gibt -> Dann nur diesen Zustand zurückgeben, da die einzelnen Geräte in der Gruppe nicht den korrekten Zustand aufweisen
	const lightingGroupId = getLightingGroupIdFromRoom($, room, true);

	if (lightingGroupId != "") {
		const element = [lightingGroupId, getState(`${lightingGroupId}${idAliasPowerSuffix}`).val, true]; // Gruppe immer als erreichbar markieren
		areOn.push(element);
	}

	// Verbleibende Lichter auswerten
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);

	if (mainLightIds.length == 0) {
		log(`getMainLightStates() - Unbekannter Raum: '${room}'`, "error");
		return areOn;
	}

	mainLightIds.forEach(mainLightId => {
		if (mainLightId.includes("alias.")) {
			// Nur wenn nicht in einer Gruppe enthalten
			if (lightingGroupId == "") {
				var element = [
					mainLightId,
					isAliasDeviceOn(getState, mainLightId),
					isAliasDeviceReachable(getState, mainLightId),
				];
				areOn.push(element);
			}
		} else {
			var element = [
				mainLightId,
				isYeelightOn(getState, mainLightId),
				isYeelightReachable(getState, mainLightId),
			];
			areOn.push(element);
		}
	});

	return areOn;
}

/**
 * @param {string} room via Rooms
 * @returns {boolean} flag indicating if any main light is powered on and reachable
 */
function isAnyMainLightPoweredOn($, log, getState, getObject, room) {
	const mainLightStates = getMainLightStates($, log, getState, getObject, room);
	let isAnyOn = false;

	mainLightStates.some(function (mainState, index) {
		if (mainState[2] && mainState[1]) {
			isAnyOn = true;
			return true; // frühzeitig rausspringen, da gefunden
		}
	});

	return isAnyOn;
}

/**
 * @param {string} room via Rooms
 * @returns {number[]}  Array with all main light IDs und color temperatures [ID, colorTemperature] (sort order: alias -> yeelight)
 */
function getMainLightsColorTemperature($, log, getState, getObject, existsState, room) {
	const mainLightIds = getLightingIdsFromRoom($, log, getObject, room, true);
	const colorTemperatures = [];

	if (mainLightIds.length == 0) {
		log(`getMainLightsColorTemperature() - Unbekannter Raum: '${room}'`, "error");
		return colorTemperatures;
	}

	mainLightIds.forEach(mainLightId => {
		if (mainLightId.includes("alias.")) {
			var element = [mainLightId, getAliasDeviceColorTemperature(getState, existsState, mainLightId)];
			colorTemperatures.push(element);
		} else {
			var element = [mainLightId, getYeelightColorTemperature(getState, existsState, mainLightId)];
			colorTemperatures.push(element);
		}
	});

	return colorTemperatures;
}

//#endregion

//#region Hilfsfunktionen Yeelight
/**
 * @param {string} id
 * @returns {boolean}
 */
function isYeelightPendant(id) {
	return id.includes("pendant") || id.includes("Pendant");
}

/**
 * Doku: https://github.com/iobroker-community-adapters/ioBroker.yeelight-2#set_scene
 * @param {string} id
 * @param {boolean} isNight Flag, ob Nachtfarben und -helligkeit gewünscht wird
 * @param {string} [className] default = ""
 * @param {number} [param1] default = 0
 * @param {number} [param2] default = 0
 * @param {number} [param3] default = 0
 * @param {boolean} [isAmbient] Flag, if is an ambient light or not (default = false)
 */
function powerOnYeelight(
	getState,
	setState,
	clearStateDelayed,
	id,
	isNight,
	className = "",
	param1 = 0,
	param2 = 0,
	param3 = 0,
	isAmbient = false,
) {
	if (!isYeelightReachable(getState, id)) {
		return;
	}

	// Sonderfall Pendelleuchte
	const isPendant = isYeelightPendant(id);
	const powerSuffix = isPendant && isAmbient ? idYeelightBgPowerSuffix : idYeelightPowerSuffix;

	// Eventuell anstehende State-Änderungen in der queue löschen (aus powerOffYeelight)
	clearStateDelayed(id + powerSuffix);

	// Nur einschalten
	if (className == "") {
		setState(id + powerSuffix, true);
	}
	// Ambiente der Pendelleuchte hat kein set_scene
	else if (isPendant && isAmbient) {
		switch (className) {
			case "hsv":
			case "cf":
			case "auto_delay_off":
				// Einfach nur einschalten
				setState(id + powerSuffix, true);
				break;
			case "color":
				setState(id + powerSuffix, true);
				setState(id + idYeelightBgRgbSuffix, getDesiredColorAsHex(isNight));
				break;
			case "ct":
				setState(id + powerSuffix, true);
				setColorTemperatureYeelight(getState, setState, id, param1);
				setYeelightBrightness(getState, setState, id, param2);
				break;
			default:
				break;
		}
	}
	// Mittels set_scene einschalten
	else {
		let sceneJSON = "";

		switch (className) {
			case "color":
				sceneJSON = `["${className}", ${param1}, ${param2}]`;
				break;
			case "hsv":
				sceneJSON = `["${className}", ${param1}, ${param2}${+", "}${param3}]`;
				break;
			case "ct":
				sceneJSON = `["${className}", ${param1}, ${param2}]`;
				break;
			case "cf":
				sceneJSON = `["${className}", ${param1}, ${param2}${+", "}${param3}]`;
				break;
			case "auto_delay_off":
				sceneJSON = `["${className}", ${param1}, ${param2}]`;
				break;
			default:
				break;
		}

		if (sceneJSON != "") {
			setState(id + idYeelightSetSceneSuffix, sceneJSON);
		}
	}
}

/**
 * @param {string} id
 * @param {number} [delay] Delay when powering off (default = 0)
 * @param {boolean} [isAmbient] Flag, if is an ambient light or not (default = false)
 */
function powerOffYeelight(getState, setStateDelayed, id, delay = 0, isAmbient = false) {
	if (!isYeelightReachable(getState, id)) {
		return;
	}

	const isPendant = isYeelightPendant(id);
	const powerSuffix = isPendant && isAmbient ? idYeelightBgPowerSuffix : idYeelightPowerSuffix;
	setStateDelayed(id + powerSuffix, false, delay);
}

/**
 * @param {string} id
 * @param {number} ct
 */
function setColorTemperatureYeelight(getState, setState, id, ct) {
	if (!isYeelightReachable(getState, id)) {
		return;
	}

	const isPendant = isYeelightPendant(id);
	const ctSuffix = isPendant ? idYeelightBgColorTemperatureSuffix : idYeelightColorTemperatureSuffix;
	setState(id + ctSuffix, ct);
}

/**
 * @param {string} id
 * @param {string} scene via YEELIGHT_SCENES
 */
function triggerYeelightScene(getState, setState, id, scene) {
	if (!isYeelightReachable(getState, id)) {
		return;
	}

	setState(id + idYeelightScenenSuffix + scene, true);
}

/**
 * @param {string} id
 * @returns {boolean}
 */
function isYeelightOn(getState, id) {
	const isPendant = isYeelightPendant(id);
	const powerSuffix = isPendant ? idYeelightBgPowerSuffix : idYeelightPowerSuffix;
	return getState(id + powerSuffix).val;
}

/**
 * @param {string} id
 * @returns {boolean}
 */
function isYeelightReachable(getState, id) {
	return getState(id + idYeelightReachableSuffix).val;
}

/**
 * @param {string} id
 * @returns {number}
 */
function getYeelightColorTemperature(getState, existsState, id) {
	const isPendant = isYeelightPendant(id);
	const ctSuffix = isPendant ? idYeelightBgColorTemperatureSuffix : idYeelightColorTemperatureSuffix;
	return existsState(id + ctSuffix) ? getState(id + ctSuffix).val : -1;
}

/**
 * @param {string} id
 * @returns {number}
 */
function getYeelightBrightness(getState, id) {
	const isPendant = isYeelightPendant(id);
	const brightnessSuffix = isPendant ? idYeelightBgBrightnessSuffix : idYeelightBrightnessSuffix;
	return getState(id + brightnessSuffix).val;
}

/**
 * @param {string} id
 * @param {number} brightness
 */
function setYeelightBrightness(getState, setState, id, brightness) {
	if (!isYeelightReachable(getState, id)) {
		return;
	}

	const isPendant = isYeelightPendant(id);
	const brightnessSuffix = isPendant ? idYeelightBgBrightnessSuffix : idYeelightBrightnessSuffix;
	setState(id + brightnessSuffix, brightness);
}

/**
 * @param {string} id
 * @param {boolean} toEnable
 */
function setYeelightMoonMode(getState, setState, id, toEnable) {
	if (!isYeelightReachable(getState, id)) {
		return;
	}

	setState(id + idYeelightMoonModeSuffix, toEnable);
}
//#endregion

//#region Alias
/**
 * @param {string} id
 * @param {number} [ct] Change color temperature directly if desired (default = -1/don't change)
 * @param {number} [brightness] Change brightness directly if desired (default = -1/don't change)
 */
function powerOnAliasDevice(getState, setState, existsState, id, ct = -1, brightness = -1) {
	if (!isAliasDeviceReachable(getState, id)) {
		return;
	}

	setState(id + idAliasPowerSuffix, true);

	// Kurz verzögern, da Setzen der Lichtfarbe nur im eingeschalteten Zustand erlaubt ist und es sonst evtl. zu einem Timingproblem kommt
	setTimeout(() => {
		if (brightness != -1) {
			brightness = commonFunctions.clamp(brightness, 0, 100);
			setAliasDeviceBrightness(getState, setState, existsState, id, brightness);
		}

		if (ct != -1) {
			setColorTemperatureAliasDevice(getState, setState, existsState, id, ct, true);
		}
	}, 1000);
}

/**
 * @param {string} id
 * @param {number} [delay] Delay when powering off (default = 0)
 */
function powerOffAliasDevice(getState, setStateDelayed, id, delay = 0) {
	if (!isAliasDeviceReachable(getState, id)) {
		return;
	}

	setStateDelayed(id + idAliasPowerSuffix, false, delay);
}

/**
 * @param {string} id
 */
function isAliasDeviceOn(getState, id) {
	return getState(id + idAliasPowerSuffix).val;
}

/**
 * @param {string} id
 */
function isAliasDeviceReachable(getState, id) {
	return getState(id + idAliasReachableSuffix).val;
}

/**
 * @param {string} id
 * @param {boolean} [asKelvin] default = true
 * @returns {number} Color temperature (returned as Kelvin if "asKelvin" is set to true, otherwise as mired); -1 if not supported
 */
function getAliasDeviceColorTemperature(getState, existsState, id, asKelvin = true) {
	if (!existsState(id + idAliasColorTemperatureSuffix)) {
		return -1;
	}

	const miredCt = getState(id + idAliasColorTemperatureSuffix).val;
	return asKelvin ? convertMiredToKelvin(miredCt) : miredCt;
}

/**
 * @param {string} id
 * @param {number} ct
 * @param {boolean} [connvertToMired] Flag, if value should be converted from Kelvin to mired first (default = false)
 */
function setColorTemperatureAliasDevice(getState, setState, existsState, id, ct, connvertToMired = false) {
	if (
		!isAliasDeviceReachable(getState, id) ||
		!existsState(id + idAliasColorTemperatureSuffix) ||
		!isAliasDeviceOn(getState, id)
	) {
		// Wenn ausgeschaltet, würde eine Warnung im Log erscheinen, da nur im eingeschalteten Zustand das Setzen erlaubt ist
		return;
	}

	const convertedCt = connvertToMired ? convertKelvinToMired(ct) : ct;
	setState(id + idAliasColorTemperatureSuffix, convertedCt);
}

/**
 * @param {string} id
 * @returns {number}
 */
function getAliasDeviceBrightness(getState, id) {
	return getState(id + idAliasBrightnessSuffix).val;
}

/**
 * @param {string} id
 * @param {number} brightness
 */
function setAliasDeviceBrightness(getState, setState, existsState, id, brightness) {
	if (!isAliasDeviceReachable(getState, id) || !existsState(id + idAliasBrightnessSuffix)) {
		return;
	}

	setState(id + idAliasBrightnessSuffix, brightness);
}

//#endregion

//#region Hilfsfunktionen
function ensureLightAliasMapInitialized($, log, getObject) {
	if (!isLightAliasMapInitialized) {
		fillLightAliasMap($, log, getObject);
	}
}

/**
 * Befüllt lightAliasMap; Ergebnis z.B. so:
 * { 'yeelight-2.0.ceiling1-0x0000000007ce7c08' => 'alias.0.Lights.Main.Kitchen.Ceiling', 'yeelight-2.0.pendant-0x0000000000000000' => 'alias.0.Lights.Main.Kitchen.DiningTable', 'alias.0.Lights.Ambience.Kitchen.Fiat500' => 'alias.0.Lights.Ambience.Kitchen.Fiat500', 'yeelight-2.0.stripe-0x0000000007fe7485' => 'alias.0.Lights.Ambience.Kitchen.Sink', 'yeelight-2.0.stripe-0x0000000007fe80fe' => 'alias.0.Lights.Ambience.Kitchen.Stove', 'alias.0.Lights.Main.BedRoom.Ceiling' => 'alias.0.Lights.Main.BedRoom.Ceiling', 'alias.0.Lights.Ambience.BedRoom.BedsideTable' => 'alias.0.Lights.Ambience.BedRoom.BedsideTable', 'alias.0.Lights.Ambience.BedRoom.Desk' => 'alias.0.Lights.Ambience.BedRoom.Desk', 'alias.0.Lights.Main.LivingRoom.CeilingSpot1' => 'alias.0.Lights.Main.LivingRoom.CeilingSpot1', 'alias.0.Lights.Main.LivingRoom.CeilingSpot2' => 'alias.0.Lights.Main.LivingRoom.CeilingSpot2', 'alias.0.Lights.Main.LivingRoom.CeilingSpot3' => 'alias.0.Lights.Main.LivingRoom.CeilingSpot3', 'alias.0.Lights.Main.LivingRoom.CeilingSpot4' => 'alias.0.Lights.Main.LivingRoom.CeilingSpot4', 'alias.0.Lights.Main.LivingRoom.CeilingSpot5' => 'alias.0.Lights.Main.LivingRoom.CeilingSpot5', 'alias.0.Lights.Ambience.LivingRoom.BalconyDoor' => 'alias.0.Lights.Ambience.LivingRoom.BalconyDoor', 'alias.0.Lights.Ambience.LivingRoom.Cabinet' => 'alias.0.Lights.Ambience.LivingRoom.Cabinet', 'alias.0.Lights.Ambience.LivingRoom.Elephant' => 'alias.0.Lights.Ambience.LivingRoom.Elephant', 'yeelight-2.0.stripe-0x0000000007fe74c1' => 'alias.0.Lights.Ambience.LivingRoom.MainDoor', 'alias.0.Lights.Ambience.LivingRoom.TableLamp' => 'alias.0.Lights.Ambience.LivingRoom.TableLamp', 'yeelight-2.0.ceiling1-0x0000000012bf7c64' => 'alias.0.Lights.Main.RoomDomi.Ceiling', 'alias.0.Lights.Main.Corridor.Ceiling' => 'alias.0.Lights.Main.Corridor.Ceiling', 'alias.0.Lights.Main.Hallway.Wall' => 'alias.0.Lights.Main.Hallway.Wall' }
 */
function fillLightAliasMap($, log, getObject) {
	if (isLightAliasMapInitialized) {
		return;
	}

	Object.values(commonDefines.ROOMS_WITH_LIGHTING).forEach(room => {
		const mainLightAliasIds = getLightingIdsFromRoom($, log, getObject, room, true, false, false, true);
		mainLightAliasIds.forEach(mainLightAliasId => {
			const lightObj = getObject(`${mainLightAliasId}${idAliasPowerSuffix}`);
			let realYeelightId = lightObj.common && lightObj.common.alias ? lightObj.common.alias.id : "";

			if (realYeelightId.includes("yeelight-2.0")) {
				realYeelightId = realYeelightId.replace(".control.power", "").replace(".control.bg_power", "");

				if (isYeelightPendant(realYeelightId)) {
					realYeelightId += lightAliasMapPendantMainSuffix;
				}

				if (!lightAliasMap.has(realYeelightId)) {
					lightAliasMap.set(realYeelightId, mainLightAliasId);
				}
			} else {
				if (!lightAliasMap.has(mainLightAliasId)) {
					lightAliasMap.set(mainLightAliasId, mainLightAliasId);
				}
			}
		});

		const ambientLightAliasIds = getLightingIdsFromRoom($, log, getObject, room, false, false, false, true);
		ambientLightAliasIds.forEach(ambientLightAliasId => {
			const lightObj = getObject(`${ambientLightAliasId}${idAliasPowerSuffix}`);
			let realYeelightId = lightObj.common && lightObj.common.alias ? lightObj.common.alias.id : "";

			if (realYeelightId.includes("yeelight-2.0")) {
				realYeelightId = realYeelightId.replace(".control.power", "").replace(".control.bg_power", "");

				if (isYeelightPendant(realYeelightId)) {
					realYeelightId += lightAliasMapPendantAmbienceSuffix;
				}

				if (!lightAliasMap.has(realYeelightId)) {
					lightAliasMap.set(realYeelightId, ambientLightAliasId);
				}
			} else {
				if (!lightAliasMap.has(ambientLightAliasId)) {
					lightAliasMap.set(ambientLightAliasId, ambientLightAliasId);
				}
			}
		});
	});

	isLightAliasMapInitialized = true;
}

/**
 * @param {boolean} isNight Flag, ob Nachtfarben gewünscht wird
 * @returns {number}
 */
function getDesiredColor(isNight) {
	if (isNight) {
		return colorNight;
	}
	return colorDay;
}

/**
 * @param {boolean} isNight Flag, ob Nachtfarben gewünscht wird
 * @returns {string}
 */
function getDesiredColorAsHex(isNight) {
	if (isNight) {
		return `#${colorNight.toString(16)}`;
	}
	return `#${colorDay.toString(16)}`;
}

/**
 * @param {string} room via Rooms
 * @param {boolean} isMainLight
 * @param {boolean} isNight Flag, ob Nachtfarben gewünscht wird
 * @returns {number}
 */
function getDesiredColorTemperature(room, isMainLight, isNight) {
	switch (room) {
		case commonDefines.ROOMS.KUECHE:
		case commonDefines.ROOMS.FLUR: {
			if (isMainLight) {
				return isNight ? mainLightColorTemperaturNight : mainLightColorTemperaturDay;
			}
			return isNight ? ambientLightColorTemperaturNight : ambientLightColorTemperaturDay;
		}
		// Im Schlafzimmer für Haupt- und Ambientebeleuchtung die gleiche Farbtemperatur (je nach Tageszeit) verwenden
		case commonDefines.ROOMS.SCHLAFZIMMER:
			return isNight ? mainLightColorTemperaturNight : mainLightColorTemperaturDay;
		default:
			return isNight ? defaultColorTemperaturNight : defaultColorTemperaturDay;
	}
}

/**
 * Gibt die Standardhelligkeit für die gewünschte Beleuchtung zurück
 * Wert wird entweder aus der State-Zuordnung "DefaultValueXX" (enum.functions) oder - falls nicht zugeordnet - aus der Funktion "getDesiredBrightness" bestimmt
 * @param {string} lightId ID der gewünschten Beleuchtung
 * @param {boolean} isMainLight Flag, ob es sich um Hauptbeluchtung handelt
 */
async function getLightDefaultBrightnessLevel(getEnums, getObject, existsState, lightId, isMainLight) {
	const isAliasDevice = lightId.includes("alias.");
	const isPendant = !isAliasDevice && isYeelightPendant(lightId);
	const mappedId = lightAliasMap.has(
		isPendant
			? isMainLight
				? `${lightId}${lightAliasMapPendantMainSuffix}`
				: `${lightId}${lightAliasMapPendantAmbienceSuffix}`
			: lightId,
	)
		? lightAliasMap.get(
				isPendant
					? isMainLight
						? `${lightId}${lightAliasMapPendantMainSuffix}`
						: `${lightId}${lightAliasMapPendantAmbienceSuffix}`
					: lightId,
			)
		: "NOT_MAPPED";
	const room = await commonFunctions.getRoomFromState(getEnums, mappedId);

	if (room == null) {
		return;
	}

	let defValue = getDesiredBrightness(room, isMainLight); // zunächst die fix hinterlegte Helligkeit als Standard nehmen

	if (isAliasDevice) {
		const aliasBrightnessStateId = lightId + idAliasBrightnessSuffix;
		const defaultValueEnum = commonFunctions.getDefaultValueEnum(existsState, getObject, aliasBrightnessStateId);
		defValue = defaultValueEnum != "" ? defaultValueEnum : defValue;
	} else {
		const yeelightBrightnessStateId = lightId + idYeelightBrightnessSuffix;

		if (existsState(yeelightBrightnessStateId)) {
			const aliasBrightnessStateId = mappedId + idAliasColorTemperatureSuffix;
			const defaultValueEnum = commonFunctions.getDefaultValueEnum(
				existsState,
				getObject,
				aliasBrightnessStateId,
			);
			defValue = defaultValueEnum != "" ? defaultValueEnum : defValue;
		}
	}

	return defValue;
}

/**
 * @param {string} room via Rooms
 * @param {boolean} isMainLight
 * @returns {number}
 */
function getDesiredBrightness(room, isMainLight) {
	switch (room) {
		case commonDefines.ROOMS.KUECHE:
			return isMainLight ? 1 : 100;
		case commonDefines.ROOMS.GANG:
			return 60;
		default:
			return isMainLight ? 50 : 100;
	}
}

/**
 * @param {any} room via Rooms
 * @param {any} isMainLight
 * @returns {number}
 */
function getBrightnessThreshold(room, isMainLight) {
	switch (room) {
		case commonDefines.ROOMS.KUECHE:
			return isMainLight ? 10 : 45;
		case commonDefines.ROOMS.GANG:
			return 25;
		default:
			return isMainLight ? 10 : 100;
	}
}

/**
 * @param {number} kelvin
 * @returns {number}
 */
function convertKelvinToMired(kelvin) {
	if (kelvin <= 0) {
		return 0;
	}
	return 1000000 / kelvin;
}

/**
 * @param {number} mired
 * @returns {number}
 */
function convertMiredToKelvin(mired) {
	if (mired <= 0) {
		return 0;
	}
	return 1000000 / mired;
}

/**
 * Bestimmt dynamisch die IDs der Beleuchtungen im gewünschten Raum (erfasst alle unter alias.0.Lights.Main/Ambience.* gemappten Lichter)
 * @param {string} room via Rooms
 * @param {boolean} searchMainLights Flag, if main light ids should be returned
 * @param {boolean} [logging] Flag, if errors should be logged (default = true)
 * @param {boolean} [separateYeelights] Flag, if yeelight devices should be included with their specific ID instead of their alias ID (default = true)
 * @param {boolean} [skipLazyInit] Intern nur für fillLightAliasMap
 * @returns {string[]} Array mit IDs aller Beleuchtungen (Sortierung: alias -> yeelight)
 */
function getLightingIdsFromRoom(
	$,
	log,
	getObject,
	room,
	searchMainLights,
	logging = true,
	separateYeelights = true,
	skipLazyInit = false,
) {
	if (!skipLazyInit) {
		ensureLightAliasMapInitialized($, log, getObject);
	}

	let lightIds = [];
	const aliasIds = [];
	const yeelightIds = [];

	// Aus dem Cache lesen, wenn Map gefüllt
	if (isLightAliasMapInitialized) {
		lightAliasMap.forEach((value, key) => {
			if (
				value.includes(
					`${searchMainLights ? ".Main" : ".Ambience"}.${commonFunctions.translateRoomNameToEnglish(room)}.`,
				)
			) {
				if (key.includes("yeelight-2.0.")) {
					const keyClean = key.replace(
						`${searchMainLights ? lightAliasMapPendantMainSuffix : lightAliasMapPendantAmbienceSuffix}`,
						"",
					);
					yeelightIds.push(separateYeelights ? keyClean : value);
				} else {
					aliasIds.push(separateYeelights ? key : value);
				}
			}
		});
	} else {
		// Ansonsten direkt via $() auslesen, um den Cache zu bestücken
		$(
			`state[state.id=alias.0.Lights.${searchMainLights ? "Main" : "Ambience"}.${commonFunctions.translateRoomNameToEnglish(room)}.*${idAliasPowerSuffix}]`,
		).each(function (id) {
			if (separateYeelights) {
				const obj = getObject(id);
				const aliasId = obj.common.alias.id;

				if (aliasId.includes("yeelight-2.0.")) {
					id = aliasId.replace(".control.power", "").replace(".control.bg_power", "");
					yeelightIds.push(id);
				} else {
					id = id.replace(idAliasPowerSuffix, "");
					aliasIds.push(id);
				}
			} else {
				id = id.replace(idAliasPowerSuffix, "");
				aliasIds.push(id);
			}
		});
	}

	lightIds = aliasIds.concat(yeelightIds);

	if (lightIds.length === 0 && logging) {
		log(
			`getLightingIdsFromRoom(${room}, ${searchMainLights}, ${logging}, ${separateYeelights}): Keine ${searchMainLights ? "Haupt" : "Ambiente"}beleuchtung in Raum '${String(room)}'`,
			"error",
		);
	}

	return lightIds;
}

/**
 * Bestimmt dynamisch die ID der Lichtergruppe im gewünschten Raum (erfasst alle unter alias.0.Lights.Groups.Main/Ambience.* gemappten Gruppen)
 * @param {string} room via Rooms
 * @param {boolean} searchMainLights Flag, if main light ids should be returned
 * @returns {string} ID der Lichtergruppe
 */
function getLightingGroupIdFromRoom($, room, searchMainLights) {
	let lightingGroupId = "";

	$(
		`state[state.id=alias.0.Lights.Groups.${searchMainLights ? "Main" : "Ambience"}.${commonFunctions.translateRoomNameToEnglish(room)}${idAliasPowerSuffix}]`,
	).each(function (id) {
		lightingGroupId = id.replace(idAliasPowerSuffix, "");
		return false; // frühzeitig rausspringen, da gefunden
	});

	return lightingGroupId;
}

/**
 * @param {string} room via commonDefines.ROOMS
 * @param {boolean} isMain Flag, ob es sich um die Hauptbeleuchtung handelt
 * @param {boolean} val Flag, ob durch Bewegungsmelder ein- (true) oder ausgeschaltet (false) wurde
 */
function setWasPoweredOnByMotion(setState, room, isMain, val) {
	if (!commonDefines.ROOMS_WITH_MOTION_SENSOR.includes(room)) {
		return;
	}
	setState(
		`${commonDefines.idUserDataPrefix}LightingControl.WasPoweredOnByMotion${room}${isMain ? "Main" : "Ambient"}`,
		val,
	);
}

/**
 * @param {string} room via commonDefines.ROOMS
 * @param {boolean} isMain Flag, ob es sich um die Hauptbeleuchtung handelt
 */
function getWasPoweredOnByMotion(getState, room, isMain) {
	if (!commonDefines.ROOMS_WITH_MOTION_SENSOR.includes(room)) {
		return;
	}
	return getState(
		`${commonDefines.idUserDataPrefix}LightingControl.WasPoweredOnByMotion${room}${isMain ? "Main" : "Ambient"}`,
	).val;
}

//#endregion

module.exports = {
	YEELIGHT_SCENES,
	hasAmbientLights,
	invertAmbientLightsState,
	invertAmbientLightsColorTemperature,
	setAmbientLightsBrightnessLevel,
	setAmbientLightsDefaultBrightnessLevel,
	increaseAmbientLightsBrightnessLevel,
	powerAmbientLightsOn,
	powerAmbientLightsOff,
	setAmbientLightsColorTemperature,
	setAmbientLightsDefaultColorTemperature,
	getAmbientLightStates,
	isAnyAmbientLightPoweredOn,
	getAmbientLightsColorTemperature,
	hasMainLights,
	invertMainLightsState,
	invertMainLightsColorTemperature,
	setMainLightsBrightnessLevel,
	setMainLightsDefaultBrightnessLevel,
	increaseMainLightsBrightnessLevel,
	powerMainLightsOn,
	powerMainLightsOff,
	setMainLightsColorTemperature,
	setMainLightsDefaultColorTemperature,
	setMainLightsMoonMode,
	getMainLightStates,
	isAnyMainLightPoweredOn,
	getMainLightsColorTemperature,
	isYeelightPendant,
	powerOnYeelight,
	powerOffYeelight,
	setColorTemperatureYeelight,
	triggerYeelightScene,
	isYeelightOn,
	isYeelightReachable,
	getYeelightColorTemperature,
	getYeelightBrightness,
	setYeelightBrightness,
	setYeelightMoonMode,
	powerOnAliasDevice,
	powerOffAliasDevice,
	isAliasDeviceOn,
	isAliasDeviceReachable,
	getAliasDeviceColorTemperature,
	setColorTemperatureAliasDevice,
	getAliasDeviceBrightness,
	setAliasDeviceBrightness,
	getDesiredColor,
	getDesiredColorAsHex,
	getDesiredColorTemperature,
	getLightDefaultBrightnessLevel,
	getDesiredBrightness,
	getBrightnessThreshold,
	convertKelvinToMired,
	convertMiredToKelvin,
	getLightingIdsFromRoom,
	getLightingGroupIdFromRoom,
	setWasPoweredOnByMotion,
	getWasPoweredOnByMotion,
};
