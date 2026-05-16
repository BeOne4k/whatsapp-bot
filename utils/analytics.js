/**
 * utils/analytics.js — Event analytics tracker.
 * Mirrors utils/analytics.py exactly.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const config = require('../config');

const ANALYTICS_LOG = path.join(__dirname, '../data/analytics.jsonl');

function _writeEvent(event) {
    try {
        fs.mkdirSync(path.dirname(ANALYTICS_LOG), { recursive: true });
        fs.appendFileSync(ANALYTICS_LOG, JSON.stringify(event) + '\n', 'utf-8');
    } catch (e) {
        console.error('[Analytics] Write error:', e.message);
    }
}

async function _sendToGa4(clientId, eventName, params) {
    if (!config.GA4_MEASUREMENT_ID || !config.GA4_API_SECRET) return;
    const body = JSON.stringify({
        client_id: clientId,
        events: [{ name: eventName, params }],
    });
    const options = {
        hostname: 'www.google-analytics.com',
        path: `/mp/collect?measurement_id=${config.GA4_MEASUREMENT_ID}&api_secret=${config.GA4_API_SECRET}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000,
    };
    return new Promise((resolve) => {
        const req = https.request(options, (res) => { res.resume(); resolve(); });
        req.on('error', () => resolve());
        req.write(body);
        req.end();
    });
}

async function track(userId, event, lang = 'en', extra = {}) {
    const payload = {
        ts: new Date().toISOString(),
        user_id: userId,
        event,
        lang,
        ...extra,
    };
    _writeEvent(payload);
    await _sendToGa4(String(userId), event, { lang, ...extra }).catch(() => {});
    console.log(`[Analytics] ${event} | user=${userId} |`, extra);
}

module.exports = { track };
