/**
 * handlers/loyalty.js — Loyalty card registration flow.
 * Mirrors handlers/loyalty.py exactly.
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

// Yes/No word sets per language
const YES_WORDS = new Set(['yes', 'да', 'ใช่', 'y', '1', '✅', 'yep', 'yeah', 'sure']);
const NO_WORDS = new Set(['no', 'нет', 'ไม่ใช่', 'n', '2', '❌', 'nope', 'nah']);

function isYes(text) { return YES_WORDS.has(text.toLowerCase().trim()); }
function isNo(text) { return NO_WORDS.has(text.toLowerCase().trim()); }

async function startLoyalty(client, msg, chatId, lang) {
    console.log('[LOYALTY] ENTERED');
    await client.sendMessage(chatId, 'DEBUG: loyalty started');
    await track(chatId, 'loyalty_started', lang);
    setState(chatId, States.LOYALTY_PHONE);
    cancelReminder(chatId, 'loyalty5m');
    await client.sendMessage(chatId, t(lang, 'loyalty_start'));
}

async function processPhone(client, msg, chatId, lang) {
    let phone = (msg.body || '').trim().replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(phone)) {
        await client.sendMessage(chatId, t(lang, 'loyalty_phone_invalid'));
        return;
    }
    if (!phone.startsWith('+')) phone = '+' + phone;

    updateData(chatId, { phone });
    const otp = generateOtp(phone);
    await sendOtpSms(phone, otp);

    setState(chatId, States.LOYALTY_OTP);
    await client.sendMessage(chatId, t(lang, 'loyalty_otp_sent', { phone }));
    startReminder(client, chatId, lang, 'after_phone_reminder', 300, 'after_phone_reminder');
}

async function processOtp(client, msg, chatId, lang) {
    const data = getData(chatId);
    const phone = data.phone || '';
    const { success, reason } = verifyOtp(phone, (msg.body || '').trim());

    if (!success) {
        if (reason === 'too_many') {
            clearState(chatId);
            await client.sendMessage(chatId, t(lang, 'loyalty_otp_attempts'));
        } else {
            await client.sendMessage(chatId, t(lang, 'loyalty_otp_invalid'));
        }
        return;
    }

    setState(chatId, States.LOYALTY_NAME);
    await client.sendMessage(chatId, t(lang, 'loyalty_ask_name'));
}

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

async function processCountry(client, msg, chatId, lang) {
    updateData(chatId, { country: (msg.body || '').trim() });
    setState(chatId, States.LOYALTY_TOURIST);
    await client.sendMessage(chatId, t(lang, 'loyalty_ask_tourist'));
}

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

async function processThaiCitizen(client, msg, chatId, lang) {
    const text = (msg.body || '').trim();
    if (!isYes(text) && !isNo(text)) {
        await client.sendMessage(chatId, t(lang, 'loyalty_ask_thai_citizen'));
        return;
    }
    updateData(chatId, { thai_citizen: isYes(text) });
    await _finalize(client, chatId, lang);
}

async function _finalize(client, chatId, lang) {
    const data = getData(chatId);
    clearState(chatId);

    const { phone, name, country, tourist = false, thai_citizen: thaiCitizen = false } = data;

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

    // Review reminder after 10 seconds (configurable)
    startReminder(client, chatId, lang, 'review_reminder', 10, 'review_reminder');

    // Parse API response
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
        // Send barcode image URL as a message (WhatsApp will preview it)
        await client.sendMessage(chatId, `🏷 Barcode: ${barcode}`);
    }
    if (!apiMessage && !barcode) {
        await client.sendMessage(chatId, t(lang, 'loyalty_crm_error'));
    }

    await showMainMenu(client, chatId, lang);
}

module.exports = { startLoyalty, processPhone, processOtp, processName, processCountry, processTourist, processThaiCitizen };
