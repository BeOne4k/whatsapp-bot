/**
 * webhook_api.js — Express webhook server for Odoo CRM purchase events.
 * Mirrors webhook_api.py exactly.
 *
 * POST /odoo/purchase
 * Header: X-API-Key: <WEBHOOK_SECRET>
 * Body:   { phone, customer_name, product_name, order_id?, lang? }
 */

const express = require('express');
const config = require('./config');
const { getChatId } = require('./utils/chatRegistry');

const app = express();
app.use(express.json());

const THANK_YOU_DELAY = config.THANK_YOU_DELAY_SECONDS;
const RETENTION_DELAY = config.RETENTION_DELAY_SECONDS;

// Pending purchases when chat_id not yet known: phone -> [{ lang, order_id, ts }]
const _pending = {};

let _client = null; // WhatsApp client, set after bot is ready

const MESSAGES = {
    thank_you: {
        ru: 'Спасибо за покупку в WeedeN 🌿 Мы тщательно отбираем каждый продукт, и будем рады видеть вас снова за новым опытом и любимыми позициями.',
        en: 'Thank you for your purchase at WeedeN 🌿 We carefully select every product and look forward to seeing you again for new experiences and your favorite items.',
        thai: 'ขอบคุณสำหรับการซื้อสินค้าที่ WeedeN 🌿 เราคัดสรรทุกผลิตภัณฑ์อย่างพิถีพิถัน และยินดีที่จะต้อนรับคุณอีกครั้งเพื่อสัมผัสประสบการณ์ใหม่ๆ และสินค้าที่คุณชื่นชอบ',
    },
    retention: {
        ru: 'Спасибо за то, что вы уже попробовали продукты WeedeN! 🌿\n\nТеперь самое время открыть для себя новые фавориты — у нас как раз появились позиции, которые точно стоят второго визита. Приходите!',
        en: 'Thank you for trying WeedeN products! 🌿\n\nNow is the perfect time to discover new favorites — we\'ve just added some items that are definitely worth a second visit. Come by and check them out!',
        thai: 'ขอบคุณที่ไว้วางใจเลือกใช้ผลิตภัณฑ์ของ WeedeN! 🌿\n\nตอนนี้เป็นเวลาที่เหมาะที่สุดในการค้นหาสินค้าชิ้นโปรดใหม่ๆ เราเพิ่งมีสินค้าใหม่เข้ามาซึ่งคุ้มค่ากับการกลับมาเยี่ยมชมเป็นครั้งที่สองแน่นอน แล้วแวะมานะครับ!',
    },
};

function _buildMessage(type, lang) {
    const templates = MESSAGES[type] || MESSAGES.thank_you;
    return templates[lang] || templates.en;
}

function _sendDelayed(chatId, lang, type, delaySeconds, orderId) {
    console.log(`[Webhook] Scheduled ${type} for chatId=${chatId}, delay=${delaySeconds}s, order=${orderId}`);
    setTimeout(async () => {
        if (!_client) { console.error('[Webhook] Client not ready'); return; }
        const text = _buildMessage(type, lang);
        try {
            await _client.sendMessage(chatId, text);
            console.log(`[Webhook] Sent ${type} to ${chatId} (order=${orderId})`);
        } catch (e) {
            console.error(`[Webhook] Failed to send ${type} to ${chatId}:`, e.message);
        }
    }, delaySeconds * 1000);
}

function _scheduleAll(chatId, lang, orderId, initialDelay = THANK_YOU_DELAY) {
    _sendDelayed(chatId, lang, 'thank_you', initialDelay, orderId);
    const retentionDelay = initialDelay + (RETENTION_DELAY - THANK_YOU_DELAY);
    _sendDelayed(chatId, lang, 'retention', retentionDelay, orderId);
}

function flushPending(phone, client) {
    const normalized = phone.trim().replace(/[\s-]/g, '');
    const tasks = _pending[normalized];
    if (!tasks || tasks.length === 0) return;
    delete _pending[normalized];

    const chatId = getChatId(normalized);
    if (!chatId) { console.warn('[Webhook] flush_pending: still no chatId for phone=', normalized); return; }

    const cl = client || _client;
    const now = Date.now() / 1000;
    for (const task of tasks) {
        const elapsed = Math.floor(now - task.ts);
        const remaining = Math.max(0, THANK_YOU_DELAY - elapsed);
        _scheduleAll(chatId, task.lang, task.order_id, remaining);
        console.log(`[Webhook] flush_pending: scheduled for phone=${normalized}, remaining=${remaining}s`);
    }
}

// ── Express routes ────────────────────────────────────────────────────────────

app.post('/odoo/purchase', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (config.WEBHOOK_SECRET && apiKey !== config.WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Invalid or missing X-API-Key' });
    }

    const { phone, customer_name, product_name, order_id, lang = 'en' } = req.body;
    if (!phone || !customer_name || !product_name) {
        return res.status(400).json({ error: 'phone, customer_name, product_name are required' });
    }

    const normalized = phone.trim().replace(/[\s-]/g, '');
    const chatId = getChatId(normalized);

    if (!chatId) {
        if (!_pending[normalized]) _pending[normalized] = [];
        _pending[normalized].push({ lang, order_id, ts: Date.now() / 1000 });
        console.warn(`[Webhook] No chatId for phone=${normalized} — queued (order=${order_id})`);
        return res.status(202).json({ status: 'queued', detail: 'chat_id not found; will send when user starts bot' });
    }

    _scheduleAll(chatId, lang, order_id);
    return res.status(200).json({ status: 'scheduled', chatId, messages: ['thank_you', 'retention'] });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', bot_ready: !!_client });
});

// ── Meta Webhook Verification (GET) ─────────────────────────────────────────
// Meta calls this when you click "Подтвердить и сохранить" in Developer Console.
// WEBHOOK_SECRET must match what you typed in "Подтверждение маркера".
app.get("/", (req, res) => {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === config.WEBHOOK_SECRET) {
        console.log("[Webhook] Meta verification passed");
        res.status(200).send(challenge);
    } else {
        console.warn("[Webhook] Meta verification FAILED — check WEBHOOK_SECRET");
        res.sendStatus(403);
    }
});

// ── Start server ──────────────────────────────────────────────────────────────

function startWebhookServer(client) {
    _client = client;
    const port = config.WEBHOOK_PORT;
    app.listen(port, '0.0.0.0', () => {
        console.log(`[Webhook] Server listening on port ${port}`);
    });
}

module.exports = { startWebhookServer, flushPending, app };
