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

## Already have a Python/Flask server? (key injected server-side)

If you run a Flask service (e.g. on Render) you can add these two routes instead
of deploying anything new — and have the **server hold the key** so the app sends
none. Requires `flask-cors` (`CORS(app)`):

```python
import os, requests
from flask import request, Response, stream_with_context
KEY = os.environ["OLLAMA_API_KEY"]            # already set in your dashboard

@app.route("/api/chat", methods=["POST"])
def hiaos_chat():
    up = requests.post("https://ollama.com/api/chat",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"},
        data=request.get_data(), stream=True, timeout=300)
    return Response(stream_with_context(up.iter_content(None)),
                    status=up.status_code,
                    content_type=up.headers.get("Content-Type", "application/x-ndjson"))

@app.route("/api/tags")
def hiaos_tags():
    up = requests.get("https://ollama.com/api/tags",
        headers={"Authorization": f"Bearer {KEY}"}, timeout=60)
    return Response(up.content, status=up.status_code,
                    content_type=up.headers.get("Content-Type", "application/json"))
```

Then in hiaOS set **Base URL** to your server (e.g.
`https://your-app.onrender.com`) and **leave the API key blank**.

> Streaming gotcha on gunicorn: the default 30s worker timeout can cut long
> replies. Use `gunicorn server:app --worker-class gthread --threads 4 --timeout 300`.
> On Render's free tier the service also cold-starts (~30–60s) after idle.

> Want to lock it down? In the Worker you can also pin a single allowed origin
> (replace `*` in `Access-Control-Allow-Origin` with your Pages URL), or even
> store the API key as a Worker secret and inject it server-side so it never
> leaves Cloudflare.
