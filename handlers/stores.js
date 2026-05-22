/**
 * handlers/stores.js — Store search flow.
 * Mirrors handlers/stores.py exactly.
 */

const { setState, clearState, States, getLang } = require('../utils/state');
const { t } = require('../locales/texts');
const { track } = require('../utils/analytics');
const { findStoresByLocation, findStoresByRegion } = require('../utils/stores');
const { showMainMenu } = require('./start');

const REGIONS = ['Bangkok', 'Phuket', 'Samui', 'Pattaya'];

async function startStores(client, chatId, lang) {
    setState(chatId, States.STORE_WAITING_GEO);
    await client.sendMessage(chatId, t(lang, 'stores_request_geo'));
}

async function handleLocation(client, msg, chatId, lang) {
    const loc = msg.location || (msg.body && tryParseLocation(msg.body));
    if (!loc) {
        await client.sendMessage(chatId, t(lang, 'stores_request_geo'));
        return;
    }
    const lat = parseFloat(loc.latitude);
    const lon = parseFloat(loc.longitude);
    await track(chatId, 'store_search_geo', lang, { lat, lon });
    const found = findStoresByLocation(lat, lon);
    clearState(chatId);
    await _sendStoreResults(client, chatId, found, lang, true);
}

async function handleRegionText(client, msg, chatId, lang) {
    const text = (msg.body || '').trim();

    // Check if user typed back / menu
    if (/^(menu|меню|เมนู|9)$/i.test(text)) {
        clearState(chatId);
        await showMainMenu(client, chatId, lang);
        return;
    }

    // Match a known region (fuzzy)
    const region = REGIONS.find((r) => text.toLowerCase().includes(r.toLowerCase()));
    if (!region) {
        await client.sendMessage(chatId, t(lang, 'stores_choose_region'));
        return;
    }

    await track(chatId, 'store_search_region', lang, { region });
    const found = findStoresByRegion(region);
    clearState(chatId);
    await _sendStoreResults(client, chatId, found, lang, false);
}

async function _sendStoreResults(client, chatId, stores, lang, withDistance) {
    if (!stores.length) {
        await client.sendMessage(chatId, t(lang, 'stores_not_found'));
        await showMainMenu(client, chatId, lang);
        return;
    }

    for (const store of stores) {
        const hours = store.hours;
        const mapsUrl = store.google_maps_url || `https://www.google.com/maps?q=${store.lat},${store.lon}`;

        let card;
        if (hours) {
            card = `🏪 *${store.name}*\n📍 ${store.address}\n🕐 ${hours}`;
        } else {
            card = `🏪 *${store.name}*\n📍 ${store.address}`;
        }

        if (withDistance && store.distance_km !== undefined) {
            card += `\n📏 ${store.distance_km} km`;
        }

        card += `\n\n🗺 ${t(lang, 'btn_open_maps')}: ${mapsUrl}`;

        await client.sendMessage(chatId, card);
    }

    await showMainMenu(client, chatId, lang);
}

function tryParseLocation(text) {
    // Some WhatsApp clients share "lat,lon" as text
    const match = text.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (match) return { latitude: match[1], longitude: match[2] };
    return null;
}

module.exports = { startStores, handleLocation, handleRegionText };
