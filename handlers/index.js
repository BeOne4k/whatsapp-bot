/**
 * handlers/index.js — Central message dispatcher.
 */

const { getState, getLang, hasLang, clearState, States } = require('../utils/state');
const { t } = require('../locales/texts');

const startHandler   = require('./start');
const loyaltyHandler = require('./loyalty');
const storesHandler  = require('./stores');
const managerHandler = require('./manager');
const helpHandler    = require('./help');
const aboutHandler   = require('./about');
const socialsHandler = require('./socials');

/**
 * Get a stable chatId for a message.
 * whatsapp-web.js in multi-device mode can give @lid IDs for incoming
 * messages but @c.us for outgoing. We resolve to @c.us via the contact.
 */
async function resolveChatId(msg) {
    try {
        // getContact() always returns the @c.us form
        const contact = await msg.getContact();
        if (contact && contact.id && contact.id._serialized) {
            return contact.id._serialized; // e.g. "66812345678@c.us"
        }
    } catch (e) {
        // fall through
    }
    // Fallback: strip device suffix and keep whatever domain we have
    return (msg.from || '').replace(/:\d+@/, '@');
}

function setupHandlers(client) {

    client.on('message_create', async (msg) => {
        if (msg.fromMe) return;

        try {
            const chat = await msg.getChat();
            if (chat.isGroup) return;

            const chatId = await resolveChatId(msg);
            const state  = getState(chatId);
            const lang   = getLang(chatId);
            const text   = (msg.body || '').trim();

            console.log('[Incoming]', { chatId, state, lang, text });

            // ── /start or "start" ─────────────────────────────────────────────
            if (/^\/start/i.test(text) || text.toLowerCase() === 'start') {
                await startHandler.handleStart(client, msg, chatId);
                return;
            }

            // ── /menu or "menu" ───────────────────────────────────────────────
            if (/^\/menu/i.test(text) || text.toLowerCase() === 'menu') {
                clearState(chatId);
                await startHandler.showMainMenu(client, chatId, lang);
                return;
            }

            // ── Language-selection state ──────────────────────────────────────
            if (state === States.LANG_CHOOSING) {
                if (text === '1' || /english/i.test(text)) {
                    await startHandler.setLanguage(client, chatId, 'en');
                } else if (text === '2' || /русский|russian/i.test(text)) {
                    await startHandler.setLanguage(client, chatId, 'ru');
                } else if (text === '3' || /ไทย|thai/i.test(text)) {
                    await startHandler.setLanguage(client, chatId, 'th');
                } else {
                    await startHandler.showLanguageMenu(client, chatId);
                }
                return;
            }

            // ── Loyalty FSM ───────────────────────────────────────────────────
            if (state === States.LOYALTY_PHONE) {
                await loyaltyHandler.processPhone(client, msg, chatId, lang);
                return;
            }
            if (state === States.LOYALTY_OTP) {
                await loyaltyHandler.processOtp(client, msg, chatId, lang);
                return;
            }
            if (state === States.LOYALTY_NAME) {
                await loyaltyHandler.processName(client, msg, chatId, lang);
                return;
            }
            if (state === States.LOYALTY_COUNTRY) {
                await loyaltyHandler.processCountry(client, msg, chatId, lang);
                return;
            }
            if (state === States.LOYALTY_TOURIST) {
                await loyaltyHandler.processTourist(client, msg, chatId, lang);
                return;
            }
            if (state === States.LOYALTY_THAI_CITIZEN) {
                await loyaltyHandler.processThaiCitizen(client, msg, chatId, lang);
                return;
            }

            // ── Store FSM ─────────────────────────────────────────────────────
            if (state === States.STORE_WAITING_GEO || state === States.STORE_CHOOSING_REGION) {
                if (msg.type === 'location' || msg.location) {
                    await storesHandler.handleLocation(client, msg, chatId, lang);
                } else {
                    await storesHandler.handleRegionText(client, msg, chatId, lang);
                }
                return;
            }

            // ── Manager FSM ───────────────────────────────────────────────────
            if (state === States.MANAGER_CHATTING) {
                const lower        = text.toLowerCase();
                const transferWords = ['human', 'manager', 'agent', 'человека', 'менеджера', 'живой', 'คน'];
                if (transferWords.some((w) => lower.includes(w))) {
                    await managerHandler.transferToManager(client, msg, chatId, lang);
                } else {
                    await managerHandler.handleUserMessage(client, msg, chatId, lang);
                }
                return;
            }

            // ── Help FSM ──────────────────────────────────────────────────────
            if (state === States.HELP_CHATTING) {
                if (text === '0' || /clear|очистить|ล้าง/i.test(text)) {
                    await helpHandler.clearHistory(client, chatId, lang);
                    return;
                }
                if (text === '9' || /menu|меню|เมนู/i.test(text)) {
                    clearState(chatId);
                    await startHandler.showMainMenu(client, chatId, lang);
                    return;
                }
                await helpHandler.handleMessage(client, msg, chatId, lang);
                return;
            }

            // ── No active state → new or returning user ───────────────────────
            if (!hasLang(chatId)) {
                await startHandler.handleStart(client, msg, chatId);
                return;
            }

            // Main menu navigation
            switch (text) {
                case '1': await storesHandler.startStores(client, chatId, lang);         return;
                case '2': await loyaltyHandler.startLoyalty(client, msg, chatId, lang);  return;
                case '3': await helpHandler.startHelp(client, chatId, lang);             return;
                case '4': await managerHandler.startManager(client, chatId, lang);        return;
                case '5': await aboutHandler.handleAbout(client, chatId, lang);          return;
                case '6': await socialsHandler.handleSocials(client, chatId, lang);      return;
                case '7': await startHandler.showLanguageMenu(client, chatId);           return;
            }

            // Fallback
            await startHandler.showMainMenu(client, chatId, lang);

        } catch (err) {
            console.error('[Handler] Error:', err);
            try {
                await client.sendMessage(msg.from, t('en', 'error_generic'));
            } catch { /* ignore */ }
        }
    });

    console.log('[Handlers] All handlers registered');
}

module.exports = { setupHandlers };