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
// Обратный индекс: chatId → normalized_phone (как в Python-версии)
let _reverse = {};

function _normalize(phone) {
    return phone.trim().replace(/[\s-]/g, '');
}

function _load() {
    try {
        fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
        if (fs.existsSync(REGISTRY_PATH)) {
            _registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
            // Восстанавливаем обратный индекс
            _reverse = {};
            for (const [phone, chatId] of Object.entries(_registry)) {
                _reverse[chatId] = phone;
            }
            log(`Loaded ${Object.keys(_registry).length} entries`);
        }
    } catch (e) {
        log('load error:', e.message);
        _registry = {};
        _reverse = {};
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

    // Если chatId уже был привязан к другому телефону — убираем старую запись
    const oldPhone = _reverse[chatId];
    if (oldPhone && oldPhone !== key) {
        delete _registry[oldPhone];
    }

    _registry[key] = chatId;
    _reverse[chatId] = key;
    _save();
    log(`Bound phone=${key} → chatId=${chatId}`);
}

function getChatId(phone) {
    return _registry[_normalize(phone)] || null;
}

/** Возвращает телефон по chatId (обратный поиск, как get_phone_by_chat_id в Python) */
function getPhoneByChatId(chatId) {
    return _reverse[chatId] || null;
}

_load();

module.exports = { bind, getChatId, getPhoneByChatId };
