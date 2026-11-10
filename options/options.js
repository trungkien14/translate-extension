/* Settings page. All values persist to chrome.storage.local via BT.storage. Secrets live under a separate key. */
(function () {
  const BT = globalThis.BT;
  const $ = (id) => document.getElementById(id);
  let settings = null;
  let toastTimer = null;

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const k of Object.keys(props)) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else n.setAttribute(k, props[k]);
    }
    for (const kid of kids) if (kid) n.append(kid);
    return n;
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 1600);
  }

  async function save(patch, quiet) {
    settings = await BT.storage.saveSettings(patch);
    if (!quiet) toast('Saved');
  }

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }

  function fillLangSelect(select, value) {
    select.textContent = '';
    for (const l of BT.LANGUAGES) select.append(el('option', { value: l.code, text: `${l.name} · ${l.native}` }));
    select.value = value;
  }

  /* ---------- Languages ---------- */
  function renderLanguages() {
    $('autoDetect').checked = settings.autoDetect;
    fillLangSelect($('sourceLang'), settings.sourceLang === 'auto' ? 'en' : settings.sourceLang);
    $('sourceLang').disabled = settings.autoDetect;
    fillLangSelect($('targetLang'), settings.targetLang);
    $('swap').disabled = false;
  }

  async function swapLanguages() {
    const prevTarget = settings.targetLang;
    const prevSource = settings.sourceLang === 'auto' ? ($('sourceLang').value || 'en') : settings.sourceLang;
    const hadAuto = settings.autoDetect;
    await save({ autoDetect: false, sourceLang: prevTarget, targetLang: prevSource });
    $('swapHint').hidden = !hadAuto;
    renderLanguages();
  }

  /* ---------- Provider ---------- */
  function showProviderBox() {
    const p = $('provider').value;
    document.querySelectorAll('.provider-box').forEach((b) => (b.hidden = b.dataset.provider !== p));
    $('testResult').textContent = ''; $('testResult').className = 'test-result';
  }

  async function loadSecretsIntoForm() {
    const s = await BT.storage.getSecrets();
    $('mymemoryEmail').value = s.mymemoryEmail || '';
    $('ltKey').value = s.libretranslateKey || '';
    $('googleKey').value = s.googleKey || '';
    $('msKey').value = s.microsoftKey || '';
    $('msRegion').value = s.microsoftRegion || '';
    $('ltUrl').value = (settings.providerConfig.libretranslate && settings.providerConfig.libretranslate.url) || '';
  }

  function validEmail(v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  async function saveLibre() {
    const raw = $('ltUrl').value.trim();
    let origin = null;
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad');
      origin = u.origin + '/*';
    } catch (e) {
      toast('Enter a valid server URL, e.g. http://localhost:5000');
      return;
    }
    let granted = false;
    try { granted = await chrome.permissions.request({ origins: [origin] }); } catch (e) { granted = false; }
    if (!granted) { toast('Access to that server was not granted.'); return; }
    await save({ providerConfig: { libretranslate: { url: raw } } }, true);
    await BT.storage.saveSecrets({ libretranslateKey: $('ltKey').value.trim() });
    toast('LibreTranslate saved');
  }

  async function saveGoogle() {
    await BT.storage.saveSecrets({ googleKey: $('googleKey').value.trim() });
    toast('API key saved');
  }

  async function saveMicrosoft() {
    await BT.storage.saveSecrets({ microsoftKey: $('msKey').value.trim(), microsoftRegion: $('msRegion').value.trim() });
    toast('Microsoft key saved');
  }

  async function testProvider() {
    const out = $('testResult');
    const btn = $('test');
    btn.disabled = true;
    out.className = 'test-result'; out.textContent = 'Testing…';
    try {
      const res = await chrome.runtime.sendMessage({ type: BT.MSG.TEST_PROVIDER, provider: $('provider').value });
      if (res && res.ok) {
        out.className = 'test-result ok';
        out.textContent = `Working: “Hello” → “${res.data.translation}” (${res.data.provider.name})`;
      } else {
        out.className = 'test-result err';
        out.textContent = (res && res.error && res.error.message) || 'The test failed.';
      }
    } catch (e) {
      out.className = 'test-result err';
      out.textContent = 'Could not reach the extension background. Reload the extension and try again.';
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- Voices ---------- */
  function loadVoices() {
    return new Promise((resolve) => {
      if (typeof speechSynthesis === 'undefined') return resolve([]);
      const now = speechSynthesis.getVoices();
      if (now.length) return resolve(now);
      let done = false;
      const finish = () => { if (done) return; done = true; speechSynthesis.removeEventListener('voiceschanged', finish); resolve(speechSynthesis.getVoices()); };
      speechSynthesis.addEventListener('voiceschanged', finish);
      setTimeout(finish, 1500);
    });
  }

  async function renderVoices() {
    const voices = await loadVoices();
    const box = $('voices');
    box.textContent = '';
    $('voicesEmpty').hidden = voices.length > 0;
    if (!voices.length) return;
    for (const l of BT.LANGUAGES) {
      const base = BT.speechTag(l.code).toLowerCase().split('-')[0];
      const matching = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').split('-')[0] === base);
      const select = el('select', { id: 'voice-' + l.code, 'aria-label': `${l.name} voice` });
      select.append(el('option', { value: '', text: matching.length ? 'Automatic' : 'No voice installed' }));
      for (const v of matching) select.append(el('option', { value: v.voiceURI, text: `${v.name} (${v.lang})` }));
      select.value = (settings.tts.voices && settings.tts.voices[l.code]) || '';
      if (select.value !== ((settings.tts.voices && settings.tts.voices[l.code]) || '')) select.value = '';
      select.disabled = matching.length === 0;
      select.addEventListener('change', () => save({ tts: { voices: { [l.code]: select.value } } }));
      box.append(el('div', { class: 'row' }, el('div', { class: 'row-text' }, el('label', { for: select.id, text: l.name })), select));
    }
  }

  /* ---------- History ---------- */
  async function renderHistory() {
    const list = await BT.storage.getHistory();
    const ul = $('histList');
    ul.textContent = '';
    $('histEmpty').hidden = list.length > 0;
    $('histCount').textContent = list.length ? `${list.length} saved` : '';
    $('histClear').hidden = list.length === 0;
    for (const e of list) {
      const copyBtn = el('button', { class: 'btn', type: 'button', text: 'Copy' });
      const delBtn = el('button', { class: 'btn danger', type: 'button', text: 'Remove' });
      copyBtn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(e.translation); toast('Copied'); } catch (err) { toast('Copy was blocked by the browser.'); }
      });
      delBtn.addEventListener('click', async () => { await BT.storage.removeHistory(e.id); renderHistory(); });
      ul.append(el('li', null,
        el('div', { class: 'h-body' },
          el('div', { class: 'h-src', text: e.text }),
          el('div', { class: 'h-dst', text: e.translation }),
          el('div', { class: 'h-meta', text: `${BT.langName(e.source)} → ${BT.langName(e.target)} · ${new Date(e.ts).toLocaleString()}` })),
        copyBtn, delBtn));
    }
  }

  /* ---------- Saved words ---------- */
  async function renderWords() {
    const list = await BT.storage.getWords();
    const ul = $('wordsList');
    ul.textContent = '';
    $('wordsEmpty').hidden = list.length > 0;
    $('wordsCount').textContent = list.length ? `${list.length} saved` : '';
    $('wordsClear').hidden = $('wordsExport').hidden = list.length === 0;
    for (const e of list) {
      const head = el('div', { class: 'h-src', text: e.word });
      if (e.ipa) head.append(el('span', { class: 'ipa', text: e.ipa }));
      const delBtn = el('button', { class: 'btn danger', type: 'button', text: 'Remove' });
      delBtn.addEventListener('click', async () => { await BT.storage.removeWord(e.id); renderWords(); });
      ul.append(el('li', null,
        el('div', { class: 'h-body' },
          head,
          el('div', { class: 'h-dst', text: e.translation }),
          el('div', { class: 'h-meta', text: `${BT.langName(e.source)} \u2192 ${BT.langName(e.target)} \u00b7 ${new Date(e.ts).toLocaleDateString()}` })),
        delBtn));
    }
  }

  function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

  async function exportWords() {
    const list = await BT.storage.getWords();
    const rows = [['word', 'pronunciation', 'meaning', 'from', 'to', 'saved']].concat(
      list.map((e) => [e.word, e.ipa, e.translation, e.source, e.target, new Date(e.ts).toISOString()])
    );
    // BOM so Excel reads Vietnamese/CJK text as UTF-8.
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'saved-words.csv' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* ---------- Init ---------- */
  async function init() {
    settings = await BT.storage.getSettings();
    applyTheme(settings.theme);

    $('enabled').checked = settings.enabled;
    $('theme').value = settings.theme;
    $('provider').value = settings.provider;
    $('rate').value = settings.tts.rate;
    $('rateOut').textContent = Number(settings.tts.rate).toFixed(1) + '×';
    $('histEnabled').checked = settings.history.enabled;
    $('histLimit').value = String(settings.history.limit);
    if (!$('histLimit').value) { $('histLimit').value = '200'; }

    renderLanguages();
    showProviderBox();
    await loadSecretsIntoForm();
    renderVoices();
    renderHistory();
    $('wordsEnabled').checked = settings.words.enabled;
    renderWords();
    $('wordsEnabled').addEventListener('change', (e) => save({ words: { enabled: e.target.checked } }));
    $('wordsExport').addEventListener('click', exportWords);
    $('wordsClear').addEventListener('click', async () => {
      if (!confirm('Remove all saved words?')) return;
      await BT.storage.clearWords();
      renderWords();
    });

    $('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
    $('theme').addEventListener('change', (e) => { applyTheme(e.target.value); save({ theme: e.target.value }); });

    $('autoDetect').addEventListener('change', async (e) => {
      await save({ autoDetect: e.target.checked, sourceLang: e.target.checked ? 'auto' : $('sourceLang').value });
      $('sourceLang').disabled = e.target.checked;
      $('swapHint').hidden = true;
    });
    $('sourceLang').addEventListener('change', (e) => save({ sourceLang: e.target.value }));
    $('targetLang').addEventListener('change', (e) => save({ targetLang: e.target.value }));
    $('swap').addEventListener('click', swapLanguages);

    $('provider').addEventListener('change', async (e) => { await save({ provider: e.target.value }); showProviderBox(); });
    $('mymemoryEmail').addEventListener('change', async (e) => {
      const v = e.target.value.trim();
      if (!validEmail(v)) { toast('That email address looks invalid.'); return; }
      await BT.storage.saveSecrets({ mymemoryEmail: v });
      toast('Saved');
    });
    $('ltSave').addEventListener('click', saveLibre);
    $('googleSave').addEventListener('click', saveGoogle);
    $('msSave').addEventListener('click', saveMicrosoft);
    $('test').addEventListener('click', testProvider);

    $('rate').addEventListener('input', (e) => { $('rateOut').textContent = Number(e.target.value).toFixed(1) + '×'; });
    $('rate').addEventListener('change', (e) => save({ tts: { rate: Number(e.target.value) } }));

    $('copyShortcut').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('shortcutUrl').textContent); toast('Address copied'); } catch (e) { toast('Copy was blocked by the browser.'); }
    });

    $('histEnabled').addEventListener('change', (e) => save({ history: { enabled: e.target.checked } }));
    $('histLimit').addEventListener('change', (e) => save({ history: { limit: Number(e.target.value) } }));
    $('histClear').addEventListener('click', async () => {
      if (!confirm('Remove all saved translations?')) return;
      await BT.storage.clearHistory();
      renderHistory();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[BT.KEYS.HISTORY]) renderHistory();
      if (area === 'local' && changes[BT.KEYS.WORDS]) renderWords();
    });
  }

  init();
})();
