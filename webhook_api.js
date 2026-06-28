/**
 * webhook_api.js — Express webhook server for Odoo CRM purchase events + broadcast.
 *
 * POST /odoo/purchase
 * Header: X-API-Key: <WEBHOOK_SECRET>
 * Body:   { phone, customer_name, product_name, order_id?, lang? }
 *
 * POST /broadcast
 * Header: X-API-Key: <WEBHOOK_SECRET>
 * Body:   { text, photo?, video?, lang?, delay? }
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const config  = require('./config');
const cors = require('cors');
const { getChatId } = require('./utils/chatRegistry');

const app = express();
const origins =
    config.ENV === "development"
        ? [
            "http://localhost:5500",
            "http://127.0.0.1:5500",
        ]
        : [
            config.ADMIN_URL,
        ];

app.use(cors({
    origin: origins,
    credentials: true,
}));
// Force UTF-8 for all JSON responses
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Parse JSON body as UTF-8
app.use(express.json({ type: '*/*' }));

const THANK_YOU_DELAY = config.THANK_YOU_DELAY_SECONDS;
const RETENTION_DELAY = config.RETENTION_DELAY_SECONDS;

// Pending purchases when chat_id not yet known: phone -> [{ lang, order_id, ts }]
const _pending = {};

let _client = null; // WhatsApp client, set after bot is ready

// ── Broadcast lock ─────────────────────────────────────────────────────────────
let _broadcastRunning = false;

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

// ── Broadcast helpers ──────────────────────────────────────────────────────────

/**
 * Returns a Set of chatIds that belong to the bot itself or the manager —
 * these must never receive broadcast messages.
 */
function _getExcludedChatIds() {
    const excluded = new Set();

    // Bot's own WhatsApp ID
    if (_client && _client.info && _client.info.wid) {
        const botId = _client.info.wid._serialized;
        if (botId) excluded.add(botId);
        // Also exclude without suffix just in case
        excluded.add(_client.info.wid.user + '@c.us');
    }

    // Manager phone from config
    if (config.MANAGER_PHONE) {
        const managerPhone = config.MANAGER_PHONE.replace(/[\s+\-]/g, '');
        excluded.add(managerPhone + '@c.us');
    }

    return excluded;
}

/**
 * Reads data/user_langs.json and returns { chatId: lang } for all known users,
 * excluding the bot itself and the manager.
 * Optionally filters by lang.
 */
