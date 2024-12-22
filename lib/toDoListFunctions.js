'use strict';

const commonDefines = require("./commonDefines.js");

const idToDoListPrefix = `${commonDefines.idUserDataPrefix}Visualization.ToDoList.`;
const idToDoCount = `${idToDoListPrefix}ToDoCount`;

function setToDo($, getState, setState, log, getDateObject, formatDate, content) {
    const unusedToDosArray = $(`state[state.id=${idToDoListPrefix}ToDo_*_Content]`).toArray().filter((id) => getState(id)?.val === "");

    // Alle verfügbaren ToDos noch unerledigt
    if (unusedToDosArray.length == 0) {
        log(`toDoListFunctions.js - setToDo(): Keine frien ToDos mehr vorhanden. Das ToDo '${content}' konnte nicht mehr gesetzt werden!`, "error")
    }
    // Ansonsten den ersten freien nehmen
    else {
        const entryDateTime = formatDate(getDateObject((new Date().getTime())), "TT.MM.JJ hh:mm");
        content = `<font size="4">${entryDateTime}: ${content}</font>`;

        setState(unusedToDosArray[0], content);
        setState(idToDoCount, getState(idToDoCount).val + 1);
    }
}

function clearToDoByIndex(existsState, getState, setState, index) {
    const idContentState = `${idToDoListPrefix}ToDo_${index}_Content`;

    if (existsState(idContentState)) {
        setState(idContentState, "");
        setState(idToDoCount, getState(idToDoCount).val - 1);
    }
}

function clearToDoByContent($, getState, setState, content) {
    if (content == "") return;
    const foundToDo = $(`state[state.id=${idToDoListPrefix}ToDo_*_Content]`).toArray().filter((id) => getState(id)?.val.includes(content));

    // Nur wenn gefunden
    if (foundToDo.length > 0) {
        setState(foundToDo[0], "");
        setState(idToDoCount, getState(idToDoCount).val - 1);
    }
}

function clearToDoList($, setState) {
    $(`state[state.id=${idToDoListPrefix}ToDo_*_Content]`).each(function (id) {
        setState(id, "");
    });

    setState(idToDoCount, 0);
}

module.exports = {
    setToDo, clearToDoByIndex, clearToDoByContent, clearToDoList
};