import express from 'express';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

// In-memory event store
const events = [];
const EVENT_LIMIT = 1000;
const METRICS = {
  botName: 'N0M3RCi',
  botUsername: 'KwameJr_bot',
  botDescription: 'Connect any OpenAI-compatible API to Telegram',
  messages30d: 0,
  messages24h: 0,
  subscribers: 0,
  commandsFired: 0,
  activeMembers24h: 0,
  newUsers24h: 0,
  groupCount: 0,
  latency: 32,
  totalTokens: 0,
  reportsReceived: 0,
  lastEventReceived: null,
  totalEstCost: 0,
  cycles: {
    messages: 0,
    subscribers: 0,
    commands: 0,
    newUsers: 0,
  },
};

// SSE clients
const sseClients = new Set();

// Serve static files from the built Vite output
app.use(express.static(join(__dirname, 'dist'), {
  index: false,
  extensions: ['html'],
}));

// API: receive event report from bot
app.post('/api/events/report', (req, res) => {
  const body = req.body || {};
  const ts = Date.now();

  const event = {
    type: body.type || 'message',
    data: {
      ...body.data,
      timestamp: ts,
    },
    receivedAt: ts,
  };

  events.push(event);
  if (events.length > EVENT_LIMIT) events.shift();

  METRICS.lastEventReceived = ts;
  METRICS.reportsReceived++;

  if (body.data?.tokens) {
    METRICS.totalTokens += body.data.tokens;
    METRICS.totalEstCost = METRICS.totalTokens * 0.000002;
  }

  // Broadcast to all SSE clients
  const payload = JSON.stringify({ type: event.type, data: event.data });
  for (const client of sseClients) {
    try {
      client.write(`event: ${event.type}\ndata: ${payload}\n\n`);
      client.write(`event: ingest-meta\ndata: ${JSON.stringify({ lastEventReceived: METRICS.lastEventReceived, reportCount: METRICS.reportsReceived, cycles: METRICS.cycles })}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }

  res.json({ ok: true });
});

// API: overview
app.get('/api/overview', (req, res) => {
  res.json(METRICS);
});

// API: SSE stream
app.get('/api/events/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connect event
  res.write(`event: connected\ndata: {}\n\n`);

  sseClients.add(res);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// API: sync (mocked)
app.post('/api/sync', async (req, res) => {
  res.json({ newMessages: 0, newUsers: 0, elapsed: 12 });
});

// Serve SPA for all other routes (catch-all via middleware)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  readFile(join(__dirname, 'dist', 'index.html'), 'utf-8').then(html => {
    res.send(html);
  }).catch(() => {
    res.status(404).send('Not found');
  });
});

app.listen(PORT, () => {
  console.log(`Dashboard server running on port ${PORT}`);
});