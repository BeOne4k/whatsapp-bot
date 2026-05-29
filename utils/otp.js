/**
 * utils/otp.js — OTP generation and verification.
 * Mirrors utils/otp.py exactly.
 */

const config = require('../config');
const log = (...args) => console.log('[OTP]', ...args);

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

// In-memory store: phone -> { otp, ts, attempts }
const otpStore = new Map();

// Инициализируем клиент Twilio один раз на уровне модуля, если конфиги заданы
let twilioClient = null;
if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
    twilioClient = require('twilio')(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
}

function generateOtp(phone) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(phone, { otp, ts: Date.now(), attempts: 0 });
    log(`Generated for ${phone}: ${otp}`); // Remove in production!
    return otp;
}

/**
 * Returns { success: bool, reason: 'ok'|'wrong'|'expired'|'too_many' }
 */
function verifyOtp(phone, entered) {
    const record = otpStore.get(phone);
    if (!record) return { success: false, reason: 'expired' };

    const { otp, ts, attempts } = record;

    if (Date.now() - ts > OTP_TTL_MS) {
        otpStore.delete(phone);
        return { success: false, reason: 'expired' };
    }

    if (attempts >= MAX_ATTEMPTS) {
        otpStore.delete(phone);
        return { success: false, reason: 'too_many' };
    }

    if (entered.trim() !== otp) {
        const newAttempts = attempts + 1;
        if (newAttempts >= MAX_ATTEMPTS) {
            otpStore.delete(phone);
        } else {
            otpStore.set(phone, { otp, ts, attempts: newAttempts });
        }
        return { success: false, reason: newAttempts >= MAX_ATTEMPTS ? 'too_many' : 'wrong' };
    }

    otpStore.delete(phone);
    return { success: true, reason: 'ok' };
}

/**
 * Send OTP via SMS using Twilio Messaging Service.
 * Mirrors send_otp_sms from otp.py.
 */
async function sendOtpSms(phone, otp) {
    // Проверяем наличие клиента и SID сервиса сообщений
    if (!twilioClient || !config.TWILIO_MESSAGING_SERVICE_SID) {
        log(`[stub] OTP ${otp} → ${phone} (Twilio or Messaging Service not configured)`);
        return true;
    }

    try {
        // Короткий текст сообщения без жестких триггеров для спам-фильтров
        const messageBody = `Code: ${otp}. Expire in ${OTP_TTL_MS / 60 / 1000} min.`;
        
        // Создаем СМС через Messaging Service
        const message = await twilioClient.messages.create({
            to: phone,
            messagingServiceSid: config.TWILIO_MESSAGING_SERVICE_SID,
            body: messageBody,
        });
        
        // Записываем в логи SID сообщения для отслеживания статуса в консоли Twilio
        console.log(`[SMS] OTP request sent to ${phone}. Message SID: ${message.sid}`);
        return true;
    } catch (e) {
        console.error(`[SMS] Failed to send OTP to ${phone}:`, e.message);
        return false;
    }
}

module.exports = { generateOtp, verifyOtp, sendOtpSms };