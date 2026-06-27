/* hiaOS — persistent state in localStorage (single object, debounced writes).
   Also the export/import surface used when moving between OS versions/origins. */
window.HIA = window.HIA || {};
(function () {
  const KEY = 'hiaos-ios-state-v1';
  const VERSION = 2;
  const DEFAULTS = {
    version: VERSION,
    apiKey: '',
    baseUrl: 'https://ollama.com',
    model: '',
    userName: '',
    accent: '#0a84ff',
    accent2: '#bf5af2',
    setupDone: false,
    conversations: [],   // [{id, title, messages:[{role,content}], updated}]
    currentConvo: '',
    notes: [],           // [{id, title, body, updated}]
    files: {},           // {name: content}
    customApps: [],      // [{id, name, icon, accent, split, html, prompt, updated}]
    chat: [],            // legacy single conversation (migrated into conversations)
    prefs: {
      reduceMotion: false,
      contrast: false,
      uiScale: 1,
      wallpaper: 'aurora',  // aurora | mesh | minimal | mono
      blur: 26,
      temperature: 0.8,
      personality: '',
      sounds: true
    }
  };

  function migrate(s) {
    // Old single chat array → a conversation.
    if (Array.isArray(s.chat) && s.chat.length && (!s.conversations || !s.conversations.length)) {
      const id = 'c' + Date.now();
      s.conversations = [{ id, title: 'Chat', messages: s.chat.slice(), updated: Date.now() }];
      s.currentConvo = id;
    }
    s.chat = [];
    s.version = VERSION;
    return s;
  }

  function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { saved = {}; }
    const s = Object.assign({}, DEFAULTS, saved);
    s.prefs = Object.assign({}, DEFAULTS.prefs, saved.prefs || {});
    return migrate(s);
  }

  let state = load();
  let timer = null;

  function save() { clearTimeout(timer); timer = setTimeout(saveNow, 160); }
  function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota */ } }

  HIA.store = {
    get s() { return state; },
    get(k) { return state[k]; },
    set(k, v) { state[k] = v; save(); return v; },
    pref(k) { return state.prefs[k]; },
    setPref(k, v) { state.prefs[k] = v; save(); return v; },
    update(fn) { fn(state); save(); },
    save, saveNow,
    reset() { state = JSON.parse(JSON.stringify(DEFAULTS)); saveNow(); },
    // --- export / import (carry data across versions or origins) ---
    exportObj() { return Object.assign({ _hiaos: 'export', _v: VERSION, _at: Date.now() }, state); },
    importObj(obj, mode) {
      if (!obj || typeof obj !== 'object') return false;
      const clean = Object.assign({}, obj); delete clean._hiaos; delete clean._v; delete clean._at;
      if (mode === 'merge') {
        // append collections, keep existing scalars unless empty
        const cur = state;
        ['notes', 'conversations', 'customApps'].forEach((k) => {
          if (Array.isArray(clean[k])) cur[k] = (cur[k] || []).concat(clean[k]);
        });
        if (clean.files) cur.files = Object.assign({}, clean.files, cur.files);
        ['apiKey', 'baseUrl', 'model', 'userName'].forEach((k) => { if (!cur[k] && clean[k]) cur[k] = clean[k]; });
        cur.prefs = Object.assign({}, DEFAULTS.prefs, clean.prefs || {}, cur.prefs);
      } else {
        state = Object.assign({}, DEFAULTS, clean);
        state.prefs = Object.assign({}, DEFAULTS.prefs, clean.prefs || {});
        migrate(state);
      }
      saveNow();
      return true;
    }
  };
})();
