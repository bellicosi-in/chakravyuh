# Chakravyuh Sync Countdown

A self-hosted, synchronized 50-hour countdown with **Pause/Resume/Reset** that stays in sync across devices. Uses a tiny Node.js server with **Server-Sent Events (SSE)** so if you pause on your laptop, your tablet updates instantly.

## Quick Start (no Docker)

```bash
# 1) Copy these files to your server (Linux/macOS/WSL)
cd chakravyuh-sync
npm install
node server.js
```

Then open http://YOUR-SERVER:8080 from any device on the same network (or expose the port on the internet).

State is stored in `state.json` next to `server.js` so it survives restarts.

## With Docker

```bash
cd chakravyuh-sync
docker compose up --build -d
```

Open http://YOUR-SERVER:8080

## Controls

- **Pause** — freezes the countdown. All connected devices stop immediately.
- **Resume** — continues the countdown from the remaining time.
- **Reset** — resets to 50 hours (you can pass `?hours=H` to `/api/reset` to use a different span).

## API (optional)

- `GET /api/state` → current state JSON
- `GET /api/events` → SSE stream; emits `state` events on change
- `POST /api/pause` → pause
- `POST /api/resume` → resume
- `POST /api/reset` → reset to 50 hours (accepts `?hours=NUMBER`)
- `POST /api/set` → set absolute `endMs` (JSON: `{ "endMs": 1730000000000 }`)

## Security (optional)

This demo does **not** include authentication. If you expose it publicly, consider adding a reverse proxy with an allow-list or basic auth, or extend `server.js` to require a shared secret for `POST` routes.
