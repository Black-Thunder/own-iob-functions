'use strict';

var commonDefines = require("/opt/iobroker/iobroker-data/modules/commonDefines.js");
var dateTimeFunctions = require("/opt/iobroker/iobroker-data/modules/dateTimeFunctions.js");
var pushoverFunctions = require("/opt/iobroker/iobroker-data/modules/pushoverFunctions.js");

const idLoggingPrefix = "0_userdata.0.CustomLogging.";
const idCurrentEventList = "CurrentEventList";

const subfolder = "CustomLogging/";
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

    var newEntry = entryDateTime + ": <font color=\"" + logColor + "\">" + logLevel + "</font> - " + logText;
    logList = newEntry + "<br>" + logList;

    setState(idLoggingPrefix + idCurrentEventList, logList, () => { isBusyWriting = false; });
}

function backupAndClearCurrentLog(log, getState, setState, formatDate, writeFile) {
    saveCurrentLogToFile(log, getState, formatDate, writeFile, wasSuccessful => { if (wasSuccessful) clearCurrentLog(setState); });
}

function clearCurrentLog(setState) {
    setState(idLoggingPrefix + idCurrentEventList, "");
}

function saveCurrentLogToFile(log, getState, formatDate, writeFile, cb) {
    const userdataRootDirectory = commonDefines.idUserDataPrefix.substr(0, commonDefines.idUserDataPrefix.length - 1); // ohne letzten "."
    var currentLogList = getState(idLoggingPrefix + idCurrentEventList).val;
    currentLogList = currentLogList.split("<br>").join("\n"); // Zeilenumbruch für Text-Editor

    const currentDateString = dateTimeFunctions.getCurrentDate(formatDate, "DD-MM-YYYY");

    writeFile(userdataRootDirectory, subfolder + fileNamePrefix + currentDateString + ".txt", currentLogList, function (error) {
        const completeFilePath = userdataRootDirectory + "/" + subfolder + fileNamePrefix + currentDateString + ".txt";
        var wasSuccessul = true;
        if (error) {
            addCustomLogEntry(getState, setState, getDateObject, formatDate, LOG_LEVELS.ERROR, "Schreiben der Logdatei '" + completeFilePath + "' fehlgeschlagen: " + error);
            pushoverFunctions.sendPushMessage(sendTo, "ioBroker - Fehler beim Schreiben der Logdatei. Bitte prüfen!");
            log("Schreiben der Logdatei '" + completeFilePath + "' fehlgeschlagen: " + error, "error");
            wasSuccessul = false;
        }
        else {
            addCustomLogEntry(getState, setState, getDateObject, formatDate, LOG_LEVELS.INFO, "Schreiben der Logdatei '" + completeFilePath + "' erfolgreich.");
            log("Schreiben der Logdatei '" + completeFilePath + "' erfolgreich", "info");
        }
        cb && cb(wasSuccessul);
    });
}

module.exports = {
    LOG_LEVELS, addCustomLogEntry, backupAndClearCurrentLog, clearCurrentLog, saveCurrentLogToFile
};