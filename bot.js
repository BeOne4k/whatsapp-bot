/**
 * bot.js — WhatsApp Bot (WDN) entry point
 * Uses whatsapp-web.js (puppeteer-based) as the WhatsApp client.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const config = require('./config');
const { setupHandlers } = require('./handlers');
const { startWebhookServer } = require('./webhook_api');

// ── Logging ──────────────────────────────────────────────────────────────────
const log = (level, ...args) => {
    const ts = new Date().toISOString();
    console[level === 'error' ? 'error' : 'log'](`[${ts}] [${level.toUpperCase()}]`, ...args);
};

// ── WhatsApp Client ───────────────────────────────────────────────────────────
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './data/.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
        ],
    },
});

// ── QR code for linking ───────────────────────────────────────────────────────
client.on('qr', (qr) => {
    log('info', 'QR code received. Scan it with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    log('info', 'WhatsApp client authenticated');
});

client.on('ready', () => {
    log('info', 'WhatsApp bot is ready!');
    setupHandlers(client);
});

client.on('auth_failure', (msg) => {
    log('error', 'Authentication failure:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    log('warn', 'Client disconnected:', reason);
    process.exit(1);
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
    log('info', 'Starting WhatsApp bot...');

    // Start FastAPI-equivalent webhook server (Express)
    startWebhookServer(client);

    await client.initialize();
}

main().catch((err) => {
    log('error', 'Fatal error:', err);
    process.exit(1);
});
