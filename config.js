/**
 * config.js — Configuration with environment variable stubs.
 * Copy .env.example to .env and fill in the real values.
 */

require('dotenv').config();

module.exports = {
    // ── WeedeN REST API ──────────────────────────────────────────
    ODOO_URL: process.env.ODOO_URL || '',               // e.g. https://your-odoo-instance.com
    ODOO_API_TOKEN: process.env.ODOO_API_TOKEN || '',   // Bearer token for /api/client/register

    // ── Manager notifications ────────────────────────────────────
    MANAGER_PHONE: process.env.MANAGER_PHONE || '',     // WhatsApp number with country code, e.g. 66812345678
    MANAGER_WORK_START: parseInt(process.env.MANAGER_WORK_START || '10', 10),
    MANAGER_WORK_END: parseInt(process.env.MANAGER_WORK_END || '18', 10),

    // ── External links ───────────────────────────────────────────
    SOCIALS_URL: process.env.SOCIALS_URL || 'https://example.com/socials',
    RECIPE_URL: process.env.RECIPE_URL || 'https://example.com/recipes',

    // ── Gemini AI (Help Assistant) ───────────────────────────────
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

    // ── Anthropic AI (Manager chat AI) ──────────────────────────
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

    // ── Webhook server ───────────────────────────────────────────
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
    WEBHOOK_PORT: parseInt(process.env.WEBHOOK_PORT || '8080', 10),

    // ── Message delays ───────────────────────────────────────────
    THANK_YOU_DELAY_SECONDS: parseInt(process.env.THANK_YOU_DELAY_SECONDS || '600', 10),
    RETENTION_DELAY_SECONDS: parseInt(process.env.RETENTION_DELAY_SECONDS || '86400', 10),

    // ── Analytics ────────────────────────────────────────────────
    GA4_MEASUREMENT_ID: process.env.GA4_MEASUREMENT_ID || '',
    GA4_API_SECRET: process.env.GA4_API_SECRET || '',

    // ── BotsAPI ──────────────────────────────────────────────────
    BOTS_API_URL: process.env.BOTS_API_URL || 'http://localhost:8000',
    BOTS_API_KEY: process.env.BOTS_API_KEY || '',

    // ── Twilio (SMS OTP) ─────────────────────────────────────────
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
    TWILIO_FROM: process.env.TWILIO_FROM || '',             // e.g. +12345678901
};
