/**
 * handlers/index.js — Central message dispatcher.
 *
 * WhatsApp has no callback_query mechanism. Menus are presented as numbered
 * lists; users reply with a digit. FSM states handle multi-step flows.
 */

const { getState, getLang, setState, clearState, States } = require('../utils/state');
const { t } = require('../locales/texts');
const startHandler = require('./start');
const loyaltyHandler = require('./loyalty');
const storesHandler = require('./stores');
const managerHandler = require('./manager');
const helpHandler = require('./help');
const aboutHandler = require('./about');
const socialsHandler = require('./socials');

const REGIONS = ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Moscow', 'Saint Petersburg'];

function setupHandlers(client) {
    client.on('message', async (msg) => {
        // Only handle private text messages and location shares
        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const chatId = msg.from; // e.g. "66812345678@c.us"
        const text = (msg.body || '').trim();
        const state = getState(chatId);
        const lang = getLang(chatId);

        try {
            // ── /start or "start" ───────────────────────────────────────────
            if (/^\/start/i.test(text) || text.toLowerCase() === 'start') {
                await startHandler.handleStart(client, msg, chatId);
                return;
            }

            // ── /menu or "menu" ─────────────────────────────────────────────
            if (/^\/menu/i.test(text) || text.toLowerCase() === 'menu') {
                clearState(chatId);
                await startHandler.showMainMenu(client, chatId, lang);
                return;
            }

            // ── Language selection (only when no active state) ───────────────
            if (!state) {
                if (text === '1' || /english/i.test(text)) { await startHandler.setLanguage(client, chatId, 'en'); return; }
                if (text === '2' || /русский|russian/i.test(text)) { await startHandler.setLanguage(client, chatId, 'ru'); return; }
                if (text === '3' || /ไทย|thai/i.test(text)) { await startHandler.setLanguage(client, chatId, 'th'); return; }

                // Main menu choices (after language is set)
                const menuMap = { '1': 'stores', '2': 'loyalty', '3': 'help', '4': 'manager', '5': 'about', '6': 'socials', '7': 'lang' };
                if (menuMap[text]) {
                    switch (menuMap[text]) {
                        case 'stores': await storesHandler.startStores(client, chatId, lang); break;
                        case 'loyalty': await loyaltyHandler.startLoyalty(client, msg, chatId, lang); break;
                        case 'help': await helpHandler.startHelp(client, chatId, lang); break;
                        case 'manager': await managerHandler.startManager(client, chatId, lang); break;
                        case 'about': await aboutHandler.handleAbout(client, chatId, lang); break;
                        case 'socials': await socialsHandler.handleSocials(client, chatId, lang); break;
                        case 'lang': await startHandler.showLanguageMenu(client, chatId); break;
                    }
                    return;
                }

                // Default: show main menu
                await startHandler.showMainMenu(client, chatId, lang);
                return;
            }

            // ── Active FSM states ────────────────────────────────────────────

            // Loyalty flow
            if (state === States.LOYALTY_PHONE) { await loyaltyHandler.processPhone(client, msg, chatId, lang); return; }
            if (state === States.LOYALTY_OTP) { await loyaltyHandler.processOtp(client, msg, chatId, lang); return; }
            if (state === States.LOYALTY_NAME) { await loyaltyHandler.processName(client, msg, chatId, lang); return; }
            if (state === States.LOYALTY_COUNTRY) { await loyaltyHandler.processCountry(client, msg, chatId, lang); return; }
            if (state === States.LOYALTY_TOURIST) { await loyaltyHandler.processTourist(client, msg, chatId, lang); return; }
            if (state === States.LOYALTY_THAI_CITIZEN) { await loyaltyHandler.processThaiCitizen(client, msg, chatId, lang); return; }

            // Store flow
            if (state === States.STORE_WAITING_GEO) {
                if (msg.type === 'location' || msg.location) {
                    await storesHandler.handleLocation(client, msg, chatId, lang);
                } else {
                    // Try region name
                    await storesHandler.handleRegionText(client, msg, chatId, lang);
                }
                return;
            }
            if (state === States.STORE_CHOOSING_REGION) {
                await storesHandler.handleRegionText(client, msg, chatId, lang);
                return;
            }

            // Manager chat
            if (state === States.MANAGER_CHATTING) {
                const lower = text.toLowerCase();
                const transferWords = ['human', 'manager', 'agent', 'человека', 'менеджера', 'живой', 'คน'];
                if (transferWords.some((w) => lower.includes(w))) {
                    await managerHandler.transferToManager(client, msg, chatId, lang);
                } else {
                    await managerHandler.handleUserMessage(client, msg, chatId, lang);
                }
                return;
            }

            // Help chat
            if (state === States.HELP_CHATTING) {
                if (text === '0' || /clear|очистить|ล้าง/i.test(text)) {
                    await helpHandler.clearHistory(client, chatId, lang);
                } else if (text === '9' || /menu|меню|เมนู/i.test(text)) {
                    clearState(chatId);
                    await startHandler.showMainMenu(client, chatId, lang);
                } else {
                    await helpHandler.handleMessage(client, msg, chatId, lang);
                }
                return;
            }

        } catch (err) {
            console.error('[Handler] Error:', err);
            try {
                await client.sendMessage(chatId, t(getLang(chatId), 'error_generic'));
            } catch { /* ignore */ }
        }
    });

    console.log('[Handlers] All handlers registered');
}

module.exports = { setupHandlers };
