const fs = require('fs');
const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 8080;
const SAVE_DIR = process.env.STATE_DIR || path.join(__dirname);
const STATE_FILE = path.join(SAVE_DIR, 'state.json');

const app = express();
app.use(express.json());

// Serve static front-end
app.use(express.static(path.join(__dirname, 'public')));

// --- State management ---
function defaultState() {
  const now = Date.now();
  return {
    version: 1,
    paused: false,
    endMs: now + 50 * 60 * 60 * 1000, // 50 hours from first launch
    remaining: null,
    updatedAt: now
  };
}

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const s = JSON.parse(raw);
    if (typeof s.endMs !== 'number') throw new Error('Invalid state');
    return s;
  } catch (e) {
    const s = defaultState();
    saveState(s);
    return s;
  }
}

function saveState(s) {
  s.updatedAt = Date.now();
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

let state = loadState();

// --- SSE clients ---
const clients = new Set();
function broadcast() {
  const payload = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

app.get('/api/state', (req, res) => {
  res.json(state);
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Immediately send current state
  res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);

  clients.add(res);

  // Heartbeat to keep connections alive
  const hb = setInterval(() => {
    res.write(`: keep-alive ${Date.now()}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(hb);
    clients.delete(res);
  });
});

app.post('/api/pause', (req, res) => {
  const now = Date.now();
  const remaining = Math.max(0, Math.floor((state.endMs - now) / 1000));
  state.paused = true;
  state.remaining = remaining;
  saveState(state);
  broadcast();
  res.json({ ok: true, state });
});

app.post('/api/resume', (req, res) => {
  const now = Date.now();
  const remaining = typeof state.remaining === 'number' ? state.remaining : Math.max(0, Math.floor((state.endMs - now) / 1000));
  state.paused = false;
  state.endMs = now + remaining * 1000;
  state.remaining = null;
  saveState(state);
  broadcast();
  res.json({ ok: true, state });
});

app.post('/api/reset', (req, res) => {
  const hours = Number(req.query.hours || 50);
  const now = Date.now();
  state.paused = false;
  state.endMs = now + hours * 60 * 60 * 1000;
  state.remaining = null;
  saveState(state);
  broadcast();
  res.json({ ok: true, state });
});

// Optional: set an absolute endMs (e.g., admin tool)
app.post('/api/set', (req, res) => {
  const endMs = Number(req.body?.endMs);
  if (!Number.isFinite(endMs)) {
    return res.status(400).json({ ok: false, error: 'endMs must be a number (ms since epoch)' });
  }
  state.paused = false;
  state.endMs = endMs;
  state.remaining = null;
  saveState(state);
  broadcast();
  res.json({ ok: true, state });
});

app.listen(PORT, () => {
  console.log(`Chakravyuh sync server running on http://localhost:${PORT}`);
});
