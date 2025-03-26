'use strict';

const commonDefines = require("./commonDefines.js");

const VACUUM_STATES = {
    Unknown: -1,
    Initiating: 1,
    Sleeping: 2,
    Standby: 3,
    RemoteControl: 4,
    Cleaning: 5,
    BackToHome: 6,
    ManualControl: 7,
    Charging: 8,
    ChargingError: 9,
    Paused: 10,
    SpotCleaning: 11,
    Error: 12,
    ShuttingDown: 13,
    Updating: 14,
    Docking: 15,
    GoingToSpot: 16,
    ZoneCleaning: 17,
    RoomCleaning: 18,
    EmptyingDustContainer: 22,
    WashingMop: 23,
    GoingToWashMop: 26,
    FullyCharged: 100
};

const VACUUM_ERRORS = {
    Unknown: -1,
    NoError: 0,
    LaserSensorFault: 1,
    CollsionSensorFault: 2,
    WheelFloating: 3,
    CliffSensorFault: 4,
    MainBrushBlocked: 5,
    SideBrushBlocked: 6,
    WheelBlocked: 7,
    DeviceStuck: 8,
    DustBinMissing: 9,
    FilterBlocked: 10,
    MagneticFieldDetected: 11,
    LowBattery: 12,
    ChargingProblem: 13,
    BatteryFailure: 14,
    WallSensorFault: 15,
    UnevenSurface: 16,
    SideBrushFailure: 17,
    SuctionFanFailure: 18,
    UnpoweredChargingStation: 19,
    UnknownError: 20,
    LaserPressureSensorProblem: 21,
    ChargeSensorProblem: 22,
    DockProblem: 23,
    NoGoZoneOrInvisibleWallDetected: 24,
    BinFull: 254,
    InternalError: 255
};

const VACUUM_NAMES = {
    JAMES: "James",
    ALFRED: "Alfred"
}

const aliasPrefix = "alias.0.Devices.RobotVacuums.";

/**
* @param {string} room
* @param {string} vacuumName via VACUUM_NAMES
*/
function startRoomCleaning(setState, room, vacuumName) {
    // Zunächst alle Flags zurücksetzen
    resetAllRoomCleaningFlags(setState, vacuumName);

    // Flags für zu reinigende Räume setzen
    if (room == commonDefines.ROOMS.COMPLETE) {
        setAllRoomCleaningFlags(setState, vacuumName);
    }
    else {
        setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_${commonFunctions.translateRoomNameToEnglish(room)}`, true);
    }

    // Raumreinigung starten     
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_START`, true);
}

/**
* @param {string} vacuumName via VACUUM_NAMES
* @return {string}
*/
function resetAllRoomCleaningFlags(setState, vacuumName) {
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_BALCONY`, false);
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_BATHROOM`, false);
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_BEDROOM`, false);
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_HALLWAY`, false);
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_KITCHEN`, false);
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_LIVINGROOM`, false);

    switch (vacuumName) {
        case VACUUM_NAMES.JAMES:
            setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_ROOMDOMI`, false);
            break;
        case VACUUM_NAMES.ALFRED:
            setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_SIDEROOM`, false);
            break;
        default:
            break;
    }
}

/**
* @param {string} vacuumName via VACUUM_NAMES
* @return {string}
*/
function setAllRoomCleaningFlags(setState, vacuumName) {
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_BALCONY`, true); // Balkon nie bei "Komplett" reinigen, da nicht erreichbar
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_BEDROOM`, true);
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_HALLWAY`, true);
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_KITCHEN`, true);
    setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_LIVINGROOM`, true);

    switch (vacuumName) {
        case VACUUM_NAMES.JAMES:
            setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_ROOMDOMI`, true);
            break;
        case VACUUM_NAMES.ALFRED:
            setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_SIDEROOM`, true);
            setState(`${aliasPrefix}${vacuumName}.ROOM_CLEANING_BATHROOM`, true); // Bad nur bei Oma reinigen, da bei uns nicht erreichbar
            break;
        default:
            break;
    }
}

/**
* @param {string} vacuumName via VACUUM_NAMES
* @return {boolean}
*/
function isVacuumConnected(getState, vacuumName) {
    return getState(`${aliasPrefix}${vacuumName}.WORKING`).val;
}

/**
* @param {any} vacuumName via VACUUM_NAMES
* @return {string}
*/
function getVacuumStatusText(getState, vacuumName) {
    return getState(`0_userdata.0.RobotVacuumControl.${vacuumName}.StatusText`).val;
}

/**
* @param {string} vacuumName via VACUUM_NAMES
* @return {number}
*/
function getVacuumState(getState, vacuumName) {
    return getState(`${aliasPrefix}${vacuumName}.STATE`).val;
}

/**
* @param {string} vacuumName via VACUUM_NAMES
* @return {number}
*/
function getVacuumBatteryLevel(getState, vacuumName) {
    return getState(`${aliasPrefix}${vacuumName}.BATTERY`).val;
}

module.exports = {
    VACUUM_STATES, VACUUM_ERRORS, VACUUM_NAMES, startRoomCleaning, isVacuumConnected, getVacuumStatusText,
    getVacuumState, getVacuumBatteryLevel
};