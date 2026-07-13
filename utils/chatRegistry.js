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

// Префикс временного ключа для привязки "до регистрации" (пока не известен
// реальный номер телефона) — аналог "tg:<user_id>" в Telegram-боте.
const TEMP_PREFIX = 'wa:';

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

/**
 * Гарантирует, что у chatId есть хоть какая-то запись в реестре.
 *
 * Если реального телефона ещё нет — привязывает временный ключ
 * "wa:<chatId>". Как только становится известен настоящий номер
 * (см. handlers/loyalty.js: processPhone), bind() автоматически
 * заменит временную запись на реальную (через обратный индекс).
 *
 * Если реальный телефон уже привязан — ничего не делает.
 */
function ensureBound(chatId) {
    const existing = getPhoneByChatId(chatId);
    if (existing && !existing.startsWith(TEMP_PREFIX)) return;
    bind(`${TEMP_PREFIX}${chatId}`, chatId);
}

_load();

module.exports = { bind, getChatId, getPhoneByChatId, ensureBound, TEMP_PREFIX };
