/* hiaOS — Ollama Cloud API client (runs in the browser, Bearer-key auth).
   Default host is https://ollama.com which exposes the same /api/* surface as a
   local Ollama. The base URL is user-configurable so a CORS proxy can be slotted
   in if a network ever blocks direct browser calls. */
window.HIA = window.HIA || {};
(function () {
  // A few known cloud-hosted models, offered as quick picks during setup.
  const PRESETS = [
    'gpt-oss:120b', 'gpt-oss:20b', 'deepseek-v3.1:671b',
    'qwen3-coder:480b', 'kimi-k2:1t', 'glm-4.6'
  ];

  function base() {
    return (HIA.store.get('baseUrl') || 'https://ollama.com').replace(/\/+$/, '');
  }
  function key() { return HIA.store.get('apiKey') || ''; }
  function model() { return HIA.store.get('model') || ''; }
  function headers() {
    const h = { 'Content-Type': 'application/json' };
    const k = key();
    if (k) h['Authorization'] = 'Bearer ' + k;
    return h;
  }

  // Turn a thrown fetch error into something human (CORS/offline look the same).
  function netErr(err) {
    const m = String((err && err.message) || err);
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) {
      return 'Could not reach the Ollama endpoint. Check your connection, the API key, ' +
             'and the base URL in Settings (CORS may require a proxy URL).';
    }
    return m;
  }

  async function listModels() {
    try {
      const res = await fetch(base() + '/api/tags', { headers: headers() });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return { ok: false, error: 'Ollama ' + res.status + (t ? ': ' + t.slice(0, 160) : ''), models: [] };
      }
      const data = await res.json();
      const models = (data.models || []).map((m) => m.name).filter(Boolean);
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: netErr(err), models: [] };
    }
  }

  // One-shot, non-streaming. `json:true` asks the model for strict JSON.
  async function generate({ messages, model: mdl, json, temperature }) {
    try {
      const body = {
        model: mdl || model(),
        messages,
        stream: false,
        options: { temperature: temperature == null ? 0.7 : temperature }
      };
      if (json) body.format = 'json';
      const res = await fetch(base() + '/api/chat', {
        method: 'POST', headers: headers(), body: JSON.stringify(body)
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return { ok: false, error: 'Ollama ' + res.status + (t ? ': ' + t.slice(0, 200) : ''), content: '' };
      }
      const data = await res.json();
      return { ok: true, content: (data.message && data.message.content) || '' };
    } catch (err) {
      return { ok: false, error: netErr(err), content: '' };
    }
  }

  // Streaming chat. onChunk(deltaText, fullText). Returns {ok, content, error}.
  async function chat({ messages, model: mdl, onChunk, signal, temperature }) {
    let full = '';
    try {
      const res = await fetch(base() + '/api/chat', {
        method: 'POST',
        headers: headers(),
        signal,
        body: JSON.stringify({
          model: mdl || model(),
          messages,
          stream: true,
          options: { temperature: temperature == null ? 0.8 : temperature }
        })
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => '');
        return { ok: false, error: 'Ollama ' + res.status + (t ? ': ' + t.slice(0, 200) : '') };
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          try {
            const j = JSON.parse(line);
            const piece = j.message && j.message.content;
            if (piece) { full += piece; onChunk && onChunk(piece, full); }
          } catch { /* partial line */ }
        }
      }
      return { ok: true, content: full };
    } catch (err) {
      if (err && err.name === 'AbortError') return { ok: true, content: full, aborted: true };
      return { ok: false, error: netErr(err), content: full };
    }
  }

  HIA.ollama = { PRESETS, base, key, model, listModels, generate, chat };
})();
