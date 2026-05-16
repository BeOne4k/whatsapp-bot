/**
 * handlers/about.js — About us.
 * Mirrors handlers/about.py exactly.
 */

const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { showMainMenu } = require('./start');

async function handleAbout(client, chatId, lang) {
    await track(chatId, 'about_opened', lang);
    await client.sendMessage(chatId, t(lang, 'about_text'));
    await showMainMenu(client, chatId, lang);
}

module.exports = { handleAbout };
