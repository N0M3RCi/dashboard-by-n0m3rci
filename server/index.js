import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

/* global process — fixes node globals lint when eslint is run repo-wide; server not meant for browser */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Persistent settings + analytics files — HARD REQUIREMENT for data not disappearing.
// On Railway: attach a Volume in the service dashboard (Data > Volumes). Railway will
// set RAILWAY_VOLUME_MOUNT_PATH automatically (commonly /app/storage but can be chosen).
// This makes analytics.json + settings.json survive container restarts and git deploys.
// Combined with seeding TELEGRAM_BOT_TOKEN as a Railway variable (or it falls back internals)
// the bot creds + data pipe are permanent and transmission does not break on redeploy.
// The backend pulls from Telegram (using bot token) + receives pushed events from your *bot process*
// over /api/events/report . All endpoints designed for same-origin Railway single-service hosting.
let PERSIST_DIR;
const volumeCandidates = [
  process.env.RAILWAY_VOLUME_MOUNT_PATH,
  '/app/storage',
  '/data',
  '/mnt/volume',
  path.join(__dirname, 'storage'),
].filter(Boolean);

for (const candidate of volumeCandidates) {
  try {
    if (candidate && fs.existsSync(candidate)) {
      PERSIST_DIR = candidate;
      console.log('📦 Using volume/persistent path for data at', PERSIST_DIR);
      break;
    }
  } catch {}
}

if (!PERSIST_DIR) {
  // Final fallback: always local storage/, never wipe on code change.
  PERSIST_DIR = path.join(__dirname, 'storage');
  console.log('💾 No Railway volume detected — using ephemeral disk fallback at', PERSIST_DIR);
}

try {
  if (!fs.existsSync(PERSIST_DIR)) {
    fs.mkdirSync(PERSIST_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('⚠️ Could not ensure persist dir, falling back to /tmp/storage:', e.message);
  PERSIST_DIR = '/tmp/storage';
  try { fs.mkdirSync(PERSIST_DIR, { recursive: true }); } catch {}
}

const SETTINGS_FILE = path.join(PERSIST_DIR, 'settings.json');
const ANALYTICS_FILE = path.join(PERSIST_DIR, 'analytics.json');

// Guarantee dir exists (idempotent)
try {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch (e) {
  console.warn('Could not ensure settings dir:', e.message);
}

function loadSavedSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not load saved settings:', e.message);
  }
  return {};
}

function saveSettings(settings) {
  try {
    const existing = loadSavedSettings();
    const merged = { ...existing, ...settings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    console.log('💾 Settings persisted to', SETTINGS_FILE);
  } catch (e) {
    console.warn('Could not save settings:', e.message);
  }
}

function loadAnalyticsState() {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
      return {
        lastSyncTime: saved.lastSyncTime || null,
        updateOffset: saved.updateOffset || 0,
        commandUsage: saved.commandUsage || {},
        messageLog: (saved.messageLog || []).slice(-10000),
        subscribers: saved.subscribers ? new Map(Object.entries(saved.subscribers)) : new Map(),
        // Critical ingest pipeline health — restore so "DATA PIPE LIVE", reportCount and last ingest time
        // survive server restarts / Railway redeploys (when volume attached).
        lastEventReceived: saved.lastEventReceived || null,
        reportCount: (typeof saved.reportCount === 'number' ? saved.reportCount : 0),
      };
    }
  } catch (e) {
    console.warn('Could not load analytics state:', e.message);
  }
  return { lastSyncTime: null, updateOffset: 0, commandUsage: {}, messageLog: [], subscribers: new Map(), lastEventReceived: null, reportCount: 0 };
}

function saveAnalyticsState() {
  try {
    const toSave = {
      lastSyncTime,
      updateOffset,
      commandUsage,
      messageLog: messageLog.slice(-10000),
      subscribers: Object.fromEntries(subscribers.entries()),
      lastEventReceived,
      reportCount,
    };
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not persist analytics state:', e.message);
  }
}

const savedAnalytics = loadAnalyticsState();

const savedSettings = loadSavedSettings();

// === SAFE PERMANENT DEFAULTS (NO REAL SECRETS IN SOURCE) ===
// Display name & description have safe public defaults for nice UI out-of-box.
// THE BOT TOKEN IS **NEVER** hard-coded as a real value here.
// A real token must come from:
//   1. Railway environment variable TELEGRAM_BOT_TOKEN (preferred for prod)
//   2. .env file (local)
//   3. Saved via the /api/settings UI (persists to volume-backed settings.json)
// The code self-heals from env -> disk save on boot so once set, token stays without re-entry.
// If no token supplied at all, the dashboard gracefully shows connection warnings and lets
// you enter/fix it in Settings (bot sync will fail until valid token is saved).
const PERMANENT_BOT_TOKEN = '';
const PERMANENT_BOT_DISPLAY_NAME = '🤖N0M3RCi';
const PERMANENT_BOT_DESCRIPTION = 'Connect any OpenAI-compatible API to Telegram.';

