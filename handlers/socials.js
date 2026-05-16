/**
 * handlers/socials.js — Our socials.
 * Mirrors handlers/socials.py exactly.
 */

const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const config = require('../config');
const { showMainMenu } = require('./start');

async function handleSocials(client, chatId, lang) {
    await track(chatId, 'socials_opened', lang);
    const msg = t(lang, 'socials_text') + `\n\n${t(lang, 'btn_open_socials')}: ${config.SOCIALS_URL}`;
    await client.sendMessage(chatId, msg);
    await showMainMenu(client, chatId, lang);
}

module.exports = { handleSocials };
