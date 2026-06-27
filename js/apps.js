/* hiaOS — app registry. Each app declares `split` (true = can live in a half-
   height stacked slot; false = always takes the full screen). build(body, ctx)
   mounts the app; ctx = { id, name, close(), toggleFull(), addCleanup(fn) }.
   UI helpers (HIA.ui.*) are defined in shell.js and exist by the time builders
   run. */
window.HIA = window.HIA || {};
(function () {
  const S = () => HIA.store;
  const O = () => HIA.ollama;
  let el, mdLite, toast, esc;
  function bind() { ({ el, mdLite, toast, esc } = HIA.ui); } // resolved at build time

  function needsModel() {
    if (!S().get('apiKey') || !S().get('model')) {
      toast('Add your Ollama key & model in Settings first');
      return true;
    }
    return false;
  }
  function persona() {
    const name = S().get('userName');
    return 'You are hia, the helpful assistant living inside hiaOS, a pocket operating ' +
      'system on iPhone. Be warm, concise and practical. Use light Markdown.' +
      (name ? ' The user\'s name is ' + name + '.' : '');
  }

  /* ============================ hia (chat) ============================ */
  function buildChat(body, ctx) {
    bind();
    body.classList.add('app-chat');
    const log = el('div', { className: 'chat-log' });
    const row = el('form', { className: 'chat-input' });
    const clear = el('button', { className: 'ci-icon', type: 'button', title: 'New chat', html: HIA.icon('trash') });
    const ta = el('textarea', { className: 'ci-text', rows: 1, placeholder: 'Message hia…' });
    const send = el('button', { className: 'ci-send', type: 'submit', html: HIA.icon('send') });
    row.append(clear, ta, send);
    body.append(log, row);

    let controller = null;
    const msgs = () => S().s.chat;

    function render() {
      log.innerHTML = '';
      if (!msgs().length) {
        log.append(el('div', { className: 'chat-empty', html:
          HIA.icon('orbit') + '<p>Ask me anything, or tell hiaOS what to do.</p>' }));
      }
      msgs().forEach((m) => {
        const b = el('div', { className: 'bubble ' + m.role });
        b.innerHTML = m.role === 'user' ? esc(m.content) : mdLite(m.content);
        log.append(b);
      });
      log.scrollTop = log.scrollHeight;
    }
    function setSending(on) {
      send.innerHTML = on ? HIA.icon('stop') : HIA.icon('send');
      send.classList.toggle('stopping', on);
    }

    async function submit(e) {
      e && e.preventDefault();
      if (controller) { controller.abort(); controller = null; setSending(false); return; }
      const text = ta.value.trim();
      if (!text) return;
      if (needsModel()) return;
      S().update((s) => s.chat.push({ role: 'user', content: text }));
      ta.value = ''; autoGrow();
      render();
      const live = el('div', { className: 'bubble assistant' });
      live.innerHTML = '<span class="cursor">▍</span>';
      log.append(live); log.scrollTop = log.scrollHeight;
      controller = new AbortController();
      setSending(true);
      const messages = [{ role: 'system', content: persona() }].concat(msgs());
      const res = await O().chat({
        messages, signal: controller.signal,
        onChunk: (_d, full) => { live.innerHTML = mdLite(full) + '<span class="cursor">▍</span>'; log.scrollTop = log.scrollHeight; }
      });
      controller = null; setSending(false);
      if (!res.ok) { live.innerHTML = '<span class="err">' + esc(res.error) + '</span>'; return; }
      if (res.content) S().update((s) => s.chat.push({ role: 'assistant', content: res.content }));
      render();
    }

    function autoGrow() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; }
    ta.addEventListener('input', autoGrow);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
    row.addEventListener('submit', submit);
    clear.addEventListener('click', () => { S().update((s) => s.chat = []); render(); });
    ctx.addCleanup(() => controller && controller.abort());
    render();
  }

  /* ============================ Ask (one-shot) ============================ */
  function buildAsk(body, ctx) {
    bind();
    body.classList.add('app-pad');
    const ta = el('textarea', { className: 'field area', placeholder: 'Ask one thing — get one answer…', rows: 3 });
    const go = el('button', { className: 'btn block', html: HIA.icon('sparkles') + 'Ask' });
    const out = el('div', { className: 'ask-out md' });
    body.append(ta, go, out);
    let controller = null;
    go.addEventListener('click', async () => {
      if (controller) { controller.abort(); controller = null; go.innerHTML = HIA.icon('sparkles') + 'Ask'; return; }
      const q = ta.value.trim(); if (!q) return; if (needsModel()) return;
      out.innerHTML = '<span class="cursor">▍</span>';
      controller = new AbortController(); go.innerHTML = HIA.icon('stop') + 'Stop';
      const res = await O().chat({
        messages: [{ role: 'system', content: persona() }, { role: 'user', content: q }],
        signal: controller.signal,
        onChunk: (_d, full) => { out.innerHTML = mdLite(full); }
      });
      controller = null; go.innerHTML = HIA.icon('sparkles') + 'Ask';
      if (!res.ok) out.innerHTML = '<span class="err">' + esc(res.error) + '</span>';
    });
    ctx.addCleanup(() => controller && controller.abort());
  }

  /* ============================ Notes ============================ */
  function buildNotes(body, ctx) {
    bind();
    body.classList.add('app-pad', 'app-notes');
    let editing = null; // note id or null = list
    function notes() { return S().s.notes; }
    function find(id) { return notes().find((n) => n.id === id); }

    function renderList() {
      body.innerHTML = '';
      const head = el('div', { className: 'app-head' });
      head.append(el('h2', { text: 'Notes' }),
        el('button', { className: 'btn small', html: HIA.icon('plus') + 'New', onclick: newNote }));
      body.append(head);
      if (!notes().length) { body.append(el('p', { className: 'muted', text: 'No notes yet. Tap New to start.' })); return; }
      const list = el('div', { className: 'list' });
      notes().slice().sort((a, b) => b.updated - a.updated).forEach((n) => {
        const item = el('button', { className: 'list-item', onclick: () => { editing = n.id; renderEditor(); } });
        item.append(el('div', { className: 'li-main' },
          el('div', { className: 'li-title', text: n.title || 'Untitled' }),
          el('div', { className: 'li-sub', text: (n.body || '').slice(0, 80) || 'Empty' })));
        item.append(el('span', { className: 'li-chev', html: HIA.icon('chevron') }));
        list.append(item);
      });
      body.append(list);
    }
    function newNote() {
      const n = { id: 'n' + Date.now(), title: '', body: '', updated: Date.now() };
      S().update((s) => s.notes.push(n)); editing = n.id; renderEditor();
    }
    function renderEditor() {
      const n = find(editing); if (!n) { editing = null; return renderList(); }
      body.innerHTML = '';
      const head = el('div', { className: 'app-head' });
      head.append(el('button', { className: 'btn ghost small', html: HIA.icon('chevron', 'flip') + 'Back', onclick: () => { editing = null; renderList(); } }));
      head.append(el('span', { className: 'spacer' }));
      head.append(el('button', { className: 'btn ghost small danger', html: HIA.icon('trash'), onclick: () => {
        S().update((s) => s.notes = s.notes.filter((x) => x.id !== n.id)); editing = null; renderList();
      } }));
      body.append(head);
      const title = el('input', { className: 'field', value: n.title, placeholder: 'Title' });
      const area = el('textarea', { className: 'field area grow', placeholder: 'Write…' });
      area.value = n.body;
      title.addEventListener('input', () => { n.title = title.value; n.updated = Date.now(); S().save(); });
      area.addEventListener('input', () => { n.body = area.value; n.updated = Date.now(); S().save(); });
      const ai = el('div', { className: 'chip-row' });
      [['Summarize', 'Summarize the note in 3 concise bullet points.'],
       ['Improve', 'Rewrite the note to be clearer and better organised. Keep the meaning. Return only the rewritten note.'],
       ['Expand', 'Expand the note with helpful detail and structure. Return only the expanded note.']]
        .forEach(([label, sys]) => ai.append(el('button', {
          className: 'chip', text: label, onclick: () => runAI(sys, label, area, n)
        })));
      body.append(ai, title, area);
    }
    async function runAI(sys, label, area, n) {
      if (needsModel()) return;
      const t = toast(label + '…', true);
      const res = await O().generate({ messages: [
        { role: 'system', content: sys }, { role: 'user', content: area.value || '(empty note)' }] });
      t.remove();
      if (!res.ok) return toast(res.error);
      if (label === 'Summarize') area.value = res.content + '\n\n---\n' + area.value;
      else area.value = res.content;
      n.body = area.value; n.updated = Date.now(); S().save();
    }
    renderList();
  }

  /* ============================ Translate ============================ */
  function buildTranslate(body, ctx) {
    bind();
    body.classList.add('app-pad');
    const langs = ['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi'];
    let target = langs[0];
    const ta = el('textarea', { className: 'field area', placeholder: 'Text to translate…', rows: 3 });
    const chips = el('div', { className: 'chip-row wrap' });
    langs.forEach((l) => {
      const c = el('button', { className: 'chip' + (l === target ? ' on' : ''), text: l, onclick: () => {
        target = l; chips.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x.textContent === l));
      } });
      chips.append(c);
    });
    const go = el('button', { className: 'btn block', html: HIA.icon('globe') + 'Translate' });
    const out = el('div', { className: 'ask-out md' });
    body.append(ta, chips, go, out);
    let controller = null;
    go.addEventListener('click', async () => {
      const text = ta.value.trim(); if (!text) return; if (needsModel()) return;
      out.innerHTML = '<span class="cursor">▍</span>';
      controller = new AbortController();
      const res = await O().chat({
        messages: [{ role: 'system', content: 'You are a translator. Translate the user\'s text into ' + target + '. Output ONLY the translation, no notes.' },
          { role: 'user', content: text }],
        temperature: 0.3, signal: controller.signal,
        onChunk: (_d, full) => { out.textContent = full; }
      });
      controller = null;
      if (!res.ok) out.innerHTML = '<span class="err">' + esc(res.error) + '</span>';
    });
    ctx.addCleanup(() => controller && controller.abort());
  }

  /* ============================ Calculator ============================ */
  function buildCalc(body, ctx) {
    bind();
    body.classList.add('app-calc');
    let expr = '';
    const disp = el('div', { className: 'calc-disp' });
    const grid = el('div', { className: 'calc-grid' });
    body.append(disp, grid);
    const keys = ['C', '( )', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
    keys.forEach((k) => {
      const op = '÷×−+=%'.includes(k) || k === '( )';
      const b = el('button', { className: 'calc-key' + (op ? ' op' : '') + (k === '=' ? ' eq' : '') + (k === 'C' ? ' clr' : ''), text: k });
      b.addEventListener('click', () => press(k));
      grid.append(b);
    });
    function show() { disp.textContent = expr || '0'; }
    function press(k) {
      if (k === 'C') expr = '';
      else if (k === '=') { try { const r = calc(expr); expr = (r === undefined || isNaN(r)) ? 'Error' : trim(r); } catch { expr = 'Error'; } }
      else if (k === '±') { expr = expr && expr[0] === '-' ? expr.slice(1) : '-' + expr; }
      else if (k === '( )') { const o = (expr.match(/\(/g) || []).length, c = (expr.match(/\)/g) || []).length; expr += (o > c && /[\d)]$/.test(expr)) ? ')' : '('; }
      else { if (expr === 'Error') expr = ''; expr += k; }
      show();
    }
    function trim(n) { return String(Math.round(n * 1e10) / 1e10); }
    // Shunting-yard (no eval): supports + − × ÷ %, parens, unary minus.
    function calc(s) {
      const src = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/%/g, '/100');
      const toks = src.match(/(\d+\.?\d*|\.\d+|[()+\-*/])/g); if (!toks) return undefined;
      const out = [], ops = [], prec = { '+': 1, '-': 1, '*': 2, '/': 2, 'u': 3 };
      let prev = null;
      for (const t of toks) {
        if (/^[\d.]+$/.test(t)) { out.push(parseFloat(t)); prev = 'n'; }
        else if (t === '(') { ops.push(t); prev = '('; }
        else if (t === ')') { while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop()); ops.pop(); prev = 'n'; }
        else {
          let op = t;
          if (t === '-' && (prev === null || prev === '(' || prev === 'o')) op = 'u';
          while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[op]) out.push(ops.pop());
          ops.push(op); prev = 'o';
        }
      }
      while (ops.length) out.push(ops.pop());
      const st = [];
      for (const t of out) {
        if (typeof t === 'number') st.push(t);
        else if (t === 'u') st.push(-st.pop());
        else { const b = st.pop(), a = st.pop(); st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b); }
      }
      return st.pop();
    }
    show();
  }

  /* ============================ Timer / Stopwatch ============================ */
  function buildTimer(body, ctx) {
    bind();
    body.classList.add('app-pad', 'app-timer');
    let mode = 'timer', tick = null;
    let remain = 5 * 60 * 1000, target = 0, running = false; // timer
    let swStart = 0, swElapsed = 0, swRunning = false, laps = []; // stopwatch
    function clearTick() { if (tick) { clearInterval(tick); tick = null; } }
    ctx.addCleanup(clearTick);

    function fmt(ms) {
      ms = Math.max(0, ms); const t = Math.floor(ms / 1000);
      const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
      const cs = Math.floor((ms % 1000) / 10);
      return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') +
        (mode === 'stopwatch' ? '.' + String(cs).padStart(2, '0') : '');
    }
    function beep() {
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.001, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.4, ac.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
        o.start(); o.stop(ac.currentTime + 0.6);
      } catch (e) { /* no audio */ }
    }
    function render() {
      body.innerHTML = '';
      const tabs = el('div', { className: 'seg' });
      ['timer', 'stopwatch'].forEach((m) => tabs.append(el('button', {
        className: 'seg-btn' + (m === mode ? ' on' : ''), text: m === 'timer' ? 'Timer' : 'Stopwatch',
        onclick: () => { mode = m; render(); }
      })));
      const face = el('div', { className: 'clock-face', text: fmt(mode === 'timer' ? (running ? target - Date.now() : remain) : (swRunning ? swElapsed + (Date.now() - swStart) : swElapsed)) });
      body.append(tabs, face);

      const ctrls = el('div', { className: 'clock-ctrls' });
      if (mode === 'timer') {
        if (!running) {
          const adj = el('div', { className: 'chip-row wrap' });
          [['−1m', -60000], ['+1m', 60000], ['+5m', 300000], ['Reset', 'r']].forEach(([l, v]) =>
            adj.append(el('button', { className: 'chip', text: l, onclick: () => {
              if (v === 'r') remain = 5 * 60 * 1000; else remain = Math.max(0, remain + v); render();
            } })));
          body.append(adj);
        }
        ctrls.append(el('button', { className: 'btn big', text: running ? 'Pause' : 'Start', onclick: () => {
          if (running) { remain = Math.max(0, target - Date.now()); running = false; clearTick(); }
          else { if (remain <= 0) remain = 5 * 60 * 1000; target = Date.now() + remain; running = true; loop(); }
          render();
        } }));
      } else {
        ctrls.append(el('button', { className: 'btn big', text: swRunning ? 'Stop' : 'Start', onclick: () => {
          if (swRunning) { swElapsed += Date.now() - swStart; swRunning = false; clearTick(); }
          else { swStart = Date.now(); swRunning = true; loop(); }
          render();
        } }));
        ctrls.append(el('button', { className: 'btn ghost big', text: swRunning ? 'Lap' : 'Reset', onclick: () => {
          if (swRunning) { laps.unshift(swElapsed + (Date.now() - swStart)); render(); }
          else { swElapsed = 0; laps = []; render(); }
        } }));
      }
      body.append(ctrls);
      if (mode === 'stopwatch' && laps.length) {
        const list = el('div', { className: 'list' });
        laps.forEach((l, i) => list.append(el('div', { className: 'list-item static' },
          el('span', { text: 'Lap ' + (laps.length - i) }), el('span', { className: 'spacer' }), el('span', { text: fmt(l) }))));
        body.append(list);
      }
    }
    function loop() {
      clearTick();
      tick = setInterval(() => {
        const face = body.querySelector('.clock-face'); if (!face) return;
        if (mode === 'timer' && running) {
          const left = target - Date.now();
          face.textContent = fmt(left);
          if (left <= 0) { running = false; remain = 0; clearTick(); beep(); face.classList.add('done'); }
        } else if (mode === 'stopwatch' && swRunning) {
          face.textContent = fmt(swElapsed + (Date.now() - swStart));
        }
      }, mode === 'stopwatch' ? 31 : 250);
    }
    render();
  }

  /* ============================ Files ============================ */
  function buildFiles(body, ctx) {
    bind();
    body.classList.add('app-pad');
    let open = null;
    function files() { return S().s.files; }
    function renderList() {
      body.innerHTML = '';
      const head = el('div', { className: 'app-head' });
      head.append(el('h2', { text: 'Files' }), el('button', { className: 'btn small', html: HIA.icon('plus') + 'New', onclick: () => {
        const name = prompt('File name', 'untitled.txt'); if (!name) return;
        S().update((s) => { if (!(name in s.files)) s.files[name] = ''; }); open = name; renderEditor();
      } }));
      body.append(head);
      const names = Object.keys(files());
      if (!names.length) { body.append(el('p', { className: 'muted', text: 'No files. Tap New to create one.' })); return; }
      const list = el('div', { className: 'list' });
      names.forEach((name) => {
        const item = el('button', { className: 'list-item', onclick: () => { open = name; renderEditor(); } });
        item.append(el('span', { className: 'li-ic', html: HIA.icon('note') }),
          el('div', { className: 'li-main' }, el('div', { className: 'li-title', text: name }),
            el('div', { className: 'li-sub', text: (files()[name] || '').length + ' chars' })),
          el('span', { className: 'li-chev', html: HIA.icon('chevron') }));
        list.append(item);
      });
      body.append(list);
    }
    function renderEditor() {
      body.innerHTML = '';
      const head = el('div', { className: 'app-head' });
      head.append(el('button', { className: 'btn ghost small', html: HIA.icon('chevron', 'flip') + 'Back', onclick: () => { open = null; renderList(); } }),
        el('span', { className: 'li-title grow', text: open }),
        el('button', { className: 'btn ghost small danger', html: HIA.icon('trash'), onclick: () => {
          S().update((s) => delete s.files[open]); open = null; renderList();
        } }));
      const area = el('textarea', { className: 'field area grow mono' });
      area.value = files()[open] || '';
      area.addEventListener('input', () => S().update((s) => s.files[open] = area.value));
      body.append(head, area);
    }
    renderList();
  }

  /* ============================ Sketch (fullscreen) ============================ */
  function buildSketch(body, ctx) {
    bind();
    body.classList.add('app-sketch');
    const bar = el('div', { className: 'sketch-bar' });
    const wrap = el('div', { className: 'sketch-wrap' });
    const canvas = el('canvas', { className: 'sketch-canvas' });
    wrap.append(canvas); body.append(bar, wrap);
    const cx = canvas.getContext('2d');
    let color = '#ffffff', size = 6, drawing = false, last = null, snaps = [];
    ['#ffffff', '#0a84ff', '#bf5af2', '#ff375f', '#30d158', '#ffd60a'].forEach((c) => {
      const s = el('button', { className: 'sw' + (c === color ? ' on' : '') }); s.style.background = c;
      s.addEventListener('click', () => { color = c; bar.querySelectorAll('.sw').forEach((x) => x.classList.remove('on')); s.classList.add('on'); });
      bar.append(s);
    });
    const range = el('input', { className: 'sketch-range', type: 'range', min: 1, max: 40, value: size });
    range.addEventListener('input', () => size = +range.value);
    bar.append(range);
    bar.append(el('button', { className: 'btn ghost small', html: HIA.icon('undo'), onclick: () => { const s = snaps.pop(); if (s) cx.putImageData(s, 0, 0); } }));
    bar.append(el('button', { className: 'btn ghost small', html: HIA.icon('trash'), onclick: () => cx.clearRect(0, 0, canvas.width, canvas.height) }));

    function fit() {
      const r = wrap.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      const img = canvas.width ? cx.getImageData(0, 0, canvas.width, canvas.height) : null;
      canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      cx.scale(dpr, dpr); cx.lineCap = 'round'; cx.lineJoin = 'round';
      if (img) cx.putImageData(img, 0, 0);
    }
    const ro = new ResizeObserver(fit); ro.observe(wrap);
    function pos(e) { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
    function start(e) { e.preventDefault(); if (canvas.width) snaps.push(cx.getImageData(0, 0, canvas.width, canvas.height)); if (snaps.length > 20) snaps.shift(); drawing = true; last = pos(e); }
    function move(e) { if (!drawing) return; e.preventDefault(); const p = pos(e); cx.strokeStyle = color; cx.lineWidth = size; cx.beginPath(); cx.moveTo(last.x, last.y); cx.lineTo(p.x, p.y); cx.stroke(); last = p; }
    function end() { drawing = false; }
    canvas.addEventListener('pointerdown', start); canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    ctx.addCleanup(() => { ro.disconnect(); window.removeEventListener('pointerup', end); });
    setTimeout(fit, 30);
  }

  /* ============================ Settings (fullscreen) ============================ */
  function buildSettings(body, ctx) {
    bind();
    body.classList.add('app-pad', 'app-settings');
    function render() {
      body.innerHTML = '';
      body.append(el('h2', { text: 'Settings' }));

      // --- Model & connection ---
      body.append(section('Model & connection', HIA.icon('key'), (sec) => {
        const model = el('input', { className: 'field', value: S().get('model'), placeholder: 'e.g. gpt-oss:120b' });
        model.addEventListener('input', () => S().set('model', model.value.trim()));
        const presetRow = el('div', { className: 'chip-row wrap' });
        O().PRESETS.forEach((p) => presetRow.append(el('button', { className: 'chip', text: p, onclick: () => { model.value = p; S().set('model', p); } })));
        const refresh = el('button', { className: 'btn ghost small', html: HIA.icon('refresh') + 'List my models', onclick: async () => {
          const t = toast('Loading models…', true); const r = await O().listModels(); t.remove();
          if (!r.ok) return toast(r.error);
          if (!r.models.length) return toast('No models returned by this endpoint');
          presetRow.innerHTML = '';
          r.models.forEach((p) => presetRow.append(el('button', { className: 'chip', text: p, onclick: () => { model.value = p; S().set('model', p); } })));
          toast(r.models.length + ' models loaded');
        } });
        const keyWrap = el('div', { className: 'key-wrap' });
        const keyIn = el('input', { className: 'field', type: 'password', value: S().get('apiKey'), placeholder: 'Ollama API key' });
        keyIn.addEventListener('input', () => S().set('apiKey', keyIn.value.trim()));
        const eye = el('button', { className: 'icon-btn', html: HIA.icon('eye'), onclick: () => { keyIn.type = keyIn.type === 'password' ? 'text' : 'password'; } });
        keyWrap.append(keyIn, eye);
        const baseIn = el('input', { className: 'field', value: S().get('baseUrl'), placeholder: 'https://ollama.com' });
        baseIn.addEventListener('input', () => S().set('baseUrl', baseIn.value.trim()));
        sec.append(label('Model'), model, presetRow, refresh, label('API key'), keyWrap, label('Base URL (advanced)'), baseIn);
      }));

      // --- Identity ---
      body.append(section('You', HIA.icon('orbit'), (sec) => {
        const name = el('input', { className: 'field', value: S().get('userName'), placeholder: 'Your name (optional)' });
        name.addEventListener('input', () => S().set('userName', name.value));
        sec.append(label('hia will call you'), name);
      }));

      // --- Appearance ---
      body.append(section('Appearance', HIA.icon('sparkles'), (sec) => {
        const sw = el('div', { className: 'chip-row wrap' });
        [['Blue', '#0a84ff', '#bf5af2'], ['Violet', '#bf5af2', '#0a84ff'], ['Pink', '#ff375f', '#ff9f0a'],
         ['Mint', '#30d158', '#0a84ff'], ['Sunset', '#ff9f0a', '#ff375f'], ['Mono', '#8e8e93', '#c7c7cc']]
          .forEach(([n, a, b]) => {
            const c = el('button', { className: 'swatch-pill' + (a === S().get('accent') ? ' on' : '') });
            c.style.background = 'linear-gradient(135deg,' + a + ',' + b + ')';
            c.title = n;
            c.addEventListener('click', () => { S().set('accent', a); S().set('accent2', b); HIA.shell.applyTheme(); render(); });
            sw.append(c);
          });
        sec.append(label('Accent'), sw);
      }));

      // --- Data ---
      body.append(section('Data & reset', HIA.icon('trash'), (sec) => {
        sec.append(el('button', { className: 'btn ghost block', text: 'Clear chat history', onclick: () => { S().update((s) => s.chat = []); toast('Chat cleared'); } }));
        sec.append(el('button', { className: 'btn ghost block danger', text: 'Erase everything & restart', onclick: () => {
          if (confirm('Erase all hiaOS data on this device?')) { S().reset(); location.reload(); }
        } }));
      }));

      // --- About ---
      body.append(section('About', HIA.icon('home'), (sec) => {
        sec.append(el('p', { className: 'muted', html:
          'hiaOS for iPhone — a pocket OS powered by Ollama Cloud.<br>Add to Home Screen via the Share sheet for the full-screen app.' }));
        sec.append(el('div', { className: 'muted small', text: 'v1.0 · ' + (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'Installed' : 'In browser') }));
      }));
    }
    function section(title, icon, fill) {
      const s = el('div', { className: 'card-sec' });
      s.append(el('div', { className: 'sec-head', html: icon + '<span>' + title + '</span>' }));
      const inner = el('div', { className: 'sec-body' }); fill(inner); s.append(inner); return s;
    }
    function label(t) { return el('div', { className: 'field-label', text: t }); }
    render();
  }

  /* ============================ Registry ============================ */
  HIA.apps = {
    chat:      { id: 'chat', name: 'hia', icon: 'chat', accent: '#0a84ff', split: true, build: buildChat },
    ask:       { id: 'ask', name: 'Ask', icon: 'sparkles', accent: '#bf5af2', split: true, build: buildAsk },
    notes:     { id: 'notes', name: 'Notes', icon: 'note', accent: '#ff9f0a', split: true, build: buildNotes },
    translate: { id: 'translate', name: 'Translate', icon: 'globe', accent: '#30d158', split: true, build: buildTranslate },
    calc:      { id: 'calc', name: 'Calculator', icon: 'calc', accent: '#8e8e93', split: true, build: buildCalc },
    timer:     { id: 'timer', name: 'Clock', icon: 'clock', accent: '#ff375f', split: true, build: buildTimer },
    files:     { id: 'files', name: 'Files', icon: 'folder', accent: '#5e5ce6', split: true, build: buildFiles },
    sketch:    { id: 'sketch', name: 'Sketch', icon: 'brush', accent: '#ff2d92', split: false, build: buildSketch },
    settings:  { id: 'settings', name: 'Settings', icon: 'gear', accent: '#64d2ff', split: false, build: buildSettings }
  };
  HIA.appOrder = ['chat', 'ask', 'notes', 'translate', 'calc', 'timer', 'files', 'sketch', 'settings'];
})();
