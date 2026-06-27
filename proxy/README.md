# hiaOS CORS proxy (Cloudflare Worker)

A browser PWA can't call `https://ollama.com/api/*` directly — that API doesn't
return CORS headers, so Safari/Chrome block it. (The official Python/CLI clients
work because they run *server-side*, where CORS doesn't apply.)

This 30-line Worker forwards every request to `ollama.com` and adds the CORS
headers. Your Ollama API key is sent by the app as a `Bearer` header and only
passes through **your own** Worker — never a third party.

## Deploy in ~2 minutes

### Option A — Dashboard (no tools)
1. Go to **dash.cloudflare.com → Workers & Pages → Create → Worker**.
2. Name it `hiaos`, click **Deploy**, then **Edit code**.
3. Paste the contents of [`cloudflare-worker.js`](cloudflare-worker.js) and **Deploy**.
4. Copy the URL, e.g. `https://hiaos.<your-subdomain>.workers.dev`.

### Option B — Wrangler CLI
```bash
cd proxy
npx wrangler deploy
```

## Point hiaOS at it
In hiaOS: **Settings → Model & connection → Base URL** → paste your Worker URL.
Done — chat will stream through your proxy.

> Want to lock it down? In the Worker you can also pin a single allowed origin
> (replace `*` in `Access-Control-Allow-Origin` with your Pages URL), or even
> store the API key as a Worker secret and inject it server-side so it never
> leaves Cloudflare.
