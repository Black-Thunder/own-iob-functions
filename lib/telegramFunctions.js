'use strict';

var dateTimeFunctions = require("./dateTimeFunctions.js");

const telegramInstance = "telegram.0";

const TELEGRAM_USERS = {
    DOMINIK: "Dominik",
    MARION: "Marion"
}

/**
* @param {string} msg
* @param {string[]} markup
* @param {boolean} [resize=true]
* @param {boolean} [oneTime=false]
* @param {string} [users=""] If empty, last user with communication will receive the message
*/
function sendTelegramResponse(getState, compareTime, sendTo, msg, markup, resize = true, oneTime = false, users = "") {
    if (users == "") {
        users = getLastTelegramUser(getState, compareTime);
    }

    sendTo(telegramInstance, {
        user: users,
        text: msg,
        reply_markup: {
            keyboard: markup,
            resize_keyboard: resize,
            one_time_keyboard: oneTime
        }
    });
}

/**
* Schickt einen Standort per Telegram
* @param {any} lat Latitude
* @param {any} lon Longitude
* @param {string} [users=""] If empty, last user with communication will receive the message
*/
function sendTelegramPosition(getState, compareTime, lat, lon, users = "") {
    if (users == "") {
        users = getLastTelegramUser(getState, compareTime);
    }

    sendTo(telegramInstance, {
        user: users,
        latitude: lat,
        longitude: lon,
        disable_notification: true
    });
}

/**
* @param {string} msg
* @param {string} [users=""] If empty, last user with communication will receive the message
* @param {boolean} [silent=false]
*/
function sendTelegramMessage(getState, compareTime, msg, users = "", silent = false) {
    if (users == "") {
        users = getLastTelegramUser(getState, compareTime);
    }

    sendTo(telegramInstance, {
        user: users,
        text: msg,
        disable_notification: silent
    });
}

/**
* @return {string} Last user (default = "Dominik")
*/
function getLastTelegramUser(getState, compareTime) {
    // Zunächst prüfen, wie alt die letzte Nachricht ist; ab 15min default verwenden
    const ts = getState(telegramInstance + '.communicate.request').ts;
    var expirationDate = new Date(ts);
    expirationDate = dateTimeFunctions.manipulateDate(expirationDate, 15);
    var isExpired = compareTime(expirationDate, null, ">=");

    if (isExpired) {
        return TELEGRAM_USERS.DOMINIK;
    }

    const lastUserRequest = getState(telegramInstance + '.communicate.request').val;
    const lastUser = lastUserRequest.substring(1, lastUserRequest.indexOf("]"));
    return lastUser == "" ? TELEGRAM_USERS.DOMINIK : lastUser;
}


module.exports = { TELEGRAM_USERS, sendTelegramResponse, sendTelegramPosition, sendTelegramMessage, getLastTelegramUser };