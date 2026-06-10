const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const { setupHandlers } = require('./handlers');
const { startWebhookServer } = require('./webhook_api');

const log = (level, ...args) => {
    const ts = new Date().toISOString();
    console[level === 'error' ? 'error' : 'log'](`[${ts}] [${level.toUpperCase()}]`, ...args);
};

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './data/.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
        ],
    },
});

client.on('qr', (qr) => {
    log('info', 'Scan QR code:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => log('info', 'Authenticated'));

client.on('ready', () => {
    log('info', 'Bot is ready!');

    // Debug: dump all events the client emits
    const emit = client.pupPage?.on?.bind(client.pupPage);
    log('info', 'Puppage available:', !!client.pupPage);
});

client.on('auth_failure', (msg) => {
    log('error', 'Auth failure:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    log('warn', 'Disconnected:', reason);
    process.exit(1);
});

// Try both events
client.on('message', (msg) => {
    log('debug', '[message] from:', msg.from, 'body:', msg.body?.slice(0, 50));
});

client.on('message_create', (msg) => {
    log('debug', '[message_create] fromMe:', msg.fromMe, 'from:', msg.from, 'body:', msg.body?.slice(0, 50));
});

async function main() {
    log('info', 'Starting...');
    startWebhookServer(client);
    setupHandlers(client);
    await client.initialize();
}

main().catch((err) => {
    log('error', 'Fatal:', err);
    process.exit(1);
});