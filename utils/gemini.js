/**
 * utils/gemini.js — Gemini AI for the Help assistant.
 * Mirrors utils/gemini.py exactly.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const GEMINI_MODEL = 'gemini-2.5-flash';
const INSTRUCTIONS_FILE = path.join(__dirname, '../gemini_instructions.txt');

function _loadInstructions() {
    try {
        const lines = fs.readFileSync(INSTRUCTIONS_FILE, 'utf-8')
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#'));
        return lines.join('\n');
    } catch {
        return 'You are a helpful assistant. Be concise and friendly.';
    }
}

/**
 * conversationHistory: [{ role: 'user'|'model', text: string }, ...]
 */
async function askGemini(conversationHistory, lang = 'en') {
    if (!config.GEMINI_API_KEY) {
        console.warn('[Gemini] GEMINI_API_KEY not set');
        return '⚠️ Gemini API key is not configured. Please contact the administrator.';
    }

    const systemInstruction = _loadInstructions();

    const contents = [
        { role: 'user', parts: [{ text: `[System instructions]\n${systemInstruction}\n\n[Conversation starts]` }] },
        { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
        ...conversationHistory.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        })),
    ];

    const payload = JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 900, temperature: 0.7 },
    });

    const url = `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`;

    return new Promise((resolve) => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: url,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: 20000,
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode === 200) {
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                        resolve(text || '⚠️ Could not get a response. Please try again.');
                    } else {
                        const msg = parsed.error?.message || 'Unknown error';
                        console.error(`[Gemini] API error ${res.statusCode}: ${msg}`);
                        resolve('⚠️ AI service error. Please try again later.');
                    }
                } catch {
                    resolve('⚠️ An error occurred. Please try again later.');
                }
            });
        });
        req.on('error', (e) => { console.error('[Gemini] Request failed:', e.message); resolve('⚠️ An error occurred. Please try again later.'); });
        req.on('timeout', () => { req.destroy(); resolve('⚠️ Request timed out. Please try again.'); });
        req.write(payload);
        req.end();
    });
}

module.exports = { askGemini };
