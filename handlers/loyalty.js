/**
 * handlers/loyalty.js — Loyalty card registration flow for WhatsApp.
 */

const { setState, clearState, getData, updateData, States, getBinomClickId, getFbclid } = require('../utils/state');
const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { startReminder, cancelReminder } = require('../utils/reminders');
const { generateOtp, verifyOtp, sendOtpSms } = require('../utils/otp');
const { registerCustomer } = require('../utils/odoo');
const { registerChannel } = require('../utils/apiClient');
const { bind: registryBind, getPhoneByChatId } = require('../utils/chatRegistry');
const { flushPending } = require('../webhook_api');
const { showMainMenu } = require('./start');

const crypto = require('crypto');
const https  = require('https');
const http   = require('http');
const { URL } = require('url');
const config = require('../config');

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

// ── Meta Ads Manager (CAPI) + Binom postback ─────────────────────────────────
const META_ADS_URL = `https://graph.facebook.com/v19.0/${config.META_PIXEL_ID}/events`;
const BINOM_POSTBACK_BASE = 'https://wdn-family.com/c6ixl2k.php';

// Вспомогательные сеты для ответов Да/Нет
const YES_WORDS = new Set(['yes', 'да', 'ใช่', 'y', '1', '✅', 'yep', 'yeah', 'sure']);
const NO_WORDS = new Set(['no', 'нет', 'ไม่ใช่', 'n', '2', '❌', 'nope', 'nah']);

function isYes(text) { return YES_WORDS.has(text.toLowerCase().trim()); }
function isNo(text) { return NO_WORDS.has(text.toLowerCase().trim()); }

/**
 * Точка входа во флоу лояльности.
 * Если пользователь уже зарегистрирован — показывает его карту.
 * Если нет — запускает флоу регистрации.
 */
async function startLoyalty(client, msg, chatId, lang) {
    console.log('[LOYALTY] ENTERED');
    await track(chatId, 'loyalty_started', lang);
    cancelReminder(chatId, 'loyalty5m');

    // ─── 1. Проверяем, привязан ли уже телефон к этому chatId ───────────────
    const userPhone = getPhoneByChatId(chatId);

    if (userPhone) {
        // Пользователь уже регистрировался — получаем его карту из CRM
        const result = await registerCustomer({
            name: 'existing_user',
            phone: userPhone,
            lang,
            tourist: false,
            thaiCitizen: false,
            country: 'unknown',
            botPlatform: 'whatsapp',
        });

        let apiMessage = null;
        let barcode = null;

        if (result && result.content && Array.isArray(result.content.messages)) {
            for (const m of result.content.messages) {
                if (m.type === 'text') apiMessage = m.text;
                else if (m.type === 'image') barcode = m.url;
            }
        }

        // Отправляем текст
        const textToSend = apiMessage || t(lang, 'loyalty_already_have_card_text');
        await client.sendMessage(chatId, textToSend);

        // Отправляем фото карты (штрих-код)
        if (barcode) {
            const { MessageMedia } = require('whatsapp-web.js');
            try {
                const media = await MessageMedia.fromUrl(barcode, { unsafeMime: true });
                await client.sendMessage(chatId, media);
            } catch (e) {
                console.error('[LOYALTY] barcode send error:', e.message);
                await client.sendMessage(chatId, `🏷 Barcode: ${barcode}`);
            }
        }

        return; // Не запускаем флоу регистрации
    }

    // ─── 2. Нового пользователя — запускаем регистрацию ─────────────────────
    setState(chatId, States.LOYALTY_PHONE);
    await client.sendMessage(chatId, t(lang, 'loyalty_start'));
}

// ── Шаг 1: телефон ─────────────────────────────────────────────────────────

async function processPhone(client, msg, chatId, lang) {
    let phone = (msg.body || '').trim().replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(phone)) {
        await client.sendMessage(chatId, t(lang, 'loyalty_phone_invalid'));
        return;
    }
    if (!phone.startsWith('+')) phone = '+' + phone;

    updateData(chatId, { phone });

    // OTP временно отключён — сразу переходим к вводу имени
    setState(chatId, States.LOYALTY_NAME);
    await client.sendMessage(chatId, t(lang, 'loyalty_ask_name'));
}

// ── Шаг 2: OTP — ВРЕМЕННО ОТКЛЮЧЁН ─────────────────────────────────────────

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

    // ── Lead-события: Meta Ads Manager (CAPI) + Binom postback ──────────────
    const fbclid = getFbclid(chatId);
    const clickid = getBinomClickId(chatId);
    await sendMetaAdsInfo(phone, chatId, fbclid, { eventId: clickid, name, country });
    await fireBinomPostback(chatId);

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

    await showMainMenu(client, chatId, lang);
}

