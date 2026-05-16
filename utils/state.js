/**
 * utils/state.js — In-memory FSM state store (replaces aiogram FSM + MemoryStorage).
 *
 * State structure per chatId:
 *   { state: <string|null>, data: <object>, lang: <string> }
 */

const store = new Map(); // chatId -> { state, data, lang }

const DEFAULT_LANG = 'en';

function _get(chatId) {
    if (!store.has(chatId)) {
        store.set(chatId, { state: null, data: {}, lang: DEFAULT_LANG });
    }
    return store.get(chatId);
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
    s.data = {};
}

function getData(chatId) {
    return { ..._get(chatId).data };
}

function updateData(chatId, patch) {
    Object.assign(_get(chatId).data, patch);
}

function getLang(chatId) {
    return _get(chatId).lang || DEFAULT_LANG;
}

function setLang(chatId, lang) {
    _get(chatId).lang = lang;
}

// FSM state constants (mirrors states.py)
const States = {
    // Language
    LANG_CHOOSING: 'lang:choosing',

    // Loyalty
    LOYALTY_PHONE: 'loyalty:phone',
    LOYALTY_OTP: 'loyalty:otp',
    LOYALTY_NAME: 'loyalty:name',
    LOYALTY_COUNTRY: 'loyalty:country',
    LOYALTY_TOURIST: 'loyalty:tourist',
    LOYALTY_THAI_CITIZEN: 'loyalty:thai_citizen',

    // Store
    STORE_WAITING_GEO: 'store:waiting_geo',
    STORE_CHOOSING_REGION: 'store:choosing_region',

    // Manager
    MANAGER_CHATTING: 'manager:chatting',

    // Help
    HELP_CHATTING: 'help:chatting',
};

module.exports = { getState, setState, clearState, getData, updateData, getLang, setLang, States };