function _loadUserLangs(langFilter) {
    const LANG_FILE = path.join(__dirname, 'data', 'user_langs.json');
    let langs = {};
    try {
        if (fs.existsSync(LANG_FILE)) {
            langs = JSON.parse(fs.readFileSync(LANG_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('[Broadcast] Failed to load user_langs.json:', e.message);
    }

    const excluded = _getExcludedChatIds();

    const result = {};
    for (const [chatId, lang] of Object.entries(langs)) {
        // Skip bot itself and manager
        if (excluded.has(chatId)) {
            console.log(`[Broadcast] Skipping excluded chatId: ${chatId}`);
            continue;
        }
        // Skip groups (group chatIds end with @g.us)
        if (chatId.endsWith('@g.us')) continue;
        // Apply lang filter if requested
        if (langFilter && lang !== langFilter) continue;

        result[chatId] = lang;
    }
    return result;
}

/**
 * Converts [text](url) markdown links to plain text (WhatsApp doesn't support hyperlinks).
 * *bold*, _italic_, `code` are already WhatsApp-native — pass through as-is.
 */
function _convertMarkdown(text) {
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2');
}

/** Sleep for ms milliseconds */
function _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a single broadcast message to one chatId.
 * Returns true on success, false on failure.
 */
async function _downloadAsMedia(url) {
    const { MessageMedia } = require('whatsapp-web.js');
    const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
    // Явно задаём имя файла — без него WhatsApp отправляет как документ
    media.filename = 'video.mp4';
    media.mimetype = 'video/mp4';
    return media;
}

async function _sendBroadcastOne(chatId, text, photo, video) {
    try {
        if (photo) {
            const { MessageMedia } = require('whatsapp-web.js');
            const media = await MessageMedia.fromUrl(photo, { unsafeMime: true });
            await _client.sendMessage(chatId, media, { caption: text });
        } else if (video) {
            const media = await _downloadAsMedia(video);
            await _client.sendMessage(chatId, media, { caption: text, sendMediaAsDocument: false });
        } else {
            await _client.sendMessage(chatId, text);
        }
        return true;
    } catch (e) {
        console.warn(`[Broadcast] Failed to send to ${chatId}:`, e.message);
        return false;
    }
}

// ── Express routes ─────────────────────────────────────────────────────────────

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

// ── POST /broadcast ────────────────────────────────────────────────────────────

app.post('/broadcast', async (req, res) => {
    // Auth
    const apiKey = req.headers['x-api-key'];
    if (config.WEBHOOK_SECRET && apiKey !== config.WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Invalid or missing X-API-Key' });
    }

    // Bot readiness
    if (!_client) {
        return res.status(503).json({ error: 'WhatsApp client not ready' });
    }

    // Lock — prevent concurrent broadcasts
    if (_broadcastRunning) {
        return res.status(409).json({ error: 'Another broadcast is already running. Please wait.' });
    }

    // Parse body
    const {
        text,
        photo,
        video,
        lang:   langFilter = null,
        delay:  delayBetween = 0.05,
    } = req.body;

    if (!text) {
        return res.status(400).json({ error: '"text" is required' });
    }

    // Validate lang filter
    const VALID_LANGS = ['ru', 'en', 'thai'];
    if (langFilter && !VALID_LANGS.includes(langFilter)) {
        return res.status(400).json({ error: `Invalid lang. Allowed: ${VALID_LANGS.join(', ')}` });
    }

    // Delay must be > 0
    const delayMs = Math.max(10, parseFloat(delayBetween) * 1000 || 50);

    // Load recipients (already excludes bot itself, manager, groups)
    const userLangs = _loadUserLangs(langFilter);
    const chatIds   = Object.keys(userLangs);

    if (chatIds.length === 0) {
        return res.json({ status: 'done', sent: 0, failed: 0, total: 0 });
    }

    // Convert markdown links; WhatsApp bold/italic/code are native
    const finalText = _convertMarkdown(text);

    _broadcastRunning = true;
    console.log(`[Broadcast] Starting: ${chatIds.length} recipients, lang=${langFilter || 'all'}, delay=${delayMs}ms`);

    let sent   = 0;
    let failed = 0;

    try {
        for (const chatId of chatIds) {
            const ok = await _sendBroadcastOne(
                chatId,
                finalText,
                photo  || null,
                video  || null
            );
            if (ok) sent++;
            else    failed++;
            await _sleep(delayMs);
        }
    } finally {
        _broadcastRunning = false;
    }

    const total = sent + failed;
    console.log(`[Broadcast] Done. sent=${sent}, failed=${failed}, total=${total}`);
    return res.json({ status: 'done', sent, failed, total });
});

app.get('/health', (req, res) => {
    const botId = (_client && _client.info && _client.info.wid)
        ? _client.info.wid._serialized
        : null;
    res.json({
        status: 'ok',
        bot_ready: !!_client,
        bot_id: botId,
        broadcast_running: _broadcastRunning,
    });
});

// ── Meta Webhook Verification (GET) ─────────────────────────────────────────
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

// ── Start server ───────────────────────────────────────────────────────────────

function startWebhookServer(client) {
    _client = client;
    const port = config.WEBHOOK_PORT;
    app.listen(port, '0.0.0.0', () => {
        console.log(`[Webhook] Server listening on port ${port}`);
    });
}


// Broadcast list
const router = express.Router();

// Предполагается, что whatsappClient уже инициализирован и экспортирован
// const { client: whatsappClient } = require('./whatsappClient');

/**
 * POST /broadcastlist
 * Body: {
 *   phones: string[],       // список номеров телефонов
 *   text: string,           // текст сообщения
 *   photo?: string,         // путь к файлу или URL изображения
 *   video?: string,         // путь к файлу или URL видео
 *   lang?: string,          // null = всем; "ru"/"en"/"thai" = фильтр
 *   delay?: number          // задержка между сообщениями в мс (по умолчанию 50)
 * }
 */
app.post('/broadcastlist', async (req, res) => {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  const apiKey = req.headers['x-api-key'];

  // Авторизация
  if (WEBHOOK_SECRET && apiKey !== WEBHOOK_SECRET) {
    return res.status(401).json({ detail: 'Invalid or missing X-API-Key' });
  }

  const {
    phones = [],
    text = '',
    photo = null,
    video = null,
    lang = null,
    delay = 50, // в миллисекундах (аналог 0.05 секунды)
  } = req.body;

  // Валидация
  if (!text.trim()) {
    return res.status(400).json({ detail: 'text must not be empty' });
  }

  if (!_client || !_client.info) {
    return res.status(503).json({ detail: 'Bot is not initialised yet' });
  }

  // Загрузка реестра и данных пользователей
  let registry = {};
  let userData = {};

  try {
    registry = JSON.parse(fs.readFileSync('./data/chat_registry.json', 'utf-8'));
  } catch {
    return res.status(500).json({ detail: 'Failed to load chat registry' });
  }

  try {
    userData = JSON.parse(fs.readFileSync('./data/user_data.json', 'utf-8'));
  } catch {
    userData = {};
  }

  const getLang = (chatId) => userData[chatId]?.lang ?? null;

  // Сборка списка целевых chat_id
  let sent = 0;
  let failed = 0;
  const targets = [];

  for (const phone of phones) { // нормализация номера

    if (!registry[phone]) {
      console.log(`Phone not in registry: ${phone}`);
      failed++;
      continue;
    }

    const chatId = registry[phone];

    if (lang !== null && getLang(chatId) !== lang) {
      continue;
    }

    targets.push(chatId);
  }

  // Медиа: загружаем файл если это локальный путь
  const getMedia = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return { fromUrl: filePath };
    }
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath).toString('base64');
      const ext = filePath.split('.').pop().toLowerCase();
      const mimeMap = {
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      return { fromBase64: data, mimetype: mime };
    }
    return null;
  };

  const photoMedia = photo ? getMedia(photo) : null;
  const videoMedia = video ? getMedia(video) : null;

  // Рассылка
  for (const chatId of targets) {
    try {
      const whatsappId = chatId.endsWith('@c.us')
        ? chatId
        : `${chatId}@c.us`;

      if (photoMedia) {
        const { MessageMedia } = require('whatsapp-web.js');
        const media = photoMedia.fromUrl
          ? await MessageMedia.fromUrl(photoMedia.fromUrl, { unsafeMime: true })
          : new MessageMedia(photoMedia.mimetype, photoMedia.fromBase64);
        await _client.sendMessage(whatsappId, media, { caption: text });

      } else if (videoMedia) {
        let media;
        if (videoMedia.fromUrl) {
          media = await _downloadAsMedia(videoMedia.fromUrl);
        } else {
          const { MessageMedia } = require('whatsapp-web.js');
          media = new MessageMedia(videoMedia.mimetype, videoMedia.fromBase64);
        }
        await _client.sendMessage(whatsappId, media, { caption: text, sendMediaAsDocument: false });

      } else {
        await _client.sendMessage(whatsappId, text);
      }

      sent++;
      console.log(`broadcast: sent to chatId=${chatId}`);
    } catch (err) {
      failed++;
      console.warn(`broadcast: failed chatId=${chatId} — ${err.message}`);
    }

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log('broadcast: done.');

  return res.status(200).json({
    status: 'done',
    sent,
    failed,
    total: sent + failed,
  });
});
module.exports = { startWebhookServer, flushPending, app };