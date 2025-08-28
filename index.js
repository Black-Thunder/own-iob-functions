"use strict";

const airConditionerControlFunctions = require("./lib/airConditionerControlFunctions.js");
const airPurifierControlFunctions = require("./lib/airPurifierControlFunctions.js");
const alexaControlFunctions = require("./lib/alexaControlFunctions.js");
const commonDefines = require("./lib/commonDefines.js");
const commonFunctions = require("./lib/commonFunctions.js");
const customLoggingFunctions = require("./lib/customLoggingFunctions.js");
const dateTimeFunctions = require("./lib/dateTimeFunctions.js");
const fullyKioskBrowserFunctions = require("./lib/fullyKioskBrowserFunctions.js");
const lightingControlFunctions = require("./lib/lightingControlFunctions.js");
const pingFunctions = require("./lib/pingFunctions.js");
const presenceFunctions = require("./lib/presenceFunctions.js");
const pushoverFunctions = require("./lib/pushoverFunctions.js");
const sensorFunctions = require("./lib/sensorFunctions.js");
const smartPlugControlFunctions = require("./lib/smartPlugControlFunctions.js");
const sunblindControlFunctions = require("./lib/sunblindControlFunctions.js");
const telegramFunctions = require("./lib/telegramFunctions.js");
const thermostatControlFunctions = require("./lib/thermostatControlFunctions.js");
const toDoListFunctions = require("./lib/toDoListFunctions.js");
const vacuumCleanerFunctions = require("./lib/vacuumCleanerFunctions.js");
const weatherSensorFunctions = require("./lib/weatherSensorFunctions.js");

module.exports = () => {
	return {
		airConditionerControlFunctions,
		airPurifierControlFunctions,
		alexaControlFunctions,
		customLoggingFunctions,
		dateTimeFunctions,
		fullyKioskBrowserFunctions,
		lightingControlFunctions,
		pingFunctions,
		presenceFunctions,
		pushoverFunctions,
		sensorFunctions,
		smartPlugControlFunctions,
		sunblindControlFunctions,
		telegramFunctions,
		thermostatControlFunctions,
		toDoListFunctions,
		vacuumCleanerFunctions,
		weatherSensorFunctions,
		commonDefines,
		commonFunctions,
	};
};
