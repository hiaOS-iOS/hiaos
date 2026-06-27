/* hiaOS — CORS proxy for Ollama Cloud (Cloudflare Worker).

   Browsers can't call https://ollama.com/api/* directly: that API does not send
   CORS headers, so Safari/Chrome block the cross-origin request. This Worker
   forwards every request to ollama.com and adds the CORS headers a PWA needs.

   Deploy it (see proxy/README.md), then in hiaOS open
   Settings → Model & connection → Base URL and paste your Worker URL, e.g.
   https://hiaos.<your-subdomain>.workers.dev

   Your Ollama API key is still sent by the app as an Authorization: Bearer
   header and only passes through your own Worker — never a third party. */

const ORIGIN = 'https://ollama.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request) {
    // Preflight
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);

    // Forward only the headers Ollama needs (drop Host/Origin/etc.)
    const headers = new Headers();
    const auth = request.headers.get('Authorization');
    if (auth) headers.set('Authorization', auth);
    const ct = request.headers.get('Content-Type');
    if (ct) headers.set('Content-Type', ct);

    const init = { method: request.method, headers };
    if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.text();

    const upstream = await fetch(ORIGIN + url.pathname + url.search, init);

    // Pass the (streaming) body straight through, with CORS added.
    const out = new Headers(upstream.headers);
    for (const k in CORS) out.set(k, CORS[k]);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  }
};
