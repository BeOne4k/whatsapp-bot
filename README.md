# WhatsApp Bot WDN

WhatsApp port of the Telegram WDN bot. Identical functionality and messages.

## Features

- 🌐 **3 languages**: English, Russian, Thai
- 🎁 **Loyalty card registration**: phone → OTP → name → country → tourist/citizen → Odoo API
- 📍 **Store finder**: by GPS location or region name
- 🤖 **Help AI**: Gemini-powered multi-turn chat assistant
- 💬 **Manager chat**: Claude AI with human escalation
- 📲 **Socials**: link to social media landing page
- ℹ️ **About us**: company info
- 🔔 **Purchase webhooks**: Odoo → thank-you & retention messages
- ⏰ **Reminders**: loyalty nudges at 5 min, 2 h, 24 h post language selection

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your real values

# 3. Run the bot
npm start
# Scan the QR code in the terminal with WhatsApp on your phone
# (WhatsApp → Linked Devices → Link a Device)
```

## Docker

```bash
cp .env.example .env
# Fill in .env
docker-compose up -d
# Attach to see QR code on first run:
docker-compose logs -f
```

After the first QR scan the session is stored in `data/.wwebjs_auth/` and the bot reconnects automatically on restart.

## User Interaction (No Telegram buttons!)

WhatsApp has no inline buttons. The bot uses numbered menus:

```
🏠 Main Menu

Reply with a number:
1️⃣ 📍 Find nearest store
2️⃣ 🎁 Get loyalty card
3️⃣ 🤖 Help (AI Assistant)
4️⃣ 💬 Contact manager
5️⃣ ℹ️ About us
6️⃣ 📲 Our socials
7️⃣ 🌐 Change language
```

Within the Help chat, `0` clears history and `9` returns to the main menu.  
Within the Manager chat, words like "human / менеджер / manager / agent" trigger escalation.

## Webhook API

Identical to the Telegram bot's `webhook_api.py`.

```
POST /odoo/purchase
X-API-Key: <WEBHOOK_SECRET>

{
  "phone": "+66812345678",
  "customer_name": "Ivan",
  "product_name": "WeedeN Gold",
  "order_id": "SO-1234",   // optional
  "lang": "ru"             // optional, default "en"
}
```

Schedules a thank-you message (default 10 min) and a retention message (default 24 h).

```
GET /health
→ { "status": "ok", "bot_ready": true }
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `ODOO_URL` | Odoo instance URL | Yes |
| `ODOO_API_TOKEN` | Bearer token for Odoo API | Yes |
| `WEBHOOK_SECRET` | X-API-Key for webhook endpoint | Recommended |
| `WEBHOOK_PORT` | Webhook server port (default 8080) | No |
| `MANAGER_PHONE` | Manager's WhatsApp number (digits only) | Yes |
| `MANAGER_WORK_START` | Manager start hour UTC+7 (default 10) | No |
| `MANAGER_WORK_END` | Manager end hour UTC+7 (default 18) | No |
| `ANTHROPIC_API_KEY` | Claude API key (manager chat AI) | Yes |
| `GEMINI_API_KEY` | Gemini API key (help assistant) | Yes |
| `SOCIALS_URL` | Social media landing page URL | No |
| `RECIPE_URL` | Recipe partner URL | No |
| `THANK_YOU_DELAY_SECONDS` | Delay for thank-you message (default 600) | No |
| `RETENTION_DELAY_SECONDS` | Delay for retention message (default 86400) | No |
| `GA4_MEASUREMENT_ID` | Google Analytics 4 ID | No |
| `GA4_API_SECRET` | GA4 API secret | No |
| `BOTS_API_URL` | BotsAPI multi-channel server URL | No |
| `BOTS_API_KEY` | BotsAPI key | No |

## File Structure

```
whatsapp_bot/
├── bot.js                 # Entry point (mirrors bot.py)
├── config.js              # Config / env stubs (mirrors config.py)
├── webhook_api.js         # Express webhook server (mirrors webhook_api.py)
├── handlers/
│   ├── index.js           # Central message router
│   ├── start.js           # /start, language, main menu
│   ├── loyalty.js         # Loyalty registration flow
│   ├── stores.js          # Store search
│   ├── manager.js         # Manager chat + AI escalation
│   ├── help.js            # Gemini AI help chat
│   ├── about.js           # About us
│   └── socials.js         # Socials
├── locales/
│   └── texts.js           # All messages EN/RU/TH (mirrors texts.py)
├── utils/
│   ├── state.js           # In-memory FSM (replaces aiogram FSM)
│   ├── otp.js             # OTP generation & verification
│   ├── odoo.js            # Odoo REST API client
│   ├── apiClient.js       # BotsAPI client
│   ├── chatRegistry.js    # phone→chatId registry
│   ├── reminders.js       # Scheduled reminder messages
│   ├── analytics.js       # Event analytics
│   ├── stores.js          # Store search logic
│   ├── ai.js              # Claude AI (manager escalation)
│   └── gemini.js          # Gemini AI (help assistant)
├── data/                  # Runtime data (gitignored)
│   ├── .wwebjs_auth/      # WhatsApp session
│   ├── analytics.jsonl    # Event log
│   ├── chat_registry.json # phone→chatId mapping
│   └── stores.json        # Store data (optional, falls back to mock)
├── gemini_instructions.txt # Gemini system prompt (copy from Telegram bot)
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

## Differences from Telegram Bot

| Feature | Telegram | WhatsApp |
|---|---|---|
| Menus | Inline keyboard buttons | Numbered text list (1-7) |
| Location sharing | Native button | Attachment or "lat,lon" text |
| Bot token | BotFather token | QR code scan (no token) |
| Commands | `/start`, `/menu`, `/language` | `start`/`menu` text or `/start` |
| Callback queries | `F.data == "..."` | FSM state + text parsing |
| Language | `from_user.id` | `msg.from` (phone@c.us) |
