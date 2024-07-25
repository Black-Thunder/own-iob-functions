'use strict';

var commonFunctions = require("./commonFunctions.js");

/**
* @param {boolean} [useRailing=true] Flag, if railing sensor should be used or wall sensor (default = true)
* @param {boolean} [returnRaw=false] Flag, if raw values should be returned or rounded values (to 1 decimal place) (default = false)
* @return {number} Current outside temperature or -1 if all sensors are not reachable
*/
function getCurrentOutsideTemperature(getState, useRailing = true, returnRaw = false) {
    const isRailingReachable = !getState("alias.0.Sensors.Temperature.OutdoorRailing.UNREACH").val;

    if (useRailing) {
        // Wenn nicht erreichbar, Fallback auf Wandsensor
        if (isRailingReachable) {
            return getState("alias.0.Sensors.Temperature.OutdoorRailing.ACTUAL").val;
        }
    }

    const isWallReachable = getState("alias.0.Sensors.Temperature.OutdoorWall.WORKING").val;
    if (!isWallReachable) return -1;

    const rawTemp = getState("alias.0.Sensors.Temperature.OutdoorWall.ACTUAL").val;
    return returnRaw ? rawTemp : commonFunctions.roundValue(rawTemp, 1);
}

/**
* @param {boolean} [useRailing=true] Flag, if railing sensor should be used or wall sensor (default = true)
* @param {boolean} [returnRaw=false] Flag, if raw values should be returned or rounded values (no decimal places) (default = false)
* @return {number}
*/
function getCurrentOutsideHumidity(getState, useRailing = true, returnRaw = false) {
    const rawHumidity = useRailing ? getState("alias.0.Sensors.Humidity.OutdoorRailing.ACTUAL").val : getState("alias.0.Sensors.Humidity.OutdoorWall.ACTUAL").val;

    return returnRaw ? rawHumidity : commonFunctions.roundValue(rawHumidity, 0);
}

/**
 * Gibt die aktuelle Außenhelligkeit zurück. Dabei wird der höchste Wert der (erreichbaren) Sensoren berücksichtigt
* @return {number} Wertebereich 0-100.000
*/
function getCurrentOutsideIllumination(getState) {
    var luxValuesArray = [];

    // Sensor Balkonbrüstung (unreachable wird über den Temperatursensor abgefragt)
    // Eigentlicher Wertebereich: 0-16367 -> Max wurde aber noch nie erreicht, daher nur bis 8500 annehmen
    if (!getState("alias.0.Sensors.Temperature.OutdoorRailing.UNREACH").val) {
        const rawValue = getState("alias.0.Sensors.Luminance.OutdoorRailing.ACTUAL").val;
        const mappedValue = commonFunctions.mapRange(rawValue, 0, 8500, 0, 100000);
        luxValuesArray.push(mappedValue);
    }

    // Sensor Balkonkasten
    /*if (getState("alias.0.Sensors.Luminance.OutdoorRailingBox.WORKING").val) {
        luxValuesArray.push(getState("alias.0.Sensors.Luminance.OutdoorRailingBox.ACTUAL").val);
    }*/

    // Sensor Fensterbrett (Wertebereich 0-100.000)
    if (getState("alias.0.Sensors.Luminance.OutdoorWindowsill.WORKING").val) {
        luxValuesArray.push(getState("alias.0.Sensors.Luminance.OutdoorWindowsill.ACTUAL").val);
    }

    return luxValuesArray.length > 0 ? Math.max(...luxValuesArray) : 0;
}

/**
* @return {number}
*/
function getCurrentOutsideWindSpeed(getState) {
    return getState("alias.0.Sensors.Wind.OutdoorRailing.ACTUAL").val;
}

/**
* @return {string} Windrichtung als Kürzel (z.B. "NNW")
*/
function getCurrentOutsideWindDirection(getState) {
    return getState("weatherunderground.0.forecast.current.windDirection").val;;
}

/**
* @return {number} Atmosphärischer Luftdruck auf Höhe des Sensors in hPa
*/
function getCurrentAtmosphericBaromtericPressure(getState) {
    return getState("alias.0.Sensors.BarometricPressure.Outdoor.ACTUAL").val;
}

/**
* @return {number} Luftdruck auf Meeereshöhe (basierend auf dem atmosphärischen Druck) in hPa
*/
function getCurrentMSLBaromtericPressure(getState) {
    return getState("0_userdata.0.Weather.CurrentMSLBarometricPressure").val;
}

/**
* @return {boolean}
*/
function isRaining(getState) {
    return getState("alias.0.Sensors.Rain.Outdoor.ACTUAL").val;
}

/**
* @return {Date}
*/
function getSunsetDate(getState) {
    const sunsetState = getState('0_userdata.0.Astro.sunset');
    const splittedSunset = sunsetState ? sunsetState.val.split(":") : null;
    const today = new Date();

    return (splittedSunset && splittedSunset.length == 2) ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), splittedSunset[0], splittedSunset[1]) : null;
}

module.exports = {
    getCurrentOutsideTemperature, getCurrentOutsideHumidity, getCurrentOutsideIllumination, getCurrentOutsideWindSpeed, getCurrentOutsideWindDirection,
    getCurrentAtmosphericBaromtericPressure, getCurrentMSLBaromtericPressure, isRaining, getSunsetDate
};