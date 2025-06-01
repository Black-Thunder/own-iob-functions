'use strict';

const commonDefines = require("./commonDefines.js");

const idToDoListPrefix = `${commonDefines.idUserDataPrefix}Visualization.ToDoList.`;
const idToDoCount = `${idToDoListPrefix}ToDoCount`;

async function setToDo($, getState, setState, createStateAsync, getDateObject, formatDate, content) {
    // Get all todo states and find an unused one
    const unusedToDosArray = $(`state[state.id=${idToDoListPrefix}ToDo_*_Content]`).toArray();
    let unusedToDo = unusedToDosArray.find(id => getState(id)?.val === "");

    // If no unused ToDo found, create a new one
    if (!unusedToDo) {
        // Calculate next index by finding highest existing index
        const existingIds = unusedToDosArray.map(id => {
            const match = id.match(/ToDo_(\d+)_Content/);
            return match ? parseInt(match[1]) : 0;
        });
        const nextIndex = Math.max(0, ...existingIds) + 1;

        // Create new ToDo states
        unusedToDo = `${idToDoListPrefix}ToDo_${nextIndex}_Content`;

        try {
            // Create both states in parallel
            await Promise.all([
                createStateAsync(`${idToDoListPrefix}ToDo_${nextIndex}_Content`, "", {
                    type: 'string',
                    name: `Inhaltsbeschreibung des ToDos ${nextIndex}`,
                    read: true,
                    write: true,
                    role: 'text'
                }),
                createStateAsync(`${idToDoListPrefix}ToDo_${nextIndex}_Clear`, false, {
                    type: 'boolean',
                    name: `Flag, ob das ToDo ${nextIndex} gelöscht werden soll`,
                    read: false,
                    write: true,
                    role: 'indicator'
                })
            ]);
        } catch (error) {
            throw new Error(`Failed to create new ToDo states: ${error.message}`);
        }
    }

    // Format content with timestamp
    const entryDateTime = formatDate(getDateObject((new Date().getTime())), "TT.MM.JJ hh:mm");
    const formattedContent = `<font size="4">${entryDateTime}: ${content}</font>`;

    // Update states in parallel
    try {
        await Promise.all([
            setState(unusedToDo, formattedContent),
            setState(idToDoCount, (getState(idToDoCount)?.val || 0) + 1)
        ]);
    } catch (error) {
        throw new Error(`Failed to update ToDo states: ${error.message}`);
    }
}

function clearToDoByIndex(existsState, getState, setState, index) {
    const idContentState = `${idToDoListPrefix}ToDo_${index}_Content`;

    if (existsState(idContentState)) {
        setState(idContentState, "");
        const toDoCount = getState(idToDoCount).val;

        if (toDoCount > 0) {
            setState(idToDoCount, toDoCount - 1);
        }
    }
}

function clearToDoByContent($, getState, setState, content) {
    if (content == "") return;
    const foundToDo = $(`state[state.id=${idToDoListPrefix}ToDo_*_Content]`).toArray().filter((id) => getState(id)?.val.includes(content));

    // Nur wenn gefunden
    if (foundToDo.length > 0) {
        setState(foundToDo[0], "");
        const toDoCount = getState(idToDoCount).val;

        if (toDoCount > 0) {
            setState(idToDoCount, toDoCount - 1);
        }
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