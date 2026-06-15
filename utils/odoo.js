/**
 * utils/odoo.js — Odoo REST API client.
 * Mirrors utils/odoo.py exactly.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const config = require('../config');

const log = (level, ...args) => console[level === 'error' ? 'error' : 'log']('[Odoo]', ...args);

const PLATFORM_MAP = new Set(['telegram', 'whatsapp', 'line']);
const LANG_MAP = { en: 'eng', ru: 'ru', th: 'thai' };

function _request(urlStr, method, headers, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const lib = url.protocol === 'https:' ? https : http;
        const bodyStr = body ? JSON.stringify(body) : '';
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
            },
            timeout: 15000,
        };
        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

/**
 * Call POST /api/client/register.
 * Returns parsed JSON body on success, null on error.
 */
async function registerCustomer({ name, phone, lang, tourist, thaiCitizen, country, email, botPlatform = 'whatsapp' }) {
    const ODOO_URL = config.ODOO_URL;
    const ODOO_API_TOKEN = config.ODOO_API_TOKEN;
    const ODOO_HEADER = config.ODOO_HEADER
    if (!ODOO_URL || !ODOO_API_TOKEN) {
        log('warn', 'ODOO_URL or ODOO_API_TOKEN not set — skipping registration');
        return null;
    }

    const apiLang = LANG_MAP[lang] || 'eng';
    const platform = PLATFORM_MAP.has(botPlatform) ? botPlatform : 'whatsapp';

    const payload = {
        name,
        phone,
        bot_platform: platform,
        lang: apiLang,
        tourist,
        thai_citizen: thaiCitizen,
        ...(country && { country }),
        ...(email && { email }),
    };

    try {
        const res = await _request(
            `${ODOO_URL.replace(/\/$/, '')}/api/client/register`,
            'POST',
            { Authorization: `Bearer ${ODOO_API_TOKEN}`, "X-Odoo-Database": `${ODOO_HEADER}`,},
            payload
        );
        if (res.status >= 200 && res.status < 300) return res.body;
        log('error', `HTTP ${res.status}:`, res.body);
        return null;
    } catch (err) {
        log('error', 'Request error:', err.message);
        return null;
    }
}

module.exports = { registerCustomer };
