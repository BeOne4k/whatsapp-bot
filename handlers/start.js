/**
 * handlers/start.js — /start, language selection, main menu.
 * Mirrors handlers/start.py exactly.
 */

const { clearState, setLang, getLang } = require('../utils/state');
const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { startReminder, cancelReminder } = require('../utils/reminders');
const { registerChannel } = require('../utils/apiClient');
const { bind: registryBind } = require('../utils/chatRegistry');
const { flushPending } = require('../webhook_api');

async function handleStart(client, msg, chatId) {
    const text = msg.body || '';
    const parts = text.split(/\s+/, 2);
    const lang = getLang(chatId);
    clearState(chatId);

    await track(chatId, 'bot_started', lang);

    // Deep-link: /start <phone>  →  bind chatId in BotsAPI
    if (parts.length > 1) {
        const phone = parts[1].trim();
        await registerChannel(phone, chatId);
        registryBind(phone, chatId);
        flushPending(phone, client);
    }

    await showLanguageMenu(client, chatId);
}

async function showLanguageMenu(client, chatId) {
    const lang = getLang(chatId);
    const text =
        t(lang, 'welcome') +
        '\n\n1️⃣ 🇬🇧 English\n2️⃣ 🇷🇺 Русский\n3️⃣ 🇹🇭 ภาษาไทย';
    await client.sendMessage(chatId, text);
}

async function setLanguage(client, chatId, lang) {
    setLang(chatId, lang);
    await track(chatId, 'language_selected', lang, { selected_lang: lang });
    await client.sendMessage(chatId, t(lang, 'lang_set'));
    await client.sendMessage(chatId, t(lang, 'loyalty_hint'));
    await showMainMenu(client, chatId, lang);

    // Post-language reminders (mirrors Telegram bot exactly)
    startReminder(client, chatId, lang, 'loyalty5m', 300, 'loyalty5m_reminder');
    startReminder(client, chatId, lang, 'loyalty2h', 7200, 'loyalty_reminder');
    startReminder(client, chatId, lang, 'loyalty24h', 86400, 'loyalty24h_reminder');
}

async function showMainMenu(client, chatId, lang) {
    cancelReminder(chatId);
    const menu =
        t(lang, 'main_menu') +
        '\n\n' +
        t(lang, 'menu_hint');
    await client.sendMessage(chatId, menu);
}

module.exports = { handleStart, showLanguageMenu, setLanguage, showMainMenu };
