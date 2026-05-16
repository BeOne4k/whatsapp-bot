/**
 * handlers/help.js — Help chat powered by Gemini AI.
 * Mirrors handlers/help.py exactly.
 */

const { setState, clearState, getData, updateData, States } = require('../utils/state');
const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { askGemini } = require('../utils/gemini');
const { showMainMenu } = require('./start');

const HISTORY_KEY = 'gemini_history';
const MAX_HISTORY_TURNS = 10;

async function startHelp(client, chatId, lang) {
    await track(chatId, 'help_started', lang);
    setState(chatId, States.HELP_CHATTING);
    updateData(chatId, { [HISTORY_KEY]: [] });

    const msg =
        t(lang, 'help_hello') +
        '\n\n' +
        `_(Type *0* to clear history, *9* for main menu)_`;
    await client.sendMessage(chatId, msg);
}

async function handleMessage(client, msg, chatId, lang) {
    const userText = (msg.body || '').trim();
    if (!userText) return;

    // Typing indicator (not supported in WA Web.js but we can log)
    const data = getData(chatId);
    let history = (data[HISTORY_KEY] || []);

    history.push({ role: 'user', text: userText });

    // Trim history
    if (history.length > MAX_HISTORY_TURNS * 2) {
        history = history.slice(-(MAX_HISTORY_TURNS * 2));
    }

    await track(chatId, 'help_message_sent', lang);
    const aiResponse = await askGemini(history, lang);

    history.push({ role: 'model', text: aiResponse });
    updateData(chatId, { [HISTORY_KEY]: history });

    const hint = `\n\n_(0 = clear history, 9 = main menu)_`;
    await client.sendMessage(chatId, aiResponse + hint);
}

async function clearHistory(client, chatId, lang) {
    updateData(chatId, { [HISTORY_KEY]: [] });
    await client.sendMessage(chatId, t(lang, 'help_cleared'));
}

module.exports = { startHelp, handleMessage, clearHistory };
