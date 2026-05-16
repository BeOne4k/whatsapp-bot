/**
 * utils/ai.js — Claude AI for manager chat escalation.
 * Mirrors utils/ai.py exactly.
 */

const https = require('https');
const config = require('../config');

const SYSTEM_PROMPT = `You are a helpful customer support assistant for a retail loyalty program bot.

You can help with:
- FAQ about the loyalty program (how to earn points, redeem rewards, etc.)
- Navigation help (how to find stores, register, etc.)
- General info about the company and stores

You MUST NOT:
- Give medical advice
- Generate recipes on your own
- Answer legally sensitive questions
- Make up information you don't know

If a question is complex, medical, legal, or the user asks to speak with a human, 
respond with exactly: [TRANSFER_TO_HUMAN]

Always respond in the same language the user writes in.
Keep answers concise and friendly.`;

async function askAi(userMessage, lang = 'en') {
    if (!config.ANTHROPIC_API_KEY) {
        console.warn('[AI] ANTHROPIC_API_KEY not set — returning TRANSFER_TO_HUMAN');
        return '[TRANSFER_TO_HUMAN]';
    }

    const body = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
    });

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'x-api-key': config.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(body),
            },
            timeout: 15000,
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode === 200 && parsed.content?.[0]?.text) {
                        resolve(parsed.content[0].text);
                    } else {
                        console.error('[AI] API error:', parsed);
                        resolve('[TRANSFER_TO_HUMAN]');
                    }
                } catch {
                    resolve('[TRANSFER_TO_HUMAN]');
                }
            });
        });
        req.on('error', (e) => { console.error('[AI] Request failed:', e.message); resolve('[TRANSFER_TO_HUMAN]'); });
        req.on('timeout', () => { req.destroy(); resolve('[TRANSFER_TO_HUMAN]'); });
        req.write(body);
        req.end();
    });
}

module.exports = { askAi };