// Dynamic configuration storage (persisted to disk)
// The dashboard pulls real metrics & data directly using the Telegram Bot token (your "telegram API key").
// It calls api.telegram.org methods (getMe/getUpdates/getMyCommands/setMyCommands/getWebhookInfo) to hydrate bot info/commands/live updates,
// in addition to receiving pushed real-time events sent by the bot's report function.
// This ensures data/metrics are unified and do not live purely "on your local server".
// For the dashboard personal instance it was originally connected to https://dashboard.n0m3rci.cc .

let BOT_TOKEN = savedSettings.botToken || process.env.TELEGRAM_BOT_TOKEN || PERMANENT_BOT_TOKEN;
let BOT_DISPLAY_NAME = savedSettings.botDisplayName || process.env.BOT_DISPLAY_NAME || PERMANENT_BOT_DISPLAY_NAME;
let BOT_DESCRIPTION = savedSettings.botDescription || process.env.BOT_DESCRIPTION || PERMANENT_BOT_DESCRIPTION;
let WEBHOOK_URL = savedSettings.webhookUrl || process.env.WEBHOOK_URL || '';
let TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : 'https://api.telegram.org/bot';

// Self-heal / prevent wipe of bot credentials on redeploys:
// If TELEGRAM_BOT_TOKEN is provided via env (set it on Railway under the dashboard service vars,
// or in dashboard/.env), immediately save it (and current display info) to persistent storage/settings.
// This seeds the file so that on container restarts with volume attached, the creds stick even if
// previous /settings interactions were not done after a fresh deploy.
// If no Railway volume is mounted data will still live for the lifetime of the current instance;
// attach a volume (mount /app/storage) on Railway for permanent survival of analytics + settings across redeploys.
if (process.env.TELEGRAM_BOT_TOKEN) {
  const incoming = process.env.TELEGRAM_BOT_TOKEN;
  if (BOT_TOKEN !== incoming) {
    BOT_TOKEN = incoming;
    TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
  }
  // Persist immediately (if fs is writable — volume provides the permanence)
  saveSettings({
    botToken: BOT_TOKEN,
    botDisplayName: BOT_DISPLAY_NAME,
    botDescription: BOT_DESCRIPTION,
    webhookUrl: WEBHOOK_URL,
  });
  console.log('🔐 TELEGRAM_BOT_TOKEN present via env — credentials persisted to disk (prevents wipe on redeploy)');
}

// ALWAYS ensure the final credentials are written to settings storage on every startup.
// This seeds settings.json (when writable/volume) so that loadSavedSettings will have the prior
// (or default display) values on cold start even before env is considered.
// Display name/desc are always surfaced in Settings even if token not present.
try {
  saveSettings({
    botToken: BOT_TOKEN,
    botDisplayName: BOT_DISPLAY_NAME,
    botDescription: BOT_DESCRIPTION,
    webhookUrl: WEBHOOK_URL || '',
  });
} catch (e) {
  // saveSettings already catches internally; this is just safety
}

// Model Cost Mapping (Per 1 Million tokens, USD)
const MODEL_PRICING = {
  'gpt-4o': { blended: 5.00 },
  'gpt-4o-mini': { blended: 0.30 },
  'gpt-4': { blended: 40.00 },
  'gpt-3.5-turbo': { blended: 1.00 },
  'claude-3-5-sonnet': { blended: 6.00 },
  'claude-3-5-haiku': { blended: 1.60 },
  'claude-3-opus': { blended: 30.00 },
  'llama': { blended: 0.20 },
  'deepseek': { blended: 0.20 },
  'qwen': { blended: 0.20 },
};

function estimateTokenCost(modelName, tokens) {
  if (!modelName || !tokens) return 0;
  const normalized = modelName.toLowerCase();

  let matchKey = Object.keys(MODEL_PRICING).find(key => normalized.includes(key));
  let rate = matchKey ? MODEL_PRICING[matchKey].blended : 0.50; // default to $0.50 per million tokens

  return (tokens / 1000000) * rate;
}

// In-memory state (persists across syncs within a session)
let botInfo = null;
let lastSyncTime = null;
let commands = [];
let updates = [];
let subscribers = new Map(); // userId -> user data
let messageLog = []; // { timestamp, chatId, userId, type }
let commandUsage = {}; // commandName -> count
let syncLatency = 0;
let updateOffset = savedAnalytics.updateOffset || 0;

