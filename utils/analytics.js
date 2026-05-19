/**
 * utils/analytics.js — Event analytics tracker.
 * Logs events locally to data/analytics.jsonl
 * and sends to Meta Conversions API (Ads Manager).
 *
 * Set META_PIXEL_ID and META_ACCESS_TOKEN in .env to enable Meta reporting.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
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

// ── Meta Conversions API ──────────────────────────────────────────────────────

// Map internal event names → Meta standard events
const META_EVENT_MAP = {
    bot_started:        'ViewContent',
    language_selected:  'ViewContent',
    menu_opened:        'ViewContent',
    loyalty_started:    'InitiateCheckout',
    loyalty_completed:  'CompleteRegistration',
    loyalty_error:      null,              // not sent to Meta
    store_search_geo:   'Search',
    store_search_region:'Search',
    manager_started:    'Contact',
    manager_transferred:'Contact',
    manager_message_left:'Contact',
    socials_opened:     'ViewContent',
    about_opened:       'ViewContent',
    help_started:       'ViewContent',
    help_message_sent:  'ViewContent',
};

function _sha256(value) {
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

async function _sendToMeta(userId, eventName, lang, extra = {}) {
    if (!config.META_PIXEL_ID || !config.META_ACCESS_TOKEN) return;

    const metaEvent = META_EVENT_MAP[eventName];
    if (!metaEvent) return; // explicitly excluded

    const payload = JSON.stringify({
        data: [{
            event_name: metaEvent,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'other',           // WhatsApp bot = "other"
            user_data: {
                // Hash the WhatsApp ID (phone number based) as external_id
                external_id: _sha256(String(userId)),
            },
            custom_data: {
                content_name: eventName,
                currency: 'USD',
                lang,
                ...extra,
            },
        }],
    });

    const url = `/v19.0/${config.META_PIXEL_ID}/events?access_token=${config.META_ACCESS_TOKEN}`;

    return new Promise((resolve) => {
        const options = {
            hostname: 'graph.facebook.com',
            path: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
            timeout: 5000,
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.warn('[Analytics] Meta CAPI error:', res.statusCode, data);
                }
                resolve();
            });
        });
        req.on('error', () => resolve());
        req.on('timeout', () => { req.destroy(); resolve(); });
        req.write(payload);
        req.end();
    });
}

// ── Public API ────────────────────────────────────────────────────────────────

async function track(userId, event, lang = 'en', extra = {}) {
    // Always write locally
    _writeEvent({
        ts: new Date().toISOString(),
        user_id: userId,
        event,
        lang,
        ...extra,
    });

    // Send to Meta (fire-and-forget)
    _sendToMeta(userId, event, lang, extra).catch(() => {});

    console.log(`[Analytics] ${event} | user=${userId} |`, extra);
}

module.exports = { track };
