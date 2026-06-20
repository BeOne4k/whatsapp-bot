/**
 * utils/state.js — In-memory FSM state store with persistent lang storage.
 *
 * FSM state (what step the user is on) is intentionally in-memory only —
 * after a restart the user simply types anything and gets the main menu back.
 *
 * Language preference IS persisted to disk so users don't have to re-select
 * their language every time the bot restarts.
 */

const fs   = require('fs');
const path = require('path');

// ── Persistent lang store ─────────────────────────────────────────────────────
const LANG_FILE    = path.join(__dirname, '../data/user_langs.json');
const DEFAULT_LANG = 'en';

let _langs = {}; // chatId → lang

function _loadLangs() {
    try {
        fs.mkdirSync(path.dirname(LANG_FILE), { recursive: true });
        if (fs.existsSync(LANG_FILE)) {
            _langs = JSON.parse(fs.readFileSync(LANG_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('[State] lang load error:', e.message);
        _langs = {};
    }
}

function _saveLangs() {
    try {
        fs.mkdirSync(path.dirname(LANG_FILE), { recursive: true });
        fs.writeFileSync(LANG_FILE, JSON.stringify(_langs, null, 2), 'utf-8');
    } catch (e) {
        console.error('[State] lang save error:', e.message);
    }
}

_loadLangs();

// ── In-memory FSM store ───────────────────────────────────────────────────────
const _store = new Map(); // chatId → { state: string|null, data: object }

// ── Binom click ID / fbclid store ─────────────────────────────────────────────
// Аналог _binom_clickid / _fbclid из Telegram-бота (utils/user_data.py).
// Хранит данные диплинка `/start <clickid>-<fbclid>` до завершения регистрации
// в loyalty (нужны для отправки лида в Meta Ads Manager и постбэка в Binom).
const _binomClickId = new Map(); // chatId → clickid
const _fbclid = new Map();       // chatId → fbclid

function setBinomClickId(chatId, clickid) {
    _binomClickId.set(chatId, clickid);
}

function getBinomClickId(chatId) {
    return _binomClickId.get(chatId) || null;
}

function setFbclid(chatId, fbclid) {
    _fbclid.set(chatId, fbclid);
}

function getFbclid(chatId) {
    return _fbclid.get(chatId) || null;
}

function _get(chatId) {
    if (!_store.has(chatId)) {
        _store.set(chatId, { state: null, data: {} });
    }
    return _store.get(chatId);
}

function getState(chatId) {
    return _get(chatId).state;
}

function setState(chatId, state) {
    _get(chatId).state = state;
}

function clearState(chatId) {
    const s = _get(chatId);
    s.state = null;
    s.data  = {};
}

function getData(chatId) {
    return { ..._get(chatId).data };
}

function updateData(chatId, patch) {
    Object.assign(_get(chatId).data, patch);
}

function getLang(chatId) {
    return _langs[chatId] || DEFAULT_LANG;
}

function setLang(chatId, lang) {
    _langs[chatId] = lang;
    _saveLangs();
}

/**
 * Returns true if this chatId has ever selected a language
 * (i.e. the user has been through /start before).
 */
function hasLang(chatId) {
    return !!_langs[chatId];
}

// FSM state constants (mirrors states.py)
const States = {
    // Language
    LANG_CHOOSING: 'lang:choosing',

    // Loyalty
    LOYALTY_PHONE:        'loyalty:phone',
    LOYALTY_OTP:          'loyalty:otp',
    LOYALTY_NAME:         'loyalty:name',
    LOYALTY_COUNTRY:      'loyalty:country',
    LOYALTY_TOURIST:      'loyalty:tourist',
    LOYALTY_THAI_CITIZEN: 'loyalty:thai_citizen',

    // Store
    STORE_WAITING_GEO:    'store:waiting_geo',
    STORE_CHOOSING_REGION: 'store:choosing_region',

    // Manager
    MANAGER_CHATTING: 'manager:chatting',

    // Help
    HELP_CHATTING: 'help:chatting',
};

module.exports = {
    getState, setState, clearState,
    getData, updateData,
    getLang, setLang, hasLang,
    setBinomClickId, getBinomClickId,
    setFbclid, getFbclid,
    States,
};
