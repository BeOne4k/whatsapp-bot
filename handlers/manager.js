/**
 * handlers/manager.js — Manager chat with AI escalation.
 * Mirrors handlers/manager.py exactly.
 */

const { setState, clearState, States } = require('../utils/state');
const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { askAi } = require('../utils/ai');
const { showMainMenu } = require('./start');
const config = require('../config');

// UTC+7 offset (Bangkok). Adjust for your timezone.
const TZ_OFFSET_HOURS = 7;

function isManagerOnline() {
    const now = new Date();
    const hour = (now.getUTCHours() + TZ_OFFSET_HOURS) % 24;
    return hour >= config.MANAGER_WORK_START && hour < config.MANAGER_WORK_END;
}

async function startManager(client, chatId, lang) {
    await track(chatId, 'manager_started', lang);
    setState(chatId, States.MANAGER_CHATTING);

    if (!isManagerOnline()) {
        await client.sendMessage(chatId, t(lang, 'manager_offline'));
        await showMainMenu(client, chatId, lang);
    } else {
        const msg =
            t(lang, 'manager_hello') +
            '\n\n' +
            `_(Type "${t(lang, 'btn_transfer_manager').replace(/[*_]/g, '')}" to reach a human)_`;
        await client.sendMessage(chatId, msg);
    }
}

async function transferToManager(client, msg, chatId, lang) {
    await track(chatId, 'manager_transferred', lang);
    await client.sendMessage(chatId, t(lang, 'manager_transfer'));
    await _notifyManager(client, msg, lang);
    await client.sendMessage(chatId, t(lang, 'manager_transferred'));
    clearState(chatId);
    await showMainMenu(client, chatId, lang);
}

async function handleUserMessage(client, msg, chatId, lang) {
    const userText = msg.body || '';

    if (!isManagerOnline()) {
        await _notifyManager(client, msg, lang);
        await track(chatId, 'manager_message_left', lang);
        await client.sendMessage(chatId, t(lang, 'manager_left_message'));
        clearState(chatId);
        await showMainMenu(client, chatId, lang);
        return;
    }

    const aiResponse = await askAi(userText, lang);

    if (aiResponse.includes('[TRANSFER_TO_HUMAN]')) {
        await client.sendMessage(chatId, t(lang, 'manager_transfer'));
        await _notifyManager(client, msg, lang);
        await track(chatId, 'manager_transferred', lang, { trigger: 'ai_escalation' });
        await client.sendMessage(chatId, t(lang, 'manager_transferred'));
        clearState(chatId);
        await showMainMenu(client, chatId, lang);
    } else {
        const hint = `\n\n_(Type "${t(lang, 'btn_transfer_manager').replace(/[*_]/g, '')}" to reach a human)_`;
        await client.sendMessage(chatId, aiResponse + hint);
    }
}

async function _notifyManager(client, msg, lang) {
    if (!config.MANAGER_PHONE) {
        console.warn('[Manager] MANAGER_PHONE not set, cannot notify manager');
        return;
    }
    try {
        const managerChatId = config.MANAGER_PHONE.replace(/\D/g, '') + '@c.us';
        const userPhone = msg.from.replace('@c.us', '');
        const text =
            `🔔 *New message from user*\n` +
            `User: +${userPhone} (lang: ${lang})\n\n` +
            `Message:\n${msg.body}`;
        await client.sendMessage(managerChatId, text);
    } catch (e) {
        console.error('[Manager] Failed to notify manager:', e.message);
    }
}

module.exports = { startManager, transferToManager, handleUserMessage };
