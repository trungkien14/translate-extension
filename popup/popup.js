/* Toolbar popup: quick translate box + recent history. DOM built with createElement/textContent only. */
(function () {
  const BT = globalThis.BT;
  const $ = (id) => document.getElementById(id);
  const els = {
    enabled: $('enabled'), openSettings: $('openSettings'), input: $('input'), target: $('target'),
    go: $('go'), result: $('result'), history: $('history'), clear: $('clear'), empty: $('empty')
  };
  let settings = null;

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const k of Object.keys(props)) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), props[k]);
      else n.setAttribute(k, props[k]);
    }
    for (const kid of kids) if (kid) n.append(kid);
    return n;
  }

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }

  function fillLanguages(select, value) {
    select.textContent = '';
    for (const l of BT.LANGUAGES) select.append(el('option', { value: l.code, text: `${l.name} · ${l.native}` }));
    select.value = value;
  }

  async function copy(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) { const old = btn.textContent; btn.textContent = '✓'; setTimeout(() => (btn.textContent = old), 900); }
    } catch (e) { /* clipboard blocked: ignore */ }
  }

  function showResult(kind, data) {
    const box = els.result;
    box.hidden = false;
    box.className = 'result';
    box.textContent = '';
    if (kind === 'loading') {
      box.append(el('div', { class: 'loading', text: 'Translating…' }));
    } else if (kind === 'error') {
      box.append(el('div', { class: 'err-box', text: data }));
    } else {
      const meta = el('div', { class: 'meta', text: `${BT.langName(data.source)} → ${BT.langName(data.target)}` + (data.provider ? ` · ${data.provider.name}` : '') });
      const text = el('div', { class: 'text', text: data.translation, lang: data.target });
      const copyBtn = el('button', { class: 'link', type: 'button', text: 'Copy' });
      copyBtn.addEventListener('click', () => copy(data.translation, copyBtn));
      box.append(meta, text, el('div', { class: 'actions' }, copyBtn));
      if (data.truncated) box.append(el('div', { class: 'meta', text: `Text was shortened to ${BT.MAX_SELECTION_CHARS} characters.` }));
    }
  }

  async function runTranslate() {
    const text = els.input.value.trim();
    if (!text) { els.input.focus(); return; }
    els.go.disabled = true;
    showResult('loading');
    try {
      const res = await chrome.runtime.sendMessage({
        type: BT.MSG.TRANSLATE, text, source: undefined, target: els.target.value, save: true
      });
      if (!res || !res.ok) showResult('error', (res && res.error && res.error.message) || 'Translation failed.');
      else { showResult('ok', res.data); renderHistory(); }
    } catch (e) {
      showResult('error', 'Could not reach the extension background. Try reloading the extension.');
    } finally {
      els.go.disabled = false;
    }
  }

  async function renderHistory() {
    const list = await BT.storage.getHistory();
    els.history.textContent = '';
    els.empty.hidden = list.length > 0;
    els.clear.hidden = list.length === 0;
    for (const e of list.slice(0, 8)) {
      const copyBtn = el('button', { class: 'icon-btn', type: 'button', title: 'Copy translation', 'aria-label': 'Copy translation', text: '⧉' });
      const delBtn = el('button', { class: 'icon-btn', type: 'button', title: 'Remove', 'aria-label': 'Remove entry', text: '✕' });
      copyBtn.addEventListener('click', (ev) => { ev.stopPropagation(); copy(e.translation, copyBtn); });
      delBtn.addEventListener('click', async (ev) => { ev.stopPropagation(); await BT.storage.removeHistory(e.id); renderHistory(); });
      const li = el('li', { tabindex: '0', role: 'button', title: 'Open' },
        el('div', { class: 'h-body' },
          el('div', { class: 'h-src', text: e.text }),
          el('div', { class: 'h-dst', text: e.translation })),
        el('div', { class: 'h-btns' }, copyBtn, delBtn));
      const open = () => {
        els.input.value = e.text;
        if (BT.LANGUAGES.some((l) => l.code === e.target)) els.target.value = e.target;
        showResult('ok', { ...e, provider: null });
      };
      li.addEventListener('click', open);
      li.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
      els.history.append(li);
    }
  }

  async function renderWordCount() {
    const n = (await BT.storage.getWords()).length;
    $('openWords').textContent = n ? `Saved words (${n})` : 'Saved words';
  }

  async function init() {
    settings = await BT.storage.getSettings();
    applyTheme(settings.theme);
    els.enabled.checked = settings.enabled;
    fillLanguages(els.target, settings.targetLang);

    els.enabled.addEventListener('change', () => BT.storage.saveSettings({ enabled: els.enabled.checked }));
    els.target.addEventListener('change', () => BT.storage.saveSettings({ targetLang: els.target.value }));
    els.openSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());
    els.go.addEventListener('click', runTranslate);
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runTranslate(); }
    });
    els.clear.addEventListener('click', async () => { await BT.storage.clearHistory(); renderHistory(); });
    // Creating a tab needs no extra permission; the #words anchor scrolls the settings page to the list.
    $('openWords').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#words') }));

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[BT.KEYS.HISTORY]) renderHistory();
      if (area === 'local' && changes[BT.KEYS.WORDS]) renderWordCount();
    });
    renderHistory();
    renderWordCount();
    els.input.focus();
  }

  init();
})();
