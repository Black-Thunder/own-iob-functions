'use strict';

const telegramInstance = "telegram.0";
const telegramChatId = "-1002186790404";     // == Gruppe "Smart Home"

const TELEGRAM_TOPIC_IDS = {
    GENERAL: 1,                              // == Topic "General"
    NOTIFICATIONS: 3,                        // == Topic "Benachrichtigungen"
    CONTROL: 55,                             // == Topic "Steuerung"
    SYSTEM_NOTIFICATIONS: 200,               // == Topic "Systemmeldungen"
    PARCEL_TRACKING: 202                     // == Topic "Sendungsverfolgung"
};

/**
* @param {string} msg
* @param {string[]} markup
* @param {boolean} [resize=true]
* @param {boolean} [oneTime=false]
* @param {number} [topicId=TELEGRAM_TOPIC_IDS.CONTROL] Determines which topic the message will be sent to
*/
function sendTelegramResponse(sendTo, msg, markup, resize = true, oneTime = false, topicId = TELEGRAM_TOPIC_IDS.CONTROL) {
    sendTo(telegramInstance, {
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
* @param {string} msg
* @param {number} [topicId=TELEGRAM_TOPIC_IDS.CONTROL] Determines which topic the message will be sent to
*/
function sendTelegramResponseClearKeyboard(sendTo, msg, topicId = TELEGRAM_TOPIC_IDS.CONTROL) {
    sendTo(telegramInstance, {
        text: msg,
        reply_markup: {
            remove_keyboard: true,
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
*/
function sendTelegramPosition(sendTo, lat, lon, topicId = TELEGRAM_TOPIC_IDS.NOTIFICATIONS) {
    sendTo(telegramInstance, {
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
*/
function sendTelegramVenue(sendTo, lat, lon, title, address, topicId = TELEGRAM_TOPIC_IDS.NOTIFICATIONS) {
    sendTo(telegramInstance, {
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
* @param {boolean} [silent=false]
* @param {number} [topicId=TELEGRAM_TOPIC_IDS.NOTIFICATIONS] Determines which topic the message will be sent to
*/
function sendTelegramMessage(sendTo, msg, silent = false, topicId = TELEGRAM_TOPIC_IDS.NOTIFICATIONS) {
    sendTo(telegramInstance, {
        text: msg,
        disable_notification: silent,
        chatId: `${telegramChatId}_${topicId}`,
        message_thread_id: topicId != TELEGRAM_TOPIC_IDS.GENERAL ? topicId : ""
    });
}

module.exports = { TELEGRAM_TOPIC_IDS, sendTelegramResponse, sendTelegramResponseClearKeyboard, sendTelegramPosition, sendTelegramVenue, sendTelegramMessage };