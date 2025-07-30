'use strict';

const commonDefines = require("./commonDefines.js");

const idToDoListPrefix = `${commonDefines.idUserDataPrefix}Visualization.ToDoList.`;
const idToDoCount = `${idToDoListPrefix}ToDoCount`;

async function setToDo($, getState, setState, createStateAsync, getDateObject, formatDate, content) {
    const allToDoStates = $(`state[state.id=${idToDoListPrefix}ToDo_*_Content]`).toArray();

    // Sort inidices numerically
    const sortedToDoStates = allToDoStates
        .map(id => ({
            id,
            index: parseInt(id.match(/ToDo_(\d+)_Content/)?.[1], 10)
        }))
        .filter(entry => !isNaN(entry.index))
        .sort((a, b) => a.index - b.index);

    // Find the first unused one
    let unusedEntry = sortedToDoStates.find(entry => getState(entry.id)?.val === "");

    let unusedToDo = unusedEntry?.id;

    // If no unused ToDo found, create a new one
    if (!unusedToDo) {
        const existingIndices = sortedToDoStates.map(entry => entry.index);
        const nextIndex = existingIndices.length ? Math.max(...existingIndices) + 1 : 0;

        unusedToDo = `${idToDoListPrefix}ToDo_${nextIndex}_Content`;

        try {
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
    const entryDateTime = formatDate(getDateObject(new Date().getTime()), "TT.MM.JJ hh:mm");
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

async function clearToDoList($, setStateAsync) {
    const allToDoStates = $(`state[state.id=${idToDoListPrefix}ToDo_*_Content]`).toArray();

    for (const id of allToDoStates) {
        await setStateAsync(id, "");
    }

    const countVal = getState(idToDoCount);
    if (countVal !== undefined) {
        await setStateAsync(idToDoCount, 0);
    }
}

module.exports = {
    setToDo, clearToDoByIndex, clearToDoByContent, clearToDoList
};