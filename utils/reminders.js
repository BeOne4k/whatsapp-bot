/**
 * utils/reminders.js — Delayed message reminders.
 * Mirrors utils/reminders.py exactly.
 */

const { t } = require('../locales/texts');

// chatId -> { name -> timeoutId }
const reminderTasks = new Map();

function startReminder(client, chatId, lang, name, delaySeconds, textKey) {
    if (!reminderTasks.has(chatId)) reminderTasks.set(chatId, {});
    const existing = reminderTasks.get(chatId)[name];
    if (existing) clearTimeout(existing);

    const timerId = setTimeout(async () => {
        try {
            await client.sendMessage(chatId, t(lang, textKey));
        } catch (e) {
            console.error('[Reminder] Failed to send:', e.message);
        }
        const tasks = reminderTasks.get(chatId);
        if (tasks) delete tasks[name];
        if (tasks && Object.keys(tasks).length === 0) reminderTasks.delete(chatId);
    }, delaySeconds * 1000);

    reminderTasks.get(chatId)[name] = timerId;
}

function cancelReminder(chatId, name = null) {
    const tasks = reminderTasks.get(chatId);
    if (!tasks) return;

    if (name === null) {
        for (const id of Object.values(tasks)) clearTimeout(id);
        reminderTasks.delete(chatId);
    } else {
        if (tasks[name]) {
            clearTimeout(tasks[name]);
            delete tasks[name];
        }
        if (Object.keys(tasks).length === 0) reminderTasks.delete(chatId);
    }
}

module.exports = { startReminder, cancelReminder };
