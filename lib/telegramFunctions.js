'use strict';

const telegramInstance = "telegram.0";
const telegramChatId = "-1002186790404";    // == Gruppe "Smart Home"

const TELEGRAM_USERS = {
    DOMINIK: "Dominik",
    MARION: "Marion"
}

const TELEGRAM_TOPIC_IDS = {
    GENERAL: 1,                              // == Topic "General"
    NOTIFICATIONS: 3,                        // == Topic "Benachrichtigungen"
    CONTROL: 55                              // == Topic "Steuerung"
};

/**
* @param {string} msg
* @param {string[]} markup
* @param {number} [topicId=TELEGRAM_TOPIC_IDS.CONTROL] Determines which topic the message will be sent to
* @param {boolean} [resize=true]
* @param {boolean} [oneTime=false]
* @param {string} [users=""] If empty, last user with communication will receive the message
*/
function sendTelegramResponse(getState, compareTime, sendTo, msg, markup, topicId = TELEGRAM_TOPIC_IDS.CONTROL, resize = true, oneTime = false, users = "") {
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
        },
        chatId: `${telegramChatId}_${topicId}`,
        message_thread_id: topicId != TELEGRAM_TOPIC_IDS.GENERAL ? topicId : ""
    });
}

/**
* Schickt einen Standort per Telegram
* @param {any} lat Latitude
* @param {any} lon Longitude
* @param {number} [topicId=TELEGRAM_TOPIC_IDS.NOTIFICATIONS] Determines which topic the message will be sent to
* @param {string} [users=""] If empty, last user with communication will receive the message
*/
function sendTelegramPosition(getState, compareTime, sendTo, lat, lon, topicId = TELEGRAM_TOPIC_IDS.NOTIFICATIONS, users = "") {
    if (users == "") {
        users = getLastTelegramUser(getState, compareTime);
    }

    sendTo(telegramInstance, {
        user: users,
        latitude: lat,
        longitude: lon,
        disable_notification: true,
        chatId: `${telegramChatId}_${topicId}`,
        message_thread_id: topicId != TELEGRAM_TOPIC_IDS.GENERAL ? topicId : ""
    });
}

/**
* Schickt einen Veranstaltungsort per Telegram
* @param {any} lat Latitude
* @param {any} lon Longitude
* @param {string} title Title
* @param {string} address Address
* @param {number} [topicId=TELEGRAM_TOPIC_IDS.NOTIFICATIONS] Determines which topic the message will be sent to
* @param {string} [users=""] If empty, last user with communication will receive the message
*/
function sendTelegramVenue(getState, compareTime, sendTo, lat, lon, title, address, topicId = TELEGRAM_TOPIC_IDS.NOTIFICATIONS, users = "") {
    if (users == "") {
        users = getLastTelegramUser(getState, compareTime);
    }

    sendTo(telegramInstance, {
        user: users,
        latitude: lat,
        longitude: lon,
        title: title,
        address: address,
        chatId: `${telegramChatId}_${topicId}`,
        message_thread_id: topicId != TELEGRAM_TOPIC_IDS.GENERAL ? topicId : ""
    });
}

/**
* @param {string} msg
* @param {number} [topicId=TELEGRAM_TOPIC_IDS.NOTIFICATIONS] Determines which topic the message will be sent to
* @param {string} [users=""] If empty, last user with communication will receive the message
* @param {boolean} [silent=false]
*/
function sendTelegramMessage(getState, compareTime, sendTo, msg, topicId = TELEGRAM_TOPIC_IDS.NOTIFICATIONS, users = "", silent = false) {
    if (users == "") {
        users = getLastTelegramUser(getState, compareTime);
    }

    sendTo(telegramInstance, {
        user: users,
        text: msg,
        disable_notification: silent,
        chatId: `${telegramChatId}_${topicId}`,
        message_thread_id: topicId != TELEGRAM_TOPIC_IDS.GENERAL ? topicId : ""
    });
}

/**
* @return {string} Last user (default = "Dominik")
*/
function getLastTelegramUser(getState, compareTime) {
    // Zunächst prüfen, wie alt die letzte Nachricht ist; ab 15min default verwenden
    const ts = getState(telegramInstance + '.communicate.request').ts;
    var expirationDate = new Date(ts);
    expirationDate.setMinutes(expirationDate.getMinutes() + 15);
    var isExpired = compareTime(expirationDate, null, ">=");

    if (isExpired) {
        return TELEGRAM_USERS.DOMINIK;
    }

    const lastUserRequest = getState(telegramInstance + '.communicate.request').val;
    const lastUser = lastUserRequest.substring(1, lastUserRequest.indexOf("]"));
    return lastUser == "" ? TELEGRAM_USERS.DOMINIK : lastUser;
}


module.exports = { TELEGRAM_USERS, TELEGRAM_TOPIC_IDS, sendTelegramResponse, sendTelegramPosition, sendTelegramVenue, sendTelegramMessage, getLastTelegramUser };