/**
 * handlers/start.js — /start, language selection, main menu.
 * Mirrors handlers/start.py exactly.
 */

const { clearState, setState, setLang, getLang, setBinomClickId, setFbclid, States } = require('../utils/state');
const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { startReminder, cancelReminder } = require('../utils/reminders');
const { registerChannel } = require('../utils/apiClient');
const { bind: registryBind } = require('../utils/chatRegistry');
const { flushPending } = require('../webhook_api');

async function handleStart(client, msg, chatId) {
    const text  = msg.body || '';
    const parts = text.split(/\s+/, 2);
    const lang  = getLang(chatId);
    clearState(chatId);

    await track(chatId, 'bot_started', lang);

    // Deep-link: /start <arg>  →  bind chatId in BotsAPI, или Binom clickid-fbclid
    // (аналог `/start <arg>` в Telegram, см. handlers/start.py: cmd_start)
    if (parts.length > 1) {
        const arg = parts[1].trim();
        if (arg.startsWith('+') || /^\d+$/.test(arg)) {
            // Телефон: начинается с + или только цифры
            const phone = arg;
            await registerChannel(phone, chatId);
            registryBind(phone, chatId);
            flushPending(phone, client);
        } else {
            // Binom click ID, опционально fbclid: "clickid-fbclid"
            const dashIdx = arg.indexOf('-');
            const clickid = dashIdx === -1 ? arg : arg.slice(0, dashIdx);
            const fbclid  = dashIdx === -1 ? null : arg.slice(dashIdx + 1);
            setBinomClickId(chatId, clickid);
            if (fbclid) setFbclid(chatId, fbclid);
        }
    }

    await showLanguageMenu(client, chatId);
}

async function showLanguageMenu(client, chatId) {
    // Set FSM state so the router knows to expect a language choice
    setState(chatId, States.LANG_CHOOSING);

    const lang = getLang(chatId);
    const text =
        t(lang, 'welcome') +
        '\n\n1️⃣ 🇬🇧 English\n2️⃣ 🇷🇺 Русский\n3️⃣ 🇹🇭 ภาษาไทย';
    await client.sendMessage(chatId, text);
}

async function setLanguage(client, chatId, lang) {
    // Clear LANG_CHOOSING state before proceeding
    clearState(chatId);
    setLang(chatId, lang);

    await track(chatId, 'language_selected', lang, { selected_lang: lang });
    await client.sendMessage(chatId, t(lang, 'lang_set'));
    await client.sendMessage(chatId, t(lang, 'loyalty_hint'));
    await showMainMenu(client, chatId, lang);

    // Post-language reminders (mirrors Telegram bot exactly)
    startReminder(client, chatId, lang, 'loyalty5m',  300,   'loyalty5m_reminder');
    startReminder(client, chatId, lang, 'loyalty2h',  7200,  'loyalty_reminder');
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
