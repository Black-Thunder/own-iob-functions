/* eslint-disable jsdoc/check-param-names */
"use strict";

const pushoverInstance = "pushover.0";

const PUSH_MSG_PRIORITY = {
	LOWEST: -2, // -2 lowest priority
	LOW: -1, // -1 to always send as a quiet notification
	NORMAL: 0, // 0 normal priority
	HIGH: 1, // 1 to display as high-priority and bypass the user's quiet hours
	HIGH_REPEATING: 2, // 2 same as 1 plus repeats until confirmation from the user
};

/**
 * @param {string} msg Text message
 * @param {string} [title] Message's title, otherwise app's name is used (default = "")
 * @param {string} [url] a supplementary URL to show with your message (default = "")
 * @param {string} [sound] Name of one of the sounds supported by device clients to override the user's default sound choice (default = ""): pushover, bike, bugle, cashregister, classical, cosmic, falling,
                             gamelan, incoming, intermission, magic, mechanical, pianobar, siren, spacealarm, tugboat, alien, climb, persistent, echo, updown, none
 * @param {number} [priority] range: -2 to 2 (default = 0) via PUSH_MSG_PRIORITY
 */
function sendPushMessage(sendTo, msg, title = "", url = "", sound = "", priority = 0) {
	if (msg == "") {
		return;
	}

	if (priority < -2 || priority > 2) {
		priority = 0;
	}

	sendTo(pushoverInstance, {
		message: String(msg),
		title: title,
		url: url,
		sound: sound,
		priority: priority,
	});
}

module.exports = { PUSH_MSG_PRIORITY, sendPushMessage };
