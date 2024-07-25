'use strict';

const defaultDateFormat = "DD.MM.YYYY hh:mm";
const defaultDateFormatWithSeconds = "DD.MM.YYYY hh:mm:ss";

/**
* Gibt das aktuelle Datum als String im angegebenen Format zurück
* @param {string} [dateFormat=defaultDateFormat] Desired date format (default = "DD.MM.YYYY hh:mm")
* @return {string}
*/
function getCurrentDate(formatDate, dateFormat = defaultDateFormat) {
    return formatDate(new Date(), dateFormat);
}

/**
* Gibt das aktuelle Datum und die aktuelle Uhrzeit als Date-Objekt zurück
* @return {object}
*/
function getCurrentDateTime() {
    var date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

/**
* @param {{ getHours: () => number; getMinutes: () => number; }} date
* @return {number}
*/
function getMinutesOfDate(date) {
    return date.getHours() * 60 + date.getMinutes();
}

/**
* Wandelt Uhrzeit als String in Date-Objekt um (Formate: "HH:MM" oder "HH:MM:SS")
* @param {string} strTime
*/
function addTime(strTime) {
    var time = strTime.split(':');
    var d = getCurrentDateTime();

    if (time.length < 2) return d;

    d.setHours(time[0]);
    d.setMinutes(time[1]);
    if (time.length == 3) d.setSeconds(time[2]);

    return d;
}

/**
* Prüft, ob die aktuelle Uhrzeit zwischen dem angegebenen Bereich (Formate: "HH:MM" oder "HH:MM:SS") liegt
* @param {any} strLower Startzeit
* @param {any} strUpper Endzeit
*/
function isTimeInRange(strLower, strUpper) {
    var now = new Date();
    var lower = addTime(strLower);
    var upper = addTime(strUpper);
    var inRange = false;
    if (upper > lower) {
        // opens and closes in same day
        inRange = (now >= lower && now <= upper) ? true : false;
    } else {
        // closes in the following day
        inRange = (now >= upper && now <= lower) ? false : true;
    }
    return inRange;
}

/**
* "hh:mm" oder "hh:mm:ss" in Array splitten
* @param {string} timeString
* @return {number[]}
*/
function splitTimeString(timeString) {
    timeString = timeString.trim().replace("Uhr", "");
    var timeArray = timeString.split(':').map(function (item) {
        return parseInt(item, 10);
    });

    if (timeArray.length != 2 && timeArray.length != 3 || timeArray[0] > 24 || timeArray[1] > 60 || (timeArray.length == 3 && timeArray[2] > 60)) {
        return null;
    }

    return timeArray;
}

/**
* "DD.MM.YYYY" in Array splitten
* @param {string} dateString
* @return {number[]}
*/
function splitDateString(dateString) {
    var dateArray = dateString.split('.').map(function (item) {
        return parseInt(item, 10);
    });

    if (dateArray.length != 3 || dateArray[0] > 31 || dateArray[1] > 12 || dateArray[2] > 9999) {
        return null;
    }
    return dateArray;
}

/**
* z.B. "05:10" -> 310
* @param {string} timeString Inputformat: "SS:mm"
* @return {number}
*/
function getMinutesFromTimeString(timeString) {
    var timeArray = splitTimeString(timeString);

    if (timeArray == null) {
        return -1;
    }

    return timeArray[0] * 60 + timeArray[1];
}

/**
* z.B. "05:10" -> 5
* @param {string} timeString Inputformat: "SS:mm"
* @return {number}
*/
function getHoursFromTimeString(timeString) {
    var timeArray = splitTimeString(timeString);

    if (timeArray == null) {
        return -1;
    }

    return timeArray[0];
}

// Inputformat: " TT.MM.YYYY SS:mm", Ausgabe als Date-Objekt
/**
* @param {string} dateTimeString
* @param {boolean} [withSeconds=false]
* @return {Date}
*/
function getDateFromDateTimeString(dateTimeString, withSeconds = false) {
    var dateTimeArray = dateTimeString.split(" ");

    if (dateTimeArray.length != 2) {
        return null;
    }

    const dateArray = splitDateString(dateTimeArray[0]);
    const timeArray = splitTimeString(dateTimeArray[1]);

    if (dateArray == null || timeArray == null) {
        return null;
    }

    return withSeconds ? new Date(dateArray[2], dateArray[1] - 1, dateArray[0], timeArray[0], timeArray[1], timeArray[2])
        : new Date(dateArray[2], dateArray[1] - 1, dateArray[0], timeArray[0], timeArray[1]);
}

/**
* Ändert das übergebene Date-Objekt um die gewünschte Minutenzahl
* @param {Date} date
* @param {number} minutes
* @return {Date}
*/
function manipulateDate(date, minutes) {
    // Stunden verschieben, wenn mehr als 59 Minuten
    if (minutes > 59) {
        date.setHours(date.getHours() + Math.floor(minutes / 60));
    }
    // Es soll nur um Sekunden verschoben werden
    else if (minutes < 1 && minutes > 0) {
        date.setMinutes(date.getMinutes(), minutes * 60);
        return date;
    }

    // Minuten verschieben
    date.setMinutes(date.getMinutes() + minutes % 60);
    return date;
}

/**
* @param {Date} date
* @return {string} Format: "TT.MM.JJJJ SS:mm:ss"
*/
function formatDateTimeAsGermanString(date) {
    return fillLeadingZeros(date.getDate()) + "." + fillLeadingZeros(date.getMonth() + 1) + "." + date.getFullYear() + " "
        + fillLeadingZeros(date.getHours()) + ":" + fillLeadingZeros(date.getMinutes()) + ":" + fillLeadingZeros(date.getSeconds());
}


/**
* @param {Date} date
* @param {boolean} withSeconds
* @return {string} Format: "SS:mm" (if withSeconds=true: "SS:mm:ss")
*/
function formatTimeAsGermanString(date, withSeconds) {
    var seconds = withSeconds ? (":" + fillLeadingZeros(date.getSeconds())) : "";
    return fillLeadingZeros(date.getHours()) + ":" + fillLeadingZeros(date.getMinutes()) + seconds;
}

/**
* z.B. (61) -> "01:01h"
* @param {number} rawMinutes
* @return {string} Format: "SS:mm" ("01:01h")
*/
function formatMinutesAsHourMinutes(rawMinutes) {
    var hours = 0;
    if (rawMinutes >= 60) {
        hours = Math.floor(rawMinutes / 60);
    }
    var minutes = rawMinutes % 60;

    return [fillLeadingZeros(hours), ":", fillLeadingZeros(minutes), "h"].join('');
}

/**
* @param {Date} possibleDate
* @return {boolean}
*/
function isValidDate(possibleDate) {
    return possibleDate instanceof Date && possibleDate.toLocaleDateString() != "";
}

/**
* @param {string | number} value
* @return {string | number}
*/
function fillLeadingZeros(value) {
    return value < 10 ? "0" + value : value;
}

/**
* @return {boolean}
*/
function isWorkday(getState) {
    return getState("0_userdata.0.Astro.IsWorkday").val;
}

/**
* @return {boolean}
*/
function isWeekend(getState) {
    return !isWorkday(getState);
}

// Aktuelles Datum und Zeit in State speichern
/**
* @param {string} stateId ID of state in which current date/time should be stored
* @param {boolean} [withSeconds=false] Flag, if seconds should also be stored (default = false)
*/
function saveCurrentDateTimeToState(setState, formatDate, stateId, withSeconds = false) {
    const dateFormat = withSeconds ? defaultDateFormatWithSeconds : defaultDateFormat;
    setState(stateId, getCurrentDate(formatDate, dateFormat));
}

// Aktuelles Datum und Zeit als ISO-String in State speichern (z.B. "2024-06-20T14:10:48.992Z")
/**
* @param {string} stateId ID of state in which current date/time should be stored
*/
function saveCurrentDateTimeToStateAsDate(setState, stateId) {
    const now = new Date();
    setState(stateId, now.toISOString());
}

module.exports = {
    getCurrentDate, getCurrentDateTime, getMinutesOfDate, addTime, isTimeInRange, splitTimeString, splitDateString, getMinutesFromTimeString, getHoursFromTimeString,
    getDateFromDateTimeString, manipulateDate, formatDateTimeAsGermanString, formatTimeAsGermanString, formatMinutesAsHourMinutes, isValidDate, fillLeadingZeros, isWorkday, isWeekend, saveCurrentDateTimeToState, saveCurrentDateTimeToStateAsDate
};