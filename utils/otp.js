/**
 * utils/otp.js — OTP generation and verification.
 * Mirrors utils/otp.py exactly.
 * Twilio credentials are read from config.js (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM).
 */

const log = (...args) => console.log('[OTP]', ...args);

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

// In-memory store: phone -> { otp, ts, attempts }
const otpStore = new Map();

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
 * Send OTP via SMS using Twilio.
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM in .env.
 * If not configured, falls back to a stub (logs to console only).
 */
async function sendOtpSms(phone, otp) {
    const config = require('../config');

    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_FROM) {
        log(`[stub] OTP ${otp} → ${phone} (Twilio not configured, set TWILIO_* in .env)`);
        return true;
    }

    try {
        const twilio = require('twilio')(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
        await twilio.messages.create({
            to: phone,
            from: config.TWILIO_FROM,
            body: `Your verification code: ${otp}`,
        });
        log(`Sent OTP to ${phone} via Twilio`);
        return true;
    } catch (e) {
        log(`Twilio error for ${phone}:`, e.message);
        return false;
    }
}

module.exports = { generateOtp, verifyOtp, sendOtpSms };
