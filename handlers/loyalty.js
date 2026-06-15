/**
 * handlers/loyalty.js — Loyalty card registration flow for WhatsApp.
 */

const { setState, clearState, getData, updateData, States } = require('../utils/state');
const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { startReminder, cancelReminder } = require('../utils/reminders');
const { generateOtp, verifyOtp, sendOtpSms } = require('../utils/otp');
const { registerCustomer } = require('../utils/odoo');
const { registerChannel } = require('../utils/apiClient');
const { bind: registryBind } = require('../utils/chatRegistry');
const { flushPending } = require('../webhook_api');
const { showMainMenu } = require('./start');

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

// Вспомогательные сеты для ответов Да/Нет
const YES_WORDS = new Set(['yes', 'да', 'ใช่', 'y', '1', '✅', 'yep', 'yeah', 'sure']);
const NO_WORDS = new Set(['no', 'нет', 'ไม่ใช่', 'n', '2', '❌', 'nope', 'nah']);

function isYes(text) { return YES_WORDS.has(text.toLowerCase().trim()); }
function isNo(text) { return NO_WORDS.has(text.toLowerCase().trim()); }

/**
 * Точка входа во флоу лояльности — сразу запускает регистрацию
 */
async function startLoyalty(client, msg, chatId, lang) {
    console.log('[LOYALTY] ENTERED');
    await track(chatId, 'loyalty_started', lang);
    cancelReminder(chatId, 'loyalty5m');

    // TODO: Шаг с номером телефона временно пропущен
    // setState(chatId, States.LOYALTY_PHONE);
    // await client.sendMessage(chatId, t(lang, 'loyalty_start'));
    setState(chatId, States.LOYALTY_NAME);
    await client.sendMessage(chatId, t(lang, 'loyalty_ask_name'));
}

// ── ВРЕМЕННО ОТКЛЮЧЕНО: Шаг 1 — телефон ────────────────────────────────────
//
// async function processPhone(client, msg, chatId, lang) {
//     let phone = (msg.body || '').trim().replace(/[\s-]/g, '');
//     if (!PHONE_REGEX.test(phone)) {
//         await client.sendMessage(chatId, t(lang, 'loyalty_phone_invalid'));
//         return;
//     }
//     if (!phone.startsWith('+')) phone = '+' + phone;
//
//     updateData(chatId, { phone });
//     const otp = generateOtp(phone);
//     await sendOtpSms(phone, otp);
//
//     setState(chatId, States.LOYALTY_OTP);
//     await client.sendMessage(chatId, t(lang, 'loyalty_otp_sent', { phone }));
//     startReminder(client, chatId, lang, 'after_phone_reminder', 300, 'after_phone_reminder');
// }

// ── ВРЕМЕННО ОТКЛЮЧЕНО: Шаг 2 — OTP ────────────────────────────────────────
//
// async function processOtp(client, msg, chatId, lang) {
//     const data = getData(chatId);
//     const phone = data.phone || '';
//     const { success, reason } = verifyOtp(phone, (msg.body || '').trim());
//
//     if (!success) {
//         if (reason === 'too_many') {
//             clearState(chatId);
//             await client.sendMessage(chatId, t(lang, 'loyalty_otp_attempts'));
//         } else {
//             await client.sendMessage(chatId, t(lang, 'loyalty_otp_invalid'));
//         }
//         return;
//     }
//
//     setState(chatId, States.LOYALTY_NAME);
//     await client.sendMessage(chatId, t(lang, 'loyalty_ask_name'));
// }

// ── Шаг 3: имя ─────────────────────────────────────────────────────────────

async function processName(client, msg, chatId, lang) {
    const name = (msg.body || '').trim();
    if (name.length < 2) {
        await client.sendMessage(chatId, t(lang, 'loyalty_name_invalid'));
        return;
    }
    updateData(chatId, { name });
    setState(chatId, States.LOYALTY_COUNTRY);
    await client.sendMessage(chatId, t(lang, 'loyalty_ask_country'));
}

// ── Шаг 4: страна ──────────────────────────────────────────────────────────

async function processCountry(client, msg, chatId, lang) {
    updateData(chatId, { country: (msg.body || '').trim() });
    setState(chatId, States.LOYALTY_TOURIST);
    await client.sendMessage(chatId, t(lang, 'loyalty_ask_tourist'));
}

// ── Шаг 5: турист ──────────────────────────────────────────────────────────

async function processTourist(client, msg, chatId, lang) {
    const text = (msg.body || '').trim();
    if (!isYes(text) && !isNo(text)) {
        await client.sendMessage(chatId, t(lang, 'loyalty_ask_tourist'));
        return;
    }
    const tourist = isYes(text);
    updateData(chatId, { tourist });

    if (tourist) {
        updateData(chatId, { thai_citizen: false });
        await _finalize(client, chatId, lang);
    } else {
        setState(chatId, States.LOYALTY_THAI_CITIZEN);
        await client.sendMessage(chatId, t(lang, 'loyalty_ask_thai_citizen'));
    }
}

// ── Шаг 6: гражданин Таиланда ──────────────────────────────────────────────

async function processThaiCitizen(client, msg, chatId, lang) {
    const text = (msg.body || '').trim();
    if (!isYes(text) && !isNo(text)) {
        await client.sendMessage(chatId, t(lang, 'loyalty_ask_thai_citizen'));
        return;
    }
    updateData(chatId, { thai_citizen: isYes(text) });
    await _finalize(client, chatId, lang);
}

// ── Финализация флоу ────────────────────────────────────────────────────────

async function _finalize(client, chatId, lang) {
    const data = getData(chatId);
    clearState(chatId);

    const { phone = '', name, country, tourist = false, thai_citizen: thaiCitizen = false } = data; // TODO: phone временно пропущен

    await client.sendMessage(chatId, t(lang, 'loading'));

    const result = await registerCustomer({
        name, phone, lang, tourist, thaiCitizen, country, botPlatform: 'whatsapp',
    });

    if (!result) {
        await track(chatId, 'loyalty_error', lang);
        await client.sendMessage(chatId, t(lang, 'loyalty_crm_error'));
        await showMainMenu(client, chatId, lang);
        return;
    }

    await registerChannel(phone, chatId, name);
    registryBind(phone, chatId);
    flushPending(phone, client);

    startReminder(client, chatId, lang, 'review_reminder', 10, 'review_reminder');

    const messages = result?.content?.messages || [];
    let apiMessage = null;
    let barcode = null;
    for (const m of messages) {
        if (m.type === 'text') apiMessage = m.text;
        else if (m.type === 'image') barcode = m.url;
    }

    cancelReminder(chatId, 'loyalty2h');
    cancelReminder(chatId, 'after_phone_reminder');
    cancelReminder(chatId, 'loyalty24h');

    if (apiMessage) {
        await track(chatId, 'loyalty_completed', lang);
        await client.sendMessage(chatId, apiMessage);
    }
    if (barcode) {
        await client.sendMessage(chatId, `🏷 Barcode: ${barcode}`);
    }
    if (!apiMessage && !barcode) {
        await client.sendMessage(chatId, t(lang, 'loyalty_crm_error'));
    }

    // После успешного завершения или ошибки без кастомного сообщения возвращаем в главное меню
    await showMainMenu(client, chatId, lang);
}

module.exports = { 
    startLoyalty, 
    // processPhone,  // ВРЕМЕННО ОТКЛЮЧЕНО
    // processOtp,    // ВРЕМЕННО ОТКЛЮЧЕНО
    processName, 
    processCountry, 
    processTourist, 
    processThaiCitizen 
};