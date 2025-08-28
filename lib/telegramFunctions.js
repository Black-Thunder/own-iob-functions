"use strict";

const telegramInstance = "telegram.0";
const telegramChatId = "-1002186790404"; // == Gruppe "Smart Home"
const telegramMessageLimit = 4096;

const TELEGRAM_TOPIC_IDS = {
	GENERAL: 1, // == Topic "General"
	NOTIFICATIONS: 3, // == Topic "Benachrichtigungen"
	CONTROL: 55, // == Topic "Steuerung"
	SYSTEM_NOTIFICATIONS: 200, // == Topic "Systemmeldungen"
	PARCEL_TRACKING: 202, // == Topic "Sendungsverfolgung"
	VEHICLE_STATUS: 755, // == Topic "KFZ-Status"
};

// === Telegram Message Queue ===
let telegramQueue = [];
let telegramQueueInterval = null;
const telegramQueueIntervalTime = 1000; // 1 message every 1 seconds

function startQueue(sendTo) {
	if (!telegramQueueInterval) {
		telegramQueueInterval = setInterval(() => processQueue(sendTo), telegramQueueIntervalTime);
	}
}

function stopQueue() {
	clearInterval(telegramQueueInterval);
	telegramQueueInterval = null;
}

function processQueue(sendTo) {
	if (!telegramQueue.length) return stopQueue();
	sendInternal(sendTo, telegramQueue.shift(), true);
}

function enqueue(sendTo, msg) {
	telegramQueue.push(msg);
	startQueue(sendTo);
}

function sendInternal(sendTo, messageObj, fromQueue = false) {
	sendTo(telegramInstance, messageObj, res => {
		if (res?.error?.code === 429) {
			const retryAfter = res.error.retry_after || 10;
			setTimeout(() => {
				messageObj.__retryCount = (messageObj.__retryCount || 0) + 1;
				if (messageObj.__retryCount <= 5) enqueue(sendTo, messageObj);
			}, retryAfter * 1000);
		} else if (!fromQueue && telegramQueue.length) {
			startQueue(sendTo);
		}
	});
}

function sendOrQueue(sendTo, msg) {
	if (telegramQueueInterval) enqueue(sendTo, msg);
	else sendInternal(sendTo, msg);
}

function limitMessage(msg) {
	return msg.length > telegramMessageLimit ? msg.substring(0, telegramMessageLimit - 3) + "..." : msg;
}

function buildMessage(topicId, extra) {
	return {
		chatId: `${telegramChatId}_${topicId}`,
		message_thread_id: topicId !== TELEGRAM_TOPIC_IDS.GENERAL ? topicId : "",
		...extra,
	};
}

/**
 * @param {string} msg
 * @param {string[]} markup
 * @param {boolean} [resize=true]
 * @param {boolean} [oneTime=false]
 * @param {number} [topicId=TELEGRAM_TOPIC_IDS.CONTROL] Determines which topic the message will be sent to
 */
function sendTelegramResponse(
	sendTo,
	msg,
	markup,
	resize = true,
	oneTime = false,
	topicId = TELEGRAM_TOPIC_IDS.CONTROL,
) {
	sendOrQueue(
		sendTo,
		buildMessage(topicId, {
			text: limitMessage(msg),
			reply_markup: {
				keyboard: markup,
				resize_keyboard: resize,
				one_time_keyboard: oneTime,
			},
		}),
	);
}

/**
 * @param {string} msg
 * @param {number} [topicId=TELEGRAM_TOPIC_IDS.CONTROL] Determines which topic the message will be sent to
 */
function sendTelegramResponseClearKeyboard(sendTo, msg, topicId = TELEGRAM_TOPIC_IDS.CONTROL) {
	sendOrQueue(
		sendTo,
		buildMessage(topicId, {
			text: limitMessage(msg),
			reply_markup: { remove_keyboard: true },
		}),
	);
}

/**
 * Schickt einen Standort per Telegram
 * @param {any} lat Latitude
 * @param {any} lon Longitude
 * @param {number} [topicId=TELEGRAM_TOPIC_IDS.NOTIFICATIONS] Determines which topic the message will be sent to
 */
function sendTelegramPosition(sendTo, lat, lon, topicId = TELEGRAM_TOPIC_IDS.NOTIFICATIONS) {
	sendOrQueue(
		sendTo,
		buildMessage(topicId, {
			latitude: lat,
			longitude: lon,
			disable_notification: true,
		}),
	);
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
	sendOrQueue(
		sendTo,
		buildMessage(topicId, {
			latitude: lat,
			longitude: lon,
			title,
			address,
		}),
	);
}

/**
 * @param {string} msg
 * @param {boolean} [silent=false]
 * @param {number} [topicId=TELEGRAM_TOPIC_IDS.NOTIFICATIONS] Determines which topic the message will be sent to
 */
function sendTelegramMessage(sendTo, msg, silent = false, topicId = TELEGRAM_TOPIC_IDS.NOTIFICATIONS) {
	sendOrQueue(
		sendTo,
		buildMessage(topicId, {
			text: limitMessage(msg),
			disable_notification: silent,
		}),
	);
}

module.exports = {
	TELEGRAM_TOPIC_IDS,
	sendTelegramResponse,
	sendTelegramResponseClearKeyboard,
	sendTelegramPosition,
	sendTelegramVenue,
	sendTelegramMessage,
};