// Data receiving & health diagnostics (critical to debug "no data received in dashboard")
let lastEventReceived = null;  // timestamp of last /api/events/report received from bot
let reportCount = 0;           // total reports processed this process lifetime
let webhookModeDetected = false;

// Restore persisted metrics/analytics so counts and history survive restarts/reloads (fix for "zero data" forever)
if (savedAnalytics.lastSyncTime) lastSyncTime = savedAnalytics.lastSyncTime;
if (savedAnalytics.commandUsage && Object.keys(savedAnalytics.commandUsage).length) commandUsage = { ...savedAnalytics.commandUsage };
if (savedAnalytics.messageLog && savedAnalytics.messageLog.length) messageLog = savedAnalytics.messageLog;
if (savedAnalytics.subscribers && savedAnalytics.subscribers.size) subscribers = savedAnalytics.subscribers;
if (savedAnalytics.lastEventReceived) lastEventReceived = savedAnalytics.lastEventReceived;
if (typeof savedAnalytics.reportCount === 'number') reportCount = savedAnalytics.reportCount || 0;

console.log(`📈 Analytics restored: ${messageLog.length} messages, ${subscribers.size} subscribers (from disk)`);
if (lastEventReceived) {
  console.log(`📡 Last event received (persisted): ${new Date(lastEventReceived).toISOString()}`);
}

// Client connections for real-time events (Server-Sent Events)
let sseClients = [];

function broadcastEvent(type, data) {
  const payload = JSON.stringify({ type, data, timestamp: Date.now() });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // Client connection dead
    }
  });
}

// Custom Command Responses Database (in-memory)
let customResponses = {
  'start': 'Welcome to 🤖N0M3RCi! Use /menu to explore features.',
  'help': 'Here are all available commands...',
};

// ─── Telegram API helpers ─────────────────────────────────

async function tgApi(method, params = {}) {
  const url = `${TELEGRAM_API}/${method}`;
  const start = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  syncLatency = Date.now() - start;
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || 'Telegram API error');
  return json.result;
}

async function syncBotInfo() {
  botInfo = await tgApi('getMe');
  // Sync live values from telegram into our persistent state vars
  if (botInfo.first_name) BOT_DISPLAY_NAME = botInfo.first_name;
  return botInfo;
}

async function syncCommands() {
  const tgCmds = await tgApi('getMyCommands');
  commands = tgCmds.map(c => ({
    command: '/' + c.command,
    description: c.description,
    uses: commandUsage[c.command] || 0,
    live: true,
  }));
  return commands;
}

async function syncUpdates() {
  const params = { timeout: 0, limit: 100 };
  if (updateOffset) params.offset = updateOffset;

  let result;
  try {
    result = await tgApi('getUpdates', params);
  } catch (err) {
    // If webhook is active, getUpdates won't work — that's OK
    if (err.message.includes('conflict')) {
      return { newMessages: 0, newUsers: 0 };
    }
    throw err;
  }

  let newMessages = 0;
  let newUsers = 0;

  for (const update of result) {
    updateOffset = update.update_id + 1;
    const msg = update.message || update.edited_message || update.channel_post;
    if (!msg) continue;

    const user = msg.from;
    if (user && !user.is_bot) {
      if (!subscribers.has(user.id)) {
        newUsers++;
      }
      subscribers.set(user.id, {
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        language_code: user.language_code || 'en',
        lastSeen: msg.date * 1000,
      });
    }

    // Track message
    messageLog.push({
      timestamp: msg.date * 1000,
      chatId: msg.chat.id,
      userId: user?.id,
      type: msg.chat.type,
      text: msg.text || '',
    });

    // Track command usage
    if (msg.text && msg.text.startsWith('/')) {
      const cmd = msg.text.split(' ')[0].split('@')[0].replace('/', '');
      commandUsage[cmd] = (commandUsage[cmd] || 0) + 1;
    }

    newMessages++;
  }

  // Keep only last 10000 messages
  if (messageLog.length > 10000) messageLog = messageLog.slice(-10000);

  lastSyncTime = Date.now();
  saveAnalyticsState();
  return { newMessages, newUsers };
}

async function getWebhookInfo() {
  return await tgApi('getWebhookInfo');
}

// ─── Auth middleware ──────────────────────────────────────

function authMiddleware(req, res, next) {
  // Always authorized - bypass password logic completely
  next();
}

// ─── Routes ───────────────────────────────────────────────

// Login
app.post('/api/login', (req, res) => {
  res.json({ success: true, token: 'bypass-no-password' });
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', botConnected: !!botInfo, timestamp: Date.now() });
});