/**
 * Отправить постбэк в Binom об одобренной конверсии.
 */
async function fireBinomPostback(chatId) {
    const clickid = getBinomClickId(chatId);
    if (!clickid) return;

    const url = new URL(BINOM_POSTBACK_BASE);
    url.searchParams.set('cnv_id', clickid);
    url.searchParams.set('cnv_status', 'approved');

    try {
        await _httpGet(url.toString());
        console.log(`[binom] postback sent clickid=${clickid}`);
    } catch (e) {
        console.error('[binom] postback error:', e.message);
    }
}

/**
 * SHA-256 хэш с нормализацией (lowercase, trim), как того требует Meta.
 */
function _hash(value) {
    return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

/**
 * Meta требует телефон без '+', пробелов и дефисов перед хэшированием —
 * только цифры вместе с кодом страны.
 */
function _normalizePhoneForHash(phone) {
    return String(phone).replace(/\D/g, '');
}

/**
 * Send Lead event to Meta Ads Manager (CAPI).
 *
 * Чем больше валидных параметров user_data передано и чем точнее они
 * нормализованы перед хэшированием — тем выше Event Match Quality (EMQ)
 * в Events Manager, и тем точнее Meta сможет находить похожую аудиторию
 * (lookalike) под цель кампании "Лиды".
 */
async function sendMetaAdsInfo(phone, chatId = '', fbclid = null, extra = {}) {
    const { eventId = null, name = null, country = null } = extra;

    const userData = {
        ph: [_hash(_normalizePhoneForHash(phone))],
        external_id: [_hash(String(chatId))],
    };

    // fbc — обязателен для связки клика по рекламе с конверсией.
    // Формат: fb.<subdomain_index>.<creation_time>.<fbclid>
    if (fbclid) {
        userData.fbc = `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
    }

    // Имя/фамилия — весомые сигналы для матчинга с профилем в Meta.
    if (name) {
        const parts = String(name).trim().split(/\s+/);
        if (parts[0]) userData.fn = [_hash(parts[0])];
        if (parts.length > 1) userData.ln = [_hash(parts.slice(1).join(' '))];
    }

    // Страна — учитывается только если это уже ISO-код (th, ru, ...).
    // Свободный текст (Thailand/Таиланд) даст слабый матчинг по country —
    // лучше сначала привести к ISO 3166-1 alpha-2.
    if (country && /^[A-Za-z]{2}$/.test(String(country).trim())) {
        userData.country = [_hash(country)];
    }

    const payload = {
        data: [
            {
                event_name: 'Lead',
                event_time: Math.floor(Date.now() / 1000),
                // уникальный event_id на конверсию — на случай, если позже
                // добавите Pixel на сайт и понадобится дедупликация
                event_id: eventId || `lead_${chatId}_${Math.floor(Date.now() / 1000)}`,
                // "chat" точнее описывает канал (WhatsApp-бот), чем "system_generated"
                action_source: 'chat',
                user_data: userData,
            },
        ],
    };

    // Позволяет проверять события в Events Manager -> Test Events до запуска в прод
    if (config.META_TEST_EVENT_CODE) {
        payload.test_event_code = config.META_TEST_EVENT_CODE;
    }

    const url = new URL(META_ADS_URL);
    url.searchParams.set('access_token', config.META_ACCESS_TOKEN);

    try {
        const res = await _httpPost(url.toString(), payload);
        const parsed = JSON.parse(res.body);
        if (parsed.error) {
            console.error('Meta CAPI error:', parsed.error);
        } else {
            console.log(`Meta CAPI ok: events_received=${parsed.events_received} fbtrace_id=${parsed.fbtrace_id}`);
        }
    } catch (e) {
        console.error('Failed to send Meta Ads event:', e.message);
    }
}

function _httpGet(urlStr) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const lib = url.protocol === 'https:' ? https : http;
        const req = lib.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

function _httpPost(urlStr, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const lib = url.protocol === 'https:' ? https : http;
        const bodyStr = JSON.stringify(body);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
            },
            timeout: 10000,
        };
        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(bodyStr);
        req.end();
    });
}

module.exports = { 
    startLoyalty, 
    processPhone,
    // processOtp,  // OTP временно отключён
    processName, 
    processCountry, 
    processTourist, 
    processThaiCitizen,
    sendMetaAdsInfo, // экспортирован для ручного тестирования (см. test_meta_lead_whatsapp.js)
};