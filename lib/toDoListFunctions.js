'use strict';

const commonDefines = require("./commonDefines.js");
const idToDoListObject = `${commonDefines.idUserDataPrefix}Visualization.ToDoList.ToDoListObject`;

function setToDo(getState, setState, getDateObject, formatDate, content) {
    // Get current todo list
    const todoList = getState(idToDoListObject)?.val ? JSON.parse(getState(idToDoListObject).val) : {
        todos: [],
        count: 0
    };

    // Format content with timestamp
    const entryDateTime = formatDate(getDateObject((new Date().getTime())), "TT.MM.JJ hh:mm");
    const formattedContent = `<font size="4">${entryDateTime}: ${content}</font>`;

    // Add new todo at first empty slot or at end
    const emptyIndex = todoList.todos.findIndex(todo => !todo || todo.content === "");
    if (emptyIndex !== -1) {
        todoList.todos[emptyIndex] = { content: formattedContent };
    } else {
        todoList.todos.push({ content: formattedContent });
    }

    todoList.count = todoList.todos.filter(todo => todo && todo.content).length;

    // Update state
    setState(idToDoListObject, JSON.stringify(todoList));
}

function clearToDoByIndex(getState, setState, index) {
    const todoList = JSON.parse(getState(idToDoListObject).val);

    if (index >= 0 && index < todoList.todos.length) {
        // Remove todo and shift others forward
        todoList.todos.splice(index, 1);
        todoList.count = todoList.todos.filter(todo => todo && todo.content).length;

        setState(idToDoListObject, JSON.stringify(todoList));
    }
}

function clearToDoByContent(getState, setState, content) {
    if (!content) return;

    const todoList = JSON.parse(getState(idToDoListObject).val);
    const index = todoList.todos.findIndex(todo => todo && todo.content.includes(content));

    if (index !== -1) {
        clearToDoByIndex(getState, setState, index);
    }
}

function clearToDoList(setState) {
    const emptyList = {
        todos: [],
        count: 0
    };

    setState(idToDoListObject, JSON.stringify(emptyList));
}

module.exports = {
    setToDo, clearToDoByIndex, clearToDoByContent, clearToDoList
};