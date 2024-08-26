'use strict';

const commonDefines = require("./commonDefines.js");

const PERSON_NAMES = {
    DOMINIK: "Dominik",
    MARION: "Marion",
};

/**
* @return {boolean}
*/
function isAnybodyAtHome(getState) {
    return getState(`${commonDefines.idUserDataPrefix}PresenceManagement.IsAnyoneAtHome`).val;
}

/**
* @return {boolean}
*/
function isEverybodyAtHome(getState) {
    const isDominikAtHome = getState(`${commonDefines.idUserDataPrefix}PresenceManagement.IsDominikAtHome`).val;
    const isMarionAtHome = getState(`${commonDefines.idUserDataPrefix}PresenceManagement.IsMarionAtHome`).val;
    return isDominikAtHome && isMarionAtHome;
}

/**
* @param {string} person via PERSON_NAMES
* @return {boolean}
*/
function isSpecificPersonAtHome(getState, log, person) {
    if (person.includes(PERSON_NAMES.DOMINIK) || person.includes(PERSON_NAMES.MARION)) {
        return getState(`${commonDefines.idUserDataPrefix}PresenceManagement.Is${person}AtHome`).val;
    }

    log(`isSpecificPersonAtHome() - Unbekannte Person: ${person}`, "error");
    return false;
}

/**
* @param {string} person via PERSON_NAMES
* @param {boolean} isPresent
*/
function setPresenceState(setState, log, person, isPresent) {
    if (person.includes(PERSON_NAMES.DOMINIK) || person.includes(PERSON_NAMES.MARION)) {
        setState(`${commonDefines.idUserDataPrefix}PresenceManagement.Is${person}AtHome`, isPresent);
    }
    else {
        log(`setPresenceState() - Unbekannte Person: ${person}`, "error");
    }
}

/**
* @param {string} person via PERSON_NAMES
* @return {boolean} New presence state
*/
function togglePresenceState(getState, setState, log, person) {
    if (person.includes(PERSON_NAMES.DOMINIK) || person.includes(PERSON_NAMES.MARION)) {
        const stateId = `${commonDefines.idUserDataPrefix}PresenceManagement.Is${person}AtHome`;
        const oldPresence = getState(stateId).val;
        setState(stateId, !oldPresence);

        return !oldPresence;
    }

    log(`togglePresenceState() - Unbekannte Person: ${person}`, "error");
    return false;
}

module.exports = { PERSON_NAMES, isAnybodyAtHome, isEverybodyAtHome, isSpecificPersonAtHome, setPresenceState, togglePresenceState };