# hiaOS for iPhone

A **pocket operating system** for iPhone, delivered as an installable **PWA** and
composed around **Ollama Cloud**. It's the iOS reimagining of
[hiaOS](https://github.com/) — same liquid-glass soul, rebuilt for one hand and a
tall screen.

<p align="center"><img src="icons/icon-512.png" width="120" alt="hiaOS icon"></p>

## What makes it iPhone-native

- **Vertical app stack** — open **one app full-screen**, or **two stacked
  vertically** (top / bottom). Each app declares whether it supports the split:
  splittable apps (hia, Ask, Notes, Translate, Calculator, Clock, Files) can share
  the screen; full-screen-only apps (Sketch, Settings) always take over. Opening a
  third app drops the oldest.
- **Left-edge taskbar** — hidden by default. **Swipe in from the left edge** (or
  tap the pull-handle) to reveal the **rail**. Tap the **EXPAND** button and the
  bar animates across to the other side of the screen into a full **launchpad** of
  every app, with a buttery spring + staggered tiles.
- **Ollama Cloud** — paste your API key on first launch, pick a model, done. No
  local server needed. Streams replies live.
- **Liquid glass everywhere** — animated wallpaper, floating colour blobs,
  `backdrop-filter` panels, safe-area aware, tuned for the notch and home
  indicator.
- **Installable** — Add to Home Screen and it runs full-screen as a standalone app
  with its own icon, offline shell (service worker), and portrait lock.

## Apps

| App | Split? | What it does |
|-----|:-----:|--------------|
| **hia** | ✅ | Streaming AI chat with full conversation memory |
| **Ask** | ✅ | One-shot question → one answer |
| **Notes** | ✅ | Notes with AI Summarize / Improve / Expand |
| **Translate** | ✅ | Translate text into 10 languages |
| **Calculator** | ✅ | Order-of-operations calc (no `eval`) |
| **Clock** | ✅ | Timer + stopwatch with laps & a beep |
| **Files** | ✅ | Local text files |
| **Sketch** | ⬜ | Finger drawing on canvas (full-screen) |
| **Settings** | ⬜ | Model, key, accent theme, data (full-screen) |

## Setup

1. Get an API key at **[ollama.com](https://ollama.com)** → *Settings → Keys*.
2. Open the app, paste the key, and choose a cloud model (e.g. `gpt-oss:120b`,
   `deepseek-v3.1:671b`, `qwen3-coder:480b`). The key stays on your device.

## Install on your iPhone

1. Open the deployed URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the home screen — it opens full-screen, no browser chrome.

> A PWA must be served over **HTTPS** to install. The simplest route is **GitHub
> Pages** (Settings → Pages → deploy from `main`).

## Run locally

It's a fully static site — any static server works:

```bash
npx http-server . -p 5610 -c-1
# then open http://localhost:5610
```

## A note on CORS

Calls go straight from the browser to `https://ollama.com/api/*` with your bearer
key. If a network blocks cross-origin calls, set a **Base URL** (Settings →
Model & connection) pointing at a small CORS proxy that forwards to Ollama.

## Tech

Vanilla JS, no build step, no dependencies. `js/ollama.js` is the API client,
`js/shell.js` is the stack manager + taskbar, `js/apps.js` is every app.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
