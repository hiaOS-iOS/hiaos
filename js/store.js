/* hiaOS — persistent state in localStorage (single object, debounced writes). */
window.HIA = window.HIA || {};
(function () {
  const KEY = 'hiaos-ios-state-v1';
  const DEFAULTS = {
    apiKey: '',
    baseUrl: 'https://ollama.com',
    model: '',
    userName: '',
    accent: '#0a84ff',
    accent2: '#bf5af2',
    setupDone: false,
    chat: [],            // hia conversation: [{role, content}]
    notes: [],           // [{id, title, body, updated}]
    files: {},           // {name: content}
    prefs: {}
  };

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch { return Object.assign({}, DEFAULTS); }
  }

  let state = load();
  let timer = null;

  function save() {
    clearTimeout(timer);
    timer = setTimeout(saveNow, 160);
  }
  function saveNow() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  HIA.store = {
    get s() { return state; },
    get(k) { return state[k]; },
    set(k, v) { state[k] = v; save(); return v; },
    update(fn) { fn(state); save(); },
    save, saveNow,
    reset() { state = Object.assign({}, DEFAULTS); saveNow(); }
  };
})();
