'use strict';

const commonDefines = require("./commonDefines.js");

const idLoggingPrefix = "0_userdata.0.CustomLogging.";
const idCurrentEventList = "CurrentEventList";

const subfolder = "CustomLogging";
const fileNamePrefix = "EventList_";

var isBusyWriting = false;

const LOG_LEVELS = {
    INFO: "Info",
    WARN: "Warnung",
    ERROR: "Fehler"
};

/**
* @param {string} logLevel via LOG_LEVELS
* @param {string} logText
*/
function addCustomLogEntry(getState, setState, getDateObject, formatDate, logLevel, logText) {
    if (isBusyWriting) {
        setTimeout(() => {
            addCustomLogEntry(getState, setState, getDateObject, formatDate, logLevel, logText);
        }, 200);
        return;
    }

    isBusyWriting = true;

    var logList = getState(idLoggingPrefix + idCurrentEventList).val;
    const entryDateTime = formatDate(getDateObject((new Date().getTime())), "TT.MM.JJ hh:mm:ss");

    var logColor = "";
    switch (logLevel) {
        case LOG_LEVELS.ERROR:
            logColor = "red";
            break;
        case LOG_LEVELS.WARN:
            logColor = "orange";
            break;
        case LOG_LEVELS.INFO:
        default:
            logColor = "white";
            break;
    }

    var newEntry = `<font size="4">${entryDateTime}: <font color="${logColor}">${logLevel}</font> - ${logText}</font>`;
    logList = `${newEntry}<br>${logList}`;

    setState(idLoggingPrefix + idCurrentEventList, logList, () => { isBusyWriting = false; });
}

function backupAndClearCurrentLog(log, getState, setState, getDateObject, formatDate, writeFile) {
    saveCurrentLogToFile(log, getState, setState, getDateObject, formatDate, writeFile, wasSuccessful => { if (wasSuccessful) clearCurrentLog(setState); });
}

function clearCurrentLog(setState) {
    setState(idLoggingPrefix + idCurrentEventList, "");
}

// Saves log file to "0_userdata.0/CustomLogging/YYYY/MM/EventList_DD-MM-YYYY.txt"
function saveCurrentLogToFile(log, getState, setState, getDateObject, formatDate, writeFile, cb) {
    const userdataRootDirectory = commonDefines.idUserDataPrefix.substring(0, commonDefines.idUserDataPrefix.length - 1); // ohne letzten "."
    var currentLogList = getState(idLoggingPrefix + idCurrentEventList).val;
    currentLogList = currentLogList.split("<br>").join("\n"); // Zeilenumbruch für Text-Editor

    const currentDateObj = new Date();
    const currentDateString = currentDateObj.toLocaleDateString("de-DE").replaceAll(".", "-"); // DD-MM-YYYY

    writeFile(userdataRootDirectory, `${subfolder}/${currentDateObj.getFullYear()}/${(currentDateObj.getMonth() + 1) < 10 ? `0${currentDateObj.getMonth() + 1}` : `${currentDateObj.getMonth() + 1}`}/${fileNamePrefix}${currentDateString}.txt`, currentLogList, function (error) {
        const completeFilePath = `${userdataRootDirectory}/${subfolder}/${currentDateObj.getFullYear()}/${currentDateObj.getMonth() + 1}/${fileNamePrefix}${currentDateString}.txt`;
        var wasSuccessul = true;
        if (error) {
            const msg = `Schreiben der Logdatei '${completeFilePath}' fehlgeschlagen: ${error}`;
            addCustomLogEntry(getState, setState, getDateObject, formatDate, LOG_LEVELS.ERROR, msg);
            log(msg, "error");
            wasSuccessul = false;
        }
        else {
            const msg = `Schreiben der Logdatei '${completeFilePath}' erfolgreich.`;
            addCustomLogEntry(getState, setState, getDateObject, formatDate, LOG_LEVELS.INFO, msg);
            log(msg, "info");
        }
        cb && cb(wasSuccessul);
    });
}

module.exports = {
    LOG_LEVELS, addCustomLogEntry, backupAndClearCurrentLog, clearCurrentLog, saveCurrentLogToFile
};
