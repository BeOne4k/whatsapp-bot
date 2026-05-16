/**
 * utils/chatRegistry.js — Phone → WhatsApp chatId registry.
 * Mirrors utils/chat_registry.py exactly.
 * Persists to data/chat_registry.json.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../data/chat_registry.json');
const log = (...args) => console.log('[ChatRegistry]', ...args);

let _registry = {};

function _normalize(phone) {
    return phone.trim().replace(/[\s-]/g, '');
}

function _load() {
    try {
        fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
        if (fs.existsSync(REGISTRY_PATH)) {
            _registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
            log(`Loaded ${Object.keys(_registry).length} entries`);
        }
    } catch (e) {
        log('load error:', e.message);
        _registry = {};
    }
}

function _save() {
    try {
        fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify(_registry, null, 2), 'utf-8');
    } catch (e) {
        log('save error:', e.message);
    }
}

function bind(phone, chatId) {
    const key = _normalize(phone);
    _registry[key] = chatId;
    _save();
    log(`Bound phone=${key} → chatId=${chatId}`);
}

function getChatId(phone) {
    return _registry[_normalize(phone)] || null;
}

_load();

module.exports = { bind, getChatId };
