/**
 * handlers/index.js — Central message dispatcher.
 *
 * WhatsApp has no callback_query mechanism. Menus are presented as numbered
 * lists; users reply with a digit. FSM states handle multi-step flows.
 */

const { getState, getLang, clearState, States } = require('../utils/state');
const { t } = require('../locales/texts');

const startHandler = require('./start');
const loyaltyHandler = require('./loyalty');
const storesHandler = require('./stores');
const managerHandler = require('./manager');
const helpHandler = require('./help');
const aboutHandler = require('./about');
const socialsHandler = require('./socials');

function setupHandlers(client) {

    // ONLY incoming messages
    client.on('message', async (msg) => {
        try {
            const chat = await msg.getChat();

            // Ignore groups
            if (chat.isGroup) return;

            const cleanChatId = msg.key?.remoteJid || msg.from;
            const cleancleanChatId = cleanChatId.replace(':11@lid', '@lid');
            const state = getState(cleancleanChatId);
            const lang = getLang(cleancleanChatId);
            const text = (msg.body || msg.message?.conversation || '').trim();

            console.log('[Incoming]', {
                from: msg.from,
                to: msg.to,
                fromMe: msg.fromMe,
                body: msg.body
            });


            // ── /start or "start" ─────────────────────────────────────
            if (/^\/start/i.test(text) || text.toLowerCase() === 'start') {
                await startHandler.handleStart(client, msg, cleancleanChatId);
                return;
            }

            // ── /menu or "menu" ──────────────────────────────────────
            if (/^\/menu/i.test(text) || text.toLowerCase() === 'menu') {
                clearState(cleancleanChatId);
                await startHandler.showMainMenu(client, cleancleanChatId, lang);
                return;
            }

            // ── No active state ──────────────────────────────────────
            if (!state) {

                // Language selection
                if (text === '1' || /english/i.test(text)) {
                    await startHandler.setLanguage(client, cleancleanChatId, 'en');
                    return;
                }

                if (text === '2' || /русский|russian/i.test(text)) {
                    await startHandler.setLanguage(client, cleancleanChatId, 'ru');
                    return;
                }

                if (text === '3' || /ไทย|thai/i.test(text)) {
                    await startHandler.setLanguage(client, cleancleanChatId, 'th');
                    return;
                }

                // Main menu
                switch (text) {

                    case '1':
                        await storesHandler.startStores(client, cleancleanChatId, lang);
                        return;

                    case '2':
                        console.log('[MENU] Loyalty selected');
                        await loyaltyHandler.startLoyalty(client, msg, cleancleanChatId, lang);
                        return;

                    case '3':
                        await helpHandler.startHelp(client, cleancleanChatId, lang);
                        return;

                    case '4':
                        await managerHandler.startManager(client, cleancleanChatId, lang);
                        return;

                    case '5':
                        await aboutHandler.handleAbout(client, cleancleanChatId, lang);
                        return;

                    case '6':
                        await socialsHandler.handleSocials(client, cleancleanChatId, lang);
                        return;

                    case '7':
                        await startHandler.showLanguageMenu(client, cleancleanChatId);
                        return;
                }

                // Default menu
                await startHandler.showMainMenu(client, cleancleanChatId, lang);
                return;
            }

            // ── Loyalty FSM ──────────────────────────────────────────

            if (state === States.LOYALTY_PHONE) {
                await loyaltyHandler.processPhone(client, msg, cleancleanChatId, lang);
                return;
            }

            if (state === States.LOYALTY_OTP) {
                await loyaltyHandler.processOtp(client, msg, cleancleanChatId, lang);
                return;
            }

            if (state === States.LOYALTY_NAME) {
                await loyaltyHandler.processName(client, msg, cleancleanChatId, lang);
                return;
            }

            if (state === States.LOYALTY_COUNTRY) {
                await loyaltyHandler.processCountry(client, msg, cleancleanChatId, lang);
                return;
            }

            if (state === States.LOYALTY_TOURIST) {
                await loyaltyHandler.processTourist(client, msg, cleancleanChatId, lang);
                return;
            }

            if (state === States.LOYALTY_THAI_CITIZEN) {
                await loyaltyHandler.processThaiCitizen(client, msg, cleancleanChatId, lang);
                return;
            }

            // ── Store FSM ────────────────────────────────────────────

            if (state === States.STORE_WAITING_GEO) {

                if (msg.type === 'location' || msg.location) {
                    await storesHandler.handleLocation(client, msg, cleancleanChatId, lang);
                } else {
                    await storesHandler.handleRegionText(client, msg, cleancleanChatId, lang);
                }

                return;
            }

            if (state === States.STORE_CHOOSING_REGION) {
                await storesHandler.handleRegionText(client, msg, cleancleanChatId, lang);
                return;
            }

            // ── Manager FSM ──────────────────────────────────────────

            if (state === States.MANAGER_CHATTING) {

                const lower = text.toLowerCase();

                const transferWords = [
                    'human',
                    'manager',
                    'agent',
                    'человека',
                    'менеджера',
                    'живой',
                    'คน'
                ];

                if (transferWords.some((w) => lower.includes(w))) {
                    await managerHandler.transferToManager(client, msg, cleancleanChatId, lang);
                } else {
                    await managerHandler.handleUserMessage(client, msg, cleancleanChatId, lang);
                }

                return;
            }

            // ── Help FSM ─────────────────────────────────────────────

            if (state === States.HELP_CHATTING) {

                if (text === '0' || /clear|очистить|ล้าง/i.test(text)) {
                    await helpHandler.clearHistory(client, cleancleanChatId, lang);
                    return;
                }

                if (text === '9' || /menu|меню|เมนู/i.test(text)) {
                    clearState(cleancleanChatId);
                    await startHandler.showMainMenu(client, cleancleanChatId, lang);
                    return;
                }

                await helpHandler.handleMessage(client, msg, cleancleanChatId, lang);
                return;
            }

        } catch (err) {

            console.error('[Handler] Error:', err);

            try {
                const fallbackLang = getLang(msg.from);
                await client.sendMessage(
                    msg.from,
                    t(fallbackLang, 'error_generic')
                );
            } catch {
                // ignore
            }
        }
    });

    console.log('[Handlers] All handlers registered');
}

module.exports = { setupHandlers };