// Ultra-detailed diagnostics (for Railway troubleshooting "no data received")
app.get('/api/diag', (req, res) => {
  const volumeFromEnv = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const volumeMounted = Boolean(volumeFromEnv && fs.existsSync(volumeFromEnv) && PERSIST_DIR === volumeFromEnv);
  const storageUsed = PERSIST_DIR;
  const isUsingPersistentVolume = volumeMounted || /\/app\/storage|\/data|\/mnt\//.test(PERSIST_DIR);
  const analyticsFileExists = fs.existsSync(ANALYTICS_FILE);
  let analyticsFileSize = 0;
  try { analyticsFileSize = fs.statSync(ANALYTICS_FILE).size; } catch (_) {}

  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    environment: {
      railway: !!process.env.RAILWAY_PUBLIC_DOMAIN,
      volumePath: volumeFromEnv || null,
      volumeMounted,
      isUsingPersistentVolume,
      persistDir: storageUsed,
    },
    dataHealth: {
      lastSyncTime,
      lastEventReceived,
      lastEventReceivedAgoMs: lastEventReceived ? (Date.now() - lastEventReceived) : null,
      reportCount,
      messagesInLog: messageLog.length,
      subscribersCount: subscribers.size,
      commandsTracked: Object.keys(commandUsage).length,
      analyticsFileExists,
      analyticsFileSize,
    },
    bot: {
      infoLoaded: !!botInfo,
      username: botInfo?.username || null,
      hasWebhookConfigured: webhookModeDetected,
    },
    sse: {
      connectedClients: sseClients.length,
    },
    ingress: {
      reportEndpoint: '/api/events/report',
      note: 'Bot must be running with correct DASHBOARD_URL or ALSO_REPORT_LOCAL=true (or patched to target your Railway URL) to push real-time events.'
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Debug / recovery route (open because the whole API already uses bypass auth).
// POST /api/debug/reset-analytics  →  completely wipes in-memory + disk analytics
//                                    (subscribers, messageLog, commandUsage, offsets).
// This is useful for:
//   • cleaning test junk (I temporarily inserted a "TestUser" id=12345 while
//     verifying the ingest endpoint worked end-to-end)
//   • recovering from corrupted counts or after many dev tests
//   • starting the metrics over
//
// AFTER you call it, either wait for new natural bot activity or call POST /api/sync
// (or hit the "Force Sync" button in the UI) to re-hydrate basic bot info + recent history.
// The analytics.json will be recreated fresh on disk (volume still keeps the empty file
// across restarts).
//
// Remove or guard this endpoint before giving the dashboard to other people.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/debug/reset-analytics', (req, res) => {
  try {
    subscribers.clear();
    messageLog = [];
    commandUsage = {};
    updateOffset = 0;
    lastSyncTime = null;

    const emptyState = {
      lastSyncTime: null,
      updateOffset: 0,
      commandUsage: {},
      messageLog: [],
      subscribers: {}
    };
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(emptyState, null, 2), 'utf-8');

    // notify any open live dashboard UIs
    try { broadcastEvent('debug', { message: 'analytics reset' }); } catch {}

    console.log('🧹 Analytics wiped via /debug/reset-analytics (file + memory)');
    res.json({ success: true, message: 'Analytics state fully reset. Repopulate via bot messages or /api/sync.' });
  } catch (e) {
    console.error('Failed to reset analytics:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Event Reporting API (For direct bot push updates)
app.post('/api/events/report', (req, res) => {
  const { event, user, chat, message, tokens, model, type } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event name is required' });
  }

  const timestamp = Date.now();
  const isTokenSpendEvent = (event === 'token_spend');

  // === TRACK LIVE INGESTION (helps prove data IS arriving from bot) ===
  lastEventReceived = timestamp;
  reportCount = (reportCount || 0) + 1;

  console.log(`📨 [INGEST] report event="${event}" user=${user?.id || 'anon'}@chat:${chat?.id || '?'} tokens=${tokens || 0} model=${model || 'n/a'} [totalRcvd:${reportCount}]`);

  // 1. Process Subscriber if user details exist
  let isNewUser = false;
  if (user && user.id) {
    if (!subscribers.has(user.id)) {
      isNewUser = true;
    }
    const existingSub = subscribers.get(user.id) || {};
    const messagesCount = (existingSub.messagesCount || 0) + (isTokenSpendEvent ? 0 : 1);

    subscribers.set(user.id, {
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      language_code: user.language_code || 'en',
      lastSeen: timestamp,
      messagesCount,
      tokensUsed: (existingSub.tokensUsed || 0) + (tokens || 0),
    });
  }

  // 2. Process message log if applicable
  if (message) {
    if (isTokenSpendEvent) {
      // Find the most recent message from this user to enrich with tokens and model
      const lastMsg = [...messageLog].reverse().find(m => m.userId === user?.id && (timestamp - m.timestamp < 120000));
      if (lastMsg) {
        lastMsg.tokens = tokens || 0;
        lastMsg.model = model || null;
      } else {
        messageLog.push({
          timestamp,
          chatId: chat?.id,
          userId: user?.id,
          type: type || chat?.type || 'private',
          text: message.text || '',
          tokens: tokens || 0,
          model: model || null,
        });
      }
    } else {
      messageLog.push({
        timestamp,
        chatId: chat?.id,
        userId: user?.id,
        type: type || chat?.type || 'private',
        text: message.text || '',
        tokens: tokens || 0,
        model: model || null,
      });

      if (message.text && message.text.startsWith('/')) {
        const cmd = message.text.split(' ')[0].split('@')[0].replace('/', '');
        commandUsage[cmd] = (commandUsage[cmd] || 0) + 1;
      }
    }
  }

  // Keep only last 10000 messages
  if (messageLog.length > 10000) {
    messageLog = messageLog.slice(-10000);
  }

  lastSyncTime = timestamp;

  // Create event payload for SSE broadcast
  const sseData = {
    event,
    user: user ? {
      id: user.id,
      first_name: user.first_name || '',
      username: user.username || '',
      language_code: user.language_code || 'en'
    } : null,
    chat: chat ? {
      id: chat.id,
      type: type || chat.type || 'private'
    } : null,
    text: message?.text || '',
    tokens: tokens || 0,
    model: model || null,
    isNewUser
  };

  broadcastEvent(event, sseData);

  // Persist + track health immediately after report handling
  saveAnalyticsState();

  // Emit a meta update for UI liveness monitors
  try {
    broadcastEvent('ingest-meta', { lastEventReceived, reportCount });
  } catch {}

  res.json({ success: true, isNewUser });
});

// SSE Event Stream for active dashboard interfaces
app.get('/api/events/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write('retry: 5000\n\n');

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Bot info
app.get('/api/bot', authMiddleware, async (req, res) => {
  try {
    if (!botInfo) await syncBotInfo();
    res.json(botInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full sync
app.post('/api/sync', authMiddleware, async (req, res) => {
  try {
    const start = Date.now();
    await syncBotInfo();
    await syncCommands();
    const { newMessages, newUsers } = await syncUpdates();
    const elapsed = Date.now() - start;

    res.json({
      success: true,
      elapsed,
      latency: syncLatency,
      newMessages,
      newUsers,
      lastSync: lastSyncTime,
      botInfo,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard overview
app.get('/api/overview', authMiddleware, async (req, res) => {
  try {
    if (!botInfo && BOT_TOKEN) await syncBotInfo();

    const now = Date.now();
    const h24 = now - 24 * 60 * 60 * 1000;
    const d30 = now - 30 * 24 * 60 * 60 * 1000;

    const messages30d = messageLog.filter(m => m.timestamp > d30).length;
    const messages24h = messageLog.filter(m => m.timestamp > h24).length;
    const activeMembers24h = new Set(messageLog.filter(m => m.timestamp > h24).map(m => m.userId)).size;
    const newUsers24h = [...subscribers.values()].filter(u => u.lastSeen > h24).length;

    // Calculate week-over-week change
    const w1 = now - 7 * 24 * 60 * 60 * 1000;
    const w2 = w1 - 7 * 24 * 60 * 60 * 1000;
    const thisWeekMsgs = messageLog.filter(m => m.timestamp > w1).length;
    const lastWeekMsgs = messageLog.filter(m => m.timestamp > w2 && m.timestamp <= w1).length;
    const weekChange = lastWeekMsgs > 0 ? (((thisWeekMsgs - lastWeekMsgs) / lastWeekMsgs) * 100).toFixed(1) : '0.0';

    const commandsFired = Object.values(commandUsage).reduce((a, b) => a + b, 0);

    // Group info
    const groupChats = new Set(messageLog.filter(m => m.type === 'group' || m.type === 'supergroup').map(m => m.chatId));

    // Webhook or polling status
    let webhook = { url: '' };
    try {
      webhook = await getWebhookInfo();
    } catch (e) {}

    // Get current Bot Description from Telegram API directly! fall back to persisted creds
    let currentDesc = '';
    try {
      const descObj = await tgApi('getMyDescription');
      currentDesc = descObj.description || '';
    } catch (e) {
      currentDesc = BOT_DESCRIPTION || 'Chat 💬 with the world\'s most powerful ⚡ AI models without leaving Telegram';
    }
    if (!currentDesc && BOT_DESCRIPTION) currentDesc = BOT_DESCRIPTION;

    // Calculate token spend & cost
    const totalTokens = [...subscribers.values()].reduce((sum, u) => sum + (u.tokensUsed || 0), 0);
    const totalEstCost = messageLog.reduce((sum, m) => sum + estimateTokenCost(m.model, m.tokens || 0), 0);

    const recent24hMessages = messageLog.filter(m => m.timestamp > h24);
    const tokens24h = recent24hMessages.reduce((sum, m) => sum + (m.tokens || 0), 0);
    const cost24h = recent24hMessages.reduce((sum, m) => sum + estimateTokenCost(m.model, m.tokens || 0), 0);

    res.json({
      botName: botInfo?.first_name || BOT_DISPLAY_NAME || 'N0M3RCi',
      botUsername: botInfo?.username || '',
      botDescription: currentDesc || BOT_DESCRIPTION || '',
      isOnline: true,
      messages30d,
      messages24h,
      subscribers: subscribers.size,
      commandsFired,
      activeMembers24h,
      newUsers24h,
      weekChange: parseFloat(weekChange),
      groupCount: groupChats.size,
      lastSync: lastSyncTime,
      latency: syncLatency,
      totalTokens,
      totalEstCost,
      tokens24h,
      cost24h,
      // === NEW: Real ingestion health so users & Railway logs can prove the data pipe works ===
      lastEventReceived,
      lastEventAgo: lastEventReceived ? Math.max(0, Math.floor((Date.now() - lastEventReceived) / 1000)) : null,
      reportsReceived: reportCount,
      dataSource: webhook ? (webhook.url ? 'webhook+push-required' : 'polling') : 'unknown',
      ingestedMessages: messages30d,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscribers
app.get('/api/users', authMiddleware, (req, res) => {
  const users = [...subscribers.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  res.json({ total: users.length, users, lastSync: lastSyncTime });
});

// Commands
app.get('/api/commands', authMiddleware, async (req, res) => {
  try {
    if (commands.length === 0) await syncCommands();
    // Merge usage counts
    const merged = commands.map(c => {
      const bareCmd = c.command.replace('/', '');
      return {
        ...c,
        uses: commandUsage[bareCmd] || 0,
        responseTemplate: customResponses[bareCmd] || `Response for ${c.command}`,
      };
    });
    res.json({ total: merged.length, live: merged.filter(c => c.live).length, commands: merged, lastSync: lastSyncTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update/Edit command or save custom response
app.post('/api/commands', authMiddleware, async (req, res) => {
  try {
    const { command, description, responseTemplate } = req.body;
    if (!command) return res.status(400).json({ error: 'Command name required' });

    const bareCmd = command.replace('/', '');

    // Save template locally
    if (responseTemplate !== undefined) {
      customResponses[bareCmd] = responseTemplate;
    }

    // Update command details on Telegram Bot API if description is supplied
    if (description !== undefined) {
      // 1. Fetch current commands list
      const tgCmds = await tgApi('getMyCommands');
      let found = false;
      const updatedList = tgCmds.map(c => {
        if (c.command === bareCmd) {
          found = true;
          return { command: bareCmd, description };
        }
        return c;
      });

      if (!found) {
        updatedList.push({ command: bareCmd, description });
      }

      // 2. Push updated commands list back to Telegram API
      await tgApi('setMyCommands', { commands: updatedList });
      await syncCommands();
    }

    res.json({ success: true, message: 'Command updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a command
app.post('/api/commands/delete', authMiddleware, async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command name required' });

    const bareCmd = command.replace('/', '');

    // Fetch current list
    const tgCmds = await tgApi('getMyCommands');
    const filtered = tgCmds.filter(c => c.command !== bareCmd);

    // Push back
    await tgApi('setMyCommands', { commands: filtered });
    delete customResponses[bareCmd];
    await syncCommands();

    res.json({ success: true, message: 'Command deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Add a new command
app.post('/api/commands/create', authMiddleware, async (req, res) => {
  try {
    const { command, description, responseTemplate } = req.body;
    if (!command || !description) return res.status(400).json({ error: 'Command and description required' });

    const bareCmd = command.replace('/', '');

    // Fetch list
    const tgCmds = await tgApi('getMyCommands');
    if (tgCmds.some(c => c.command === bareCmd)) {
      return res.status(400).json({ error: 'Command already exists' });
    }

    tgCmds.push({ command: bareCmd, description });

    await tgApi('setMyCommands', { commands: tgCmds });
    if (responseTemplate) {
      customResponses[bareCmd] = responseTemplate;
    }

    await syncCommands();
    res.json({ success: true, message: 'Command created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics (message volume)
app.get('/api/analytics', authMiddleware, (req, res) => {
  const now = Date.now();
  const d30 = now - 30 * 24 * 60 * 60 * 1000;
  const recent = messageLog.filter(m => m.timestamp > d30);

  // Group by day
  const daily = {};
  const dailyTokens = {};
  const dailyCost = {};
  for (const msg of recent) {
    const day = new Date(msg.timestamp).toISOString().split('T')[0];
    daily[day] = (daily[day] || 0) + 1;
    dailyTokens[day] = (dailyTokens[day] || 0) + (msg.tokens || 0);
    dailyCost[day] = (dailyCost[day] || 0) + estimateTokenCost(msg.model, msg.tokens || 0);
  }

  // Model breakdown
  const modelBreakdown = {};
  const modelTokens = {};
  const modelCost = {};
  // Language breakdown
  const languageBreakdown = {};

  for (const msg of recent) {
    if (msg.model) {
      modelBreakdown[msg.model] = (modelBreakdown[msg.model] || 0) + 1;
      modelTokens[msg.model] = (modelTokens[msg.model] || 0) + (msg.tokens || 0);
      modelCost[msg.model] = (modelCost[msg.model] || 0) + estimateTokenCost(msg.model, msg.tokens || 0);
    }
  }

  for (const user of subscribers.values()) {
    const lang = user.language_code || 'en';
    languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;
  }

  // Activity log (most recent 50)
  const activity = messageLog.slice(-50).reverse().map(m => {
    const user = subscribers.get(m.userId);
    return {
      timestamp: m.timestamp,
      userId: m.userId,
      username: user?.username || '',
      firstName: user?.first_name || 'User',
      type: m.type,
      text: m.text,
      isCommand: m.text?.startsWith('/') || false,
      command: m.text?.startsWith('/') ? m.text.split(' ')[0] : null,
      tokens: m.tokens || 0,
      model: m.model || null,
      cost: estimateTokenCost(m.model, m.tokens || 0),
    };
  });

  res.json({
    daily,
    dailyTokens,
    dailyCost,
    activity,
    modelBreakdown,
    modelTokens,
    modelCost,
    languageBreakdown,
    totalMessages: messageLog.length,
    lastSync: lastSyncTime,
  });
});

// Settings / connection info
// Tolerate Telegram connection failures so the UI always loads — user can then fix the token via the form.
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    if (!botInfo) {
      try {
        await syncBotInfo();
      } catch (e) {
        console.warn('⚠️  Initial bot sync failed in GET /settings (token may be invalid):', e.message);
        // continue — return what we can (especially the current token) so user can correct it
      }
    }

    let webhook = {};
    try {
      webhook = await getWebhookInfo();
    } catch (e) {}

    // Fetch display description directly — but fall back to permanently persisted value
    let currentDesc = '';
    try {
      const descObj = await tgApi('getMyDescription');
      currentDesc = descObj.description || '';
    } catch (e) {
      currentDesc = BOT_DESCRIPTION || 'Chat 💬 with the world\'s most powerful ⚡ AI models without leaving Telegram';
    }
    if (!currentDesc && BOT_DESCRIPTION) currentDesc = BOT_DESCRIPTION;

    res.json({
      botUsername: botInfo?.username || '',
      botDisplayName: botInfo?.first_name || BOT_DISPLAY_NAME || '',
      botDescription: currentDesc || BOT_DESCRIPTION || '',
      webhookUrl: webhook.url || WEBHOOK_URL || '',
      hasWebhook: !!webhook.url,
      pendingUpdates: webhook.pending_update_count || 0,
      lastError: webhook.last_error_message || '',
      lastErrorDate: webhook.last_error_date || 0,
      latency: syncLatency,
      endpoint: webhook.url ? 'Webhook' : 'Polling',
      botToken: BOT_TOKEN,
    });
  } catch (err) {
    // Last-resort fallback — still surface the token so it can be saved/fixed from UI
    console.warn('GET /api/settings unexpected error:', err.message);
    res.json({
      botUsername: '',
      botDisplayName: BOT_DISPLAY_NAME || '',
      botDescription: BOT_DESCRIPTION || 'Chat 💬 with the world\'s most powerful ⚡ AI models without leaving Telegram',
      webhookUrl: WEBHOOK_URL || '',
      hasWebhook: false,
      pendingUpdates: 0,
      lastError: '',
      lastErrorDate: 0,
      latency: 0,
      endpoint: 'Polling',
      botToken: BOT_TOKEN,
    });
  }
});

// Save settings (Actually updates credentials and pushes changes directly to Telegram API!)
app.post('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { botDisplayName, botDescription, webhookUrl, botToken } = req.body;
    const logs = [];

    // 1. If Token is supplied, update bot credentials and api routing immediately
    if (botToken && botToken !== BOT_TOKEN) {
      BOT_TOKEN = botToken;
      TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
      if (BOT_TOKEN) {
        try { await syncBotInfo(); } catch (_) {}
      }
      logs.push('Bot Token updated (will take effect on next operations)');

      // If we have saved display info from prior saves, apply them immediately when we now have a token
      if (BOT_TOKEN && BOT_DISPLAY_NAME) {
        try {
          await tgApi('setMyName', { name: BOT_DISPLAY_NAME });
          if (botInfo) botInfo.first_name = BOT_DISPLAY_NAME;
          logs.push(`Display name re-applied from saved: ${BOT_DISPLAY_NAME}`);
        } catch (e) { logs.push('Note: display re-apply will occur when token is live'); }
      }
      if (BOT_TOKEN && BOT_DESCRIPTION) {
        try {
          await tgApi('setMyDescription', { description: BOT_DESCRIPTION });
          logs.push('Bot description re-applied from saved');
        } catch (e) {}
      }
    }

    // 2. Update Display Name on Telegram Bot API (guarded so save always succeeds to persist creds)
    if (botDisplayName) {
      const curr = (botInfo && botInfo.first_name) || BOT_DISPLAY_NAME;
      if (botDisplayName !== curr) {
        if (BOT_TOKEN) {
          try {
            await tgApi('setMyName', { name: botDisplayName });
            if (botInfo) botInfo.first_name = botDisplayName;
            logs.push(`Display name updated on Telegram to: ${botDisplayName}`);
          } catch (e) {
            logs.push(`Display name saved locally (will sync on valid token): ${botDisplayName}`);
          }
        } else {
          logs.push(`Display name saved (applied to bot on token connect): ${botDisplayName}`);
        }
        BOT_DISPLAY_NAME = botDisplayName;
      }
    }

    // 3. Update Description on Telegram Bot API (guarded)
    if (botDescription) {
      if (BOT_TOKEN) {
        try {
          await tgApi('setMyDescription', { description: botDescription });
          logs.push('Bot Description updated on Telegram');
        } catch (e) {
          logs.push('Description saved locally (will sync on valid token)');
        }
      } else {
        logs.push('Description saved (applied to bot on token connect)');
      }
      BOT_DESCRIPTION = botDescription;
    }

    // 4. Update Webhook URL (guarded for tg calls)
    if (webhookUrl !== undefined) {
      WEBHOOK_URL = webhookUrl || '';
      if (BOT_TOKEN && webhookUrl !== undefined) {
        let currentWebhook = '';
        try {
          const info = await getWebhookInfo();
          currentWebhook = info.url || '';
        } catch (e) {}

        if (webhookUrl !== currentWebhook) {
          try {
            if (webhookUrl) {
              await tgApi('setWebhook', { url: webhookUrl });
              logs.push(`Webhook set on Telegram to: ${webhookUrl}`);
            } else {
              await tgApi('deleteWebhook');
              logs.push('Webhook deleted on Telegram; switched to Polling');
            }
          } catch (e) {
            logs.push('Webhook URL saved; will activate on valid bot token');
          }
        }
      }
    }

    // ALWAYS persist to disk (the primary reason they must be "permanent" now)
    // Even if token absent, or tg calls skipped/fail, the entered name/desc stick.
    saveSettings({
      botToken: BOT_TOKEN,
      botDisplayName: BOT_DISPLAY_NAME || botDisplayName,
      botDescription: BOT_DESCRIPTION || botDescription,
      webhookUrl: WEBHOOK_URL || webhookUrl || '',
    });

    res.json({ success: true, logs, botInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test connection
app.post('/api/test-connection', authMiddleware, async (req, res) => {
  try {
    const start = Date.now();
    const info = await tgApi('getMe');
    const latency = Date.now() - start;
    res.json({ success: true, latency, bot: info });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── Serve Static Files (Production) ───────────────────────

// In production, serve the built Vite static files from the 'dist' directory
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// For client-side routing (React Router), serve index.html for any unknown requests (except API requests)
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // If index.html is missing (e.g., local development), pass to next handler
      next();
    }
  });
});

// ─── Start ────────────────────────────────────────────────

const PORT = process.env.PORT || process.env.API_PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  const shownHost = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`;
  console.log(`🚀 Dashboard API on ${shownHost}`);

  // Initial sync on startup (non-blocking)
  syncBotInfo().then(() => {
    console.log(`✅ Bot connected: @${botInfo.username} (${botInfo.first_name})`);
    return syncCommands();
  }).then(() => {
    console.log(`✅ ${commands.length} commands synced`);
    return syncUpdates();
  }).then(r => {
    console.log(`✅ Initial sync: ${r.newMessages} messages, ${r.newUsers} users`);
  }).catch(err => {
    console.warn(`⚠️  Could not connect to Telegram: ${err.message}`);
  });
});

// Keep process alive
server.on('error', (err) => {
  console.error('Server error:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message || err);
});
