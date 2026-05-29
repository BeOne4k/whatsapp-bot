/**
 * handlers/help.js — Help chat powered by Gemini AI.
 * Each AI reply shows a "contact manager" hint with the manager's WA number.
 */

const { setState, clearState, getData, updateData, States } = require('../utils/state');
const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { askGemini } = require('../utils/gemini');
const { showMainMenu } = require('./start');
const config = require('../config');

const HISTORY_KEY = 'gemini_history';
const MAX_HISTORY_TURNS = 10;

async function startHelp(client, chatId, lang) {
    await track(chatId, 'help_started', lang);
    setState(chatId, States.HELP_CHATTING);
    updateData(chatId, { [HISTORY_KEY]: [] });

    const msg =
        t(lang, 'help_hello') +
        '\n\n' +
        `_(${t(lang, 'help_hint')})_`;
    await client.sendMessage(chatId, msg);
}

async function handleMessage(client, msg, chatId, lang) {
    const userText = (msg.body || '').trim();
    if (!userText) return;

    const data = getData(chatId);
    let history = (data[HISTORY_KEY] || []);

    history.push({ role: 'user', text: userText });

    if (history.length > MAX_HISTORY_TURNS * 2) {
        history = history.slice(-(MAX_HISTORY_TURNS * 2));
    }

    await track(chatId, 'help_message_sent', lang);
    const aiResponse = await askGemini(history, lang);

    history.push({ role: 'model', text: aiResponse });
    updateData(chatId, { [HISTORY_KEY]: history });

    await client.sendMessage(chatId, _formatAiReply(aiResponse, lang));
}

async function clearHistory(client, chatId, lang) {
    updateData(chatId, { [HISTORY_KEY]: [] });
    await client.sendMessage(chatId, t(lang, 'help_cleared'));
}

async function contactManager(client, chatId, lang) {
    const waId = config.MANAGER_WA_ID;
    const text = waId
        ? t(lang, 'manager_username_prompt').replace('{wa_id}', waId)
        : t(lang, 'manager_transferred');

    await track(chatId, 'manager_contact_shown', lang, { trigger: 'ai_help' });
    clearState(chatId);
    await client.sendMessage(chatId, text);
    await showMainMenu(client, chatId, lang);
}

/**
 * Build AI reply text with manager contact hint appended.
 */
function _formatAiReply(aiText, lang) {
    const waId = config.MANAGER_WA_ID;
    const managerHint = `\n\n_(${t(lang, 'help_hint')})_`;
    return aiText + managerHint;
}

module.exports = { startHelp, handleMessage, clearHistory, contactManager };
