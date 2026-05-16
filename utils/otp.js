/**
 * utils/otp.js — OTP generation and verification.
 * Mirrors utils/otp.py exactly.
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
 * Send OTP via SMS.
 * TODO: Replace with real SMS provider (Twilio, AWS SNS, etc.)
 */
async function sendOtpSms(phone, otp) {
    log(`[SMS] Sending OTP ${otp} to ${phone}`);
    // Example with Twilio:
    // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // await twilio.messages.create({ to: phone, from: process.env.TWILIO_FROM, body: `Your OTP: ${otp}` });
    return true;
}

module.exports = { generateOtp, verifyOtp, sendOtpSms };
