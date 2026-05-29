/**
 * utils/stores.js — Store search logic.
 * Mirrors utils/stores.py exactly.
 */

const fs = require('fs');
const path = require('path');

const STORES_FILE = path.join(__dirname, '../data/stores.json');
const SEARCH_RADIUS_KM = 3.0;

function _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _mockStores() {
    return [
        { id: 1, name: 'Central Store Bangkok', address: '123 Sukhumvit Rd, Bangkok', region: 'Bangkok', hours: '09:00 - 22:00', lat: 13.7367, lon: 100.5601, photo_url: null },
        { id: 2, name: 'Phuket Branch', address: '456 Thepkasattri Rd, Phuket', region: 'Phuket', hours: '10:00 - 21:00', lat: 7.8804, lon: 98.3923, photo_url: null },
        { id: 3, name: 'Moscow Flagship', address: 'ул. Тверская, 15, Москва', region: 'Moscow', hours: '10:00 - 22:00', lat: 55.7617, lon: 37.6117, photo_url: null },
        { id: 4, name: 'Chiang Mai Store', address: '78 Nimmanhaemin Rd, Chiang Mai', region: 'Chiang Mai', hours: '09:00 - 21:00', lat: 18.7961, lon: 98.9678, photo_url: null },
        { id: 5, name: 'Pattaya Store', address: '55 Beach Rd, Pattaya', region: 'Pattaya', hours: '10:00 - 22:00', lat: 12.9274, lon: 100.8769, photo_url: null },
        { id: 6, name: 'Saint Petersburg Store', address: 'Невский пр., 28, Санкт-Петербург', region: 'Saint Petersburg', hours: '10:00 - 21:00', lat: 59.9343, lon: 30.3351, photo_url: null },
    ];
}

function _loadStores() {
    try {
        if (fs.existsSync(STORES_FILE)) {
            return JSON.parse(fs.readFileSync(STORES_FILE, 'utf-8'));
        }
    } catch (e) { /* fall through */ }
    return _mockStores();
}

function findStoresByLocation(lat, lon, radiusKm = SEARCH_RADIUS_KM) {
    const stores = _loadStores();
    return stores
        .map((s) => ({ ...s, distance_km: Math.round(_haversine(lat, lon, s.lat, s.lon) * 100) / 100 }))
        .filter((s) => s.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 5);
}

function findStoresByRegion(region) {
    const stores = _loadStores();
    return stores
        .filter((s) => s.region && s.region.toLowerCase().includes(region.toLowerCase()));
}

function getAllRegions() {
    const stores = _loadStores();
    return [...new Set(stores.map((s) => s.region).filter(Boolean))].sort();
}

module.exports = { findStoresByLocation, findStoresByRegion, getAllRegions };
