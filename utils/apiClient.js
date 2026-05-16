/**
 * utils/apiClient.js — BotsAPI client.
 * Mirrors utils/api_client.py exactly.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const config = require('../config');

const log = (...args) => console.log('[BotsAPI]', ...args);

function _post(urlStr, body, headers) {
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
                ...headers,
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

function _headers() {
    return { 'X-API-Key': config.BOTS_API_KEY };
}

async function _ensureUser(phone, name = '') {
    if (!config.BOTS_API_URL || !config.BOTS_API_KEY) return false;
    try {
        const res = await _post(
            `${config.BOTS_API_URL.replace(/\/$/, '')}/users/`,
            { phone, name },
            _headers()
        );
        return [201, 409].includes(res.status);
    } catch (e) {
        log('warn', 'BotsAPI unreachable:', e.message);
        return false;
    }
}

async function registerChannel(phone, chatId, name = '') {
    if (!config.BOTS_API_URL || !config.BOTS_API_KEY) {
        log('warn', 'BOTS_API_URL or BOTS_API_KEY not set — skipping');
        return false;
    }
    await _ensureUser(phone, name);
    try {
        const res = await _post(
            `${config.BOTS_API_URL.replace(/\/$/, '')}/channels/bind`,
            { phone, channel_type: 'whatsapp', external_id: String(chatId) },
            _headers()
        );
        if ([200, 201].includes(res.status)) {
            log(`Bound WhatsApp chatId=${chatId} to phone=${phone}`);
            return true;
        }
        log('warn', `Bind failed ${res.status}:`, res.body);
        return false;
    } catch (e) {
        log('warn', 'BotsAPI unreachable:', e.message);
        return false;
    }
}

module.exports = { registerChannel };
