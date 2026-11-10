/* In-page UI: floating trigger + translation modal, rendered in a Shadow DOM. All text is inserted with textContent (never innerHTML). */
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});
  const ICON = BT.ICONS;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  let settings = JSON.parse(JSON.stringify(BT.DEFAULT_SETTINGS));
  let host = null, shadow = null, layer = null;
  let trigger = null, triggerSel = null;
  let modal = null, m = null, ro = null;

  /* ---------- tiny DOM helper ---------- */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v; // static icon markup only
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  function iconBtn(name, title, onClick, cls) {
    return h('button', { class: 'icon-btn' + (cls ? ' ' + cls : ''), type: 'button', title, 'aria-label': title, html: ICON[name], onclick: onClick });
  }
  function setIcon(btn, name) { btn.innerHTML = ICON[name]; }

  async function send(msg) {
    try {
      if (!chrome.runtime || !chrome.runtime.id) throw new Error('context');
      const res = await chrome.runtime.sendMessage(msg);
      if (res) return res;
    } catch (e) { /* fall through */ }
    return { ok: false, error: { code: 'EXTENSION_RELOADED', message: 'The extension was updated or restarted. Reload this page to continue.', retryable: false } };
  }

  /* ---------- host / theme ---------- */
  function resolveTheme() { return settings.theme === 'system' ? (mq.matches ? 'dark' : 'light') : settings.theme; }
  function applyTheme() { if (host) host.setAttribute('data-theme', resolveTheme()); }
  mq.addEventListener('change', applyTheme);

  function ensureHost() {
    if (!host) {
      host = document.createElement('div');
      host.id = 'brave-translate-root';
      host.style.cssText = 'all:initial;position:absolute;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;';
      shadow = host.attachShadow({ mode: 'open' });
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(BT.CSS);
        shadow.adoptedStyleSheets = [sheet];
      } catch (e) {
        shadow.append(h('style', { text: BT.CSS }));
      }
      layer = h('div', { class: 'layer' });
      shadow.append(layer);
      applyTheme();
    }
    if (!host.isConnected) document.documentElement.append(host);
  }
  function origin() {
    const r = host.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY };
  }

  /* ---------- trigger ---------- */
  function showTrigger(sel) {
    ensureHost();
    hideTrigger();
    triggerSel = sel;
    const o = origin();
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const vx = Math.max(6, Math.min(sel.rect.right + 6, vw - 36));
    let vy = sel.rect.bottom + 6;
    if (vy + 36 > vh) vy = Math.max(6, sel.rect.top - 36);
    trigger = h('button', {
      class: 'trigger', type: 'button', title: 'Translate', 'aria-label': 'Translate selection', html: ICON.translate,
      onmousedown: (e) => e.preventDefault(), // keep the page selection
      onclick: () => openModal(triggerSel)
    });
    trigger.style.left = vx + window.scrollX - o.x + 'px';
    trigger.style.top = vy + window.scrollY - o.y + 'px';
    layer.append(trigger);
  }
  function hideTrigger() {
    if (trigger) { trigger.remove(); trigger = null; }
    triggerSel = null;
  }

  /* ---------- modal ---------- */
  function openModal(sel) {
    ensureHost();
    hideTrigger();
    closeModal();
    const o0 = { x: window.scrollX, y: window.scrollY };
    m = {
      text: sel.text, kind: sel.kind,
      source: settings.autoDetect ? 'auto' : settings.sourceLang || 'auto',
      target: settings.targetLang,
      anchor: { left: sel.rect.left + o0.x, right: sel.rect.right + o0.x, top: sel.rect.top + o0.y, bottom: sel.rect.bottom + o0.y },
      placement: null, req: 0, result: null, speaking: null, speakBtns: {}
    };
    buildModal();
    layer.append(modal);
    place();
    ro = new ResizeObserver(place);
    ro.observe(modal);
    run();
  }

  function buildModal() {
    const langOpts = (withAuto) => [
      withAuto ? h('option', { value: 'auto', text: 'Auto-detect' }) : null,
      BT.LANGUAGES.map((l) => h('option', { value: l.code, text: l.name }))
    ];
    m.srcSel = h('select', { class: 'sel', 'aria-label': 'Source language', onchange: onSourceChange }, langOpts(true));
    m.tgtSel = h('select', { class: 'sel', 'aria-label': 'Target language', onchange: onTargetChange }, langOpts(false));
    m.srcSel.value = m.source;
    m.tgtSel.value = m.target;

    const head = h('div', { class: 'head' },
      h('div', { class: 'langs' }, m.srcSel, iconBtn('swap', 'Swap languages (translate the result back)', onSwap), m.tgtSel),
      iconBtn('close', 'Close (Esc)', closeModal));

    // original
    m.origText = h('div', { class: 'orig' });
    m.ipaEl = h('div', { class: 'ipa', hidden: true });
    m.moreBtn = h('button', { class: 'more', type: 'button', hidden: true, onclick: () => {
      const clamped = m.origText.classList.toggle('clamp');
      m.moreBtn.textContent = clamped ? 'Show more' : 'Show less';
    } });
    m.speakBtns.orig = iconBtn('speaker', 'Pronounce original (synthesized voice)', () => speak('orig'));
    m.copyOrig = iconBtn('copy', 'Copy original', (e) => copy(m.text, e.currentTarget));
    m.speakBtns.orig.disabled = true;
    const origCard = h('div', { class: 'card' },
      h('div', { class: 'label', text: 'Original' }),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, m.origText, m.ipaEl, m.moreBtn), h('div', { class: 'acts' }, m.speakBtns.orig, m.copyOrig)));

    // translation
    m.transLabel = h('div', { class: 'label', text: 'Translation' });
    m.transBody = h('div', { class: 'grow' });
    m.speakBtns.trans = iconBtn('speaker', 'Pronounce translation (synthesized voice)', () => speak('trans'));
    m.copyTrans = iconBtn('copy', 'Copy translation', (e) => copy(m.result ? m.result.translation : '', e.currentTarget));
    m.speakBtns.trans.disabled = true;
    m.copyTrans.disabled = true;
    const transCard = h('div', { class: 'card' }, m.transLabel,
      h('div', { class: 'row' }, m.transBody, h('div', { class: 'acts' }, m.speakBtns.trans, m.copyTrans)));

    m.altsCard = h('div', { class: 'card', hidden: true });
    m.dictCard = h('div', { class: 'card', hidden: true });

    m.provEl = h('span', { text: '' });
    const foot = h('div', { class: 'foot' }, m.provEl, h('span', { text: 'Speaker = synthesized voice' }));

    modal = h('div', { class: 'modal kind-' + m.kind, role: 'dialog', 'aria-label': 'Translation' }, head,
      h('div', { class: 'body' }, origCard, transCard, m.altsCard, m.dictCard), foot);
    renderOriginal();
  }

  function renderOriginal() {
    m.origText.textContent = m.text;
    const long = m.text.length > 200;
    m.origText.classList.toggle('clamp', long);
    m.moreBtn.hidden = !long;
    m.moreBtn.textContent = 'Show more';
    modal.className = 'modal kind-' + m.kind;
  }

  function place() {
    if (!modal || !m) return;
    const o = origin();
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const w = Math.min(380, vw - 16);
    modal.style.width = w + 'px';
    const a = { left: m.anchor.left - window.scrollX, right: m.anchor.right - window.scrollX, top: m.anchor.top - window.scrollY, bottom: m.anchor.bottom - window.scrollY };
    const height = modal.offsetHeight;
    const gap = 8;
    if (m.placement === null) {
      const below = vh - a.bottom, above = a.top;
      m.placement = below >= Math.min(height + gap, 320) || below >= above ? 'below' : 'above';
    }
    const vx = Math.max(8, Math.min(a.left, vw - w - 8));
    let vy = m.placement === 'below' ? a.bottom + gap : a.top - gap - height;
    vy = Math.max(8, Math.min(vy, vh - height - 8));
    modal.style.left = vx + window.scrollX - o.x + 'px';
    modal.style.top = vy + window.scrollY - o.y + 'px';
  }

  function closeModal() {
    if (!m) return;
    stopSpeaking();
    if (ro) { ro.disconnect(); ro = null; }
    modal.remove();
    modal = null;
    m = null; // invalidates in-flight requests
  }

  /* ---------- translation flow ---------- */
  function setLoading() {
    m.transBody.replaceChildren(h('div', { class: 'sk w85' }), h('div', { class: 'sk' }), h('div', { class: 'sk w60' }));
    m.speakBtns.orig.disabled = m.speakBtns.trans.disabled = m.copyTrans.disabled = true;
    m.altsCard.hidden = true;
    m.dictCard.hidden = true;
    m.ipaEl.hidden = true;
    m.provEl.textContent = '';
  }

  function setError(err) {
    const btns = h('div', { class: 'btns' });
    if (err.retryable !== false) btns.append(h('button', { class: 'btn primary', type: 'button', text: 'Retry', onclick: run }));
    if (['NOT_CONFIGURED', 'AUTH', 'QUOTA'].includes(err.code)) {
      btns.append(h('button', { class: 'btn', type: 'button', text: 'Open settings', onclick: () => send({ type: BT.MSG.OPEN_OPTIONS }) }));
    }
    m.transBody.replaceChildren(h('div', { class: 'error', role: 'alert' }, h('div', { text: err.message || 'Translation failed.' }), btns));
  }

  function setResult(r) {
    m.result = r;
    m.detected = r.detectedSource;
    m.srcSel.options[0].textContent = m.source === 'auto' ? 'Auto · ' + BT.langName(r.source) : 'Auto-detect';
    if (m.source !== 'auto') m.srcSel.value = m.source;
    m.transLabel.textContent = 'Translation · ' + BT.langName(r.target);
    const kids = [h('div', { class: 'trans', lang: r.target, text: r.translation })];
    if (r.sameLanguage) kids.push(h('div', { class: 'notice', text: 'Source and target language are the same.' }));
    if (r.truncated) kids.push(h('div', { class: 'notice', text: `Only the first ${BT.MAX_SELECTION_CHARS} characters were translated.` }));
    m.transBody.replaceChildren(...kids);
    m.origText.setAttribute('lang', r.source);
    m.speakBtns.orig.disabled = m.speakBtns.trans.disabled = m.copyTrans.disabled = false;
    m.provEl.textContent = 'Translated by ' + r.provider.name;
    saveWord('');

    if (r.alternatives && r.alternatives.length) {
      m.altsCard.replaceChildren(
        h('div', { class: 'label', text: 'Alternative translations' }),
        h('div', { class: 'chips' }, r.alternatives.map((alt) =>
          h('button', { class: 'chip', type: 'button', title: 'Click to copy', text: alt, onclick: (e) => copy(alt, null) }))));
      m.altsCard.hidden = false;
    }
  }

  async function run() {
    if (!m) return;
    const id = ++m.req;
    stopSpeaking();
    setLoading();
    const res = await send({ type: BT.MSG.TRANSLATE, text: m.text, source: m.source, target: m.target, save: true });
    if (!m || id !== m.req) return; // closed or superseded
    if (!res.ok) { setError(res.error); return; }
    setResult(res.data);
    lookupDictionary(id);
    place();
  }

  /* ---------- saved words (single words only: word, meaning, pronunciation) ---------- */
  async function saveWord(ipa) {
    if (!m || m.kind !== 'word' || !m.result || m.result.sameLanguage) return;
    if (!settings.words || !settings.words.enabled) return;
    const mine = m;
    const r = m.result;
    const res = await send({
      type: BT.MSG.SAVE_WORD, word: mine.text, translation: r.translation, ipa: ipa || '', source: r.source, target: r.target
    });
    if (m !== mine || !res.ok || !res.data || !res.data.saved) return;
    if (!mine.provEl.textContent.includes('Saved')) mine.provEl.textContent += ' · Saved to word list';
  }

  /* ---------- dictionary ---------- */
  const EN_WORD = /^[A-Za-z][A-Za-z'’-]*$/;
  const trimEdges = (s) => s.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');

  function dictTarget() {
    if (m.kind !== 'word') return null;
    const r = m.result;
    if (r.source === 'en') {
      const w = trimEdges(m.text);
      return EN_WORD.test(w) ? { word: w, fromTranslation: false } : null;
    }
    if (r.target === 'en') {
      const w = trimEdges(r.translation);
      return w && !/\s/.test(w) && EN_WORD.test(w) ? { word: w, fromTranslation: true } : null;
    }
    return null;
  }

  async function lookupDictionary(id) {
    const t = dictTarget();
    if (!t) {
      if (m.kind === 'word') {
        m.dictCard.replaceChildren(h('div', { class: 'label', text: 'Dictionary' }), h('div', { class: 'empty', text: 'Dictionary details are available for English words only.' }));
        m.dictCard.hidden = false;
      }
      return;
    }
    m.dictCard.replaceChildren(h('div', { class: 'label', text: 'Dictionary' }), h('div', { class: 'sk w60' }), h('div', { class: 'sk' }));
    m.dictCard.hidden = false;
    const res = await send({ type: BT.MSG.DICTIONARY, word: t.word });
    if (!m || id !== m.req) return;
    if (!res.ok) {
      m.dictCard.replaceChildren(h('div', { class: 'label', text: 'Dictionary' }),
        h('div', { class: 'empty', text: res.error.message || 'Dictionary unavailable right now.' }),
        res.error.retryable !== false ? h('button', { class: 'more', type: 'button', text: 'Retry', onclick: () => lookupDictionary(m.req) }) : null);
    } else if (!res.data.found) {
      m.dictCard.replaceChildren(h('div', { class: 'label', text: 'Dictionary' }), h('div', { class: 'empty', text: `No dictionary entry for “${t.word}”.` }));
    } else {
      renderDict(res.data, t.fromTranslation);
      // Pronunciation of the looked-up word itself (not of its English translation).
      if (!t.fromTranslation && res.data.ipa) saveWord(res.data.ipa);
    }
    place();
  }

  function renderDict(d, fromTranslation) {
    const c = m.dictCard;
    c.replaceChildren(h('div', { class: 'label', text: fromTranslation ? `Dictionary · ${d.word}` : 'Dictionary' }));
    if (d.ipa) {
      if (fromTranslation) c.append(h('div', { class: 'ipa', text: d.ipa }));
      else { m.ipaEl.textContent = d.ipa; m.ipaEl.hidden = false; }
    }
    if (d.audios.length) {
      const wrap = h('div');
      for (const a of d.audios) {
        const b = h('button', { class: 'btn rec', type: 'button', title: 'Recorded audio supplied by the dictionary (not synthesized)', onclick: () => playRecorded(a.url) });
        b.insertAdjacentHTML('afterbegin', ICON.play);
        b.append(document.createTextNode(' Recorded · ' + a.label));
        wrap.append(b);
      }
      c.append(wrap);
    }
    const blocks = d.meanings.map((mn, i) => {
      const block = h('div', { class: 'pos-block' },
        h('span', { class: 'pos', text: mn.pos || 'other' }),
        h('ol', { class: 'defs' }, mn.definitions.slice(0, 3).map((df) =>
          h('li', null, df.definition, df.example ? h('span', { class: 'ex', text: '“' + df.example + '”' }) : null))));
      if (i >= 2) block.hidden = true;
      return block;
    });
    c.append(...blocks);
    if (blocks.length > 2) {
      let open = false;
      const t = h('button', { class: 'more', type: 'button', text: 'Show more', onclick: () => {
        open = !open;
        blocks.slice(2).forEach((b) => (b.hidden = !open));
        t.textContent = open ? 'Show less' : 'Show more';
      } });
      c.append(t);
    }
    if (d.synonyms.length) {
      c.append(h('div', { class: 'pos-block' }, h('div', { class: 'label', text: 'Synonyms' }),
        h('div', { class: 'chips' }, d.synonyms.map((s) => h('span', { class: 'chip', text: s })))));
    }
    c.append(h('div', { class: 'notice', text: 'Source: ' + d.source }));
  }

  /* ---------- pronunciation ---------- */
  function stopSpeaking() {
    if (!m || !m.speaking) return;
    const tts = BT.pronunciation.get('browser-tts');
    tts.stop();
    resetSpeakBtn(m.speaking);
    m.speaking = null;
  }
  function resetSpeakBtn(which) {
    const b = m && m.speakBtns[which];
    if (b) { b.classList.remove('active'); setIcon(b, 'speaker'); }
  }
  async function speak(which) {
    if (!m || !m.result) return;
    if (m.speaking === which) { stopSpeaking(); return; }
    stopSpeaking();
    const text = (which === 'orig' ? m.text : m.result.translation).slice(0, 1500);
    const lang = which === 'orig' ? m.result.source : m.result.target;
    const btn = m.speakBtns[which];
    const mine = m;
    m.speaking = which;
    btn.classList.add('active');
    setIcon(btn, 'stop');
    try {
      await BT.pronunciation.get('browser-tts').speak(text, lang, { voiceURI: settings.tts.voices[lang], rate: settings.tts.rate });
    } catch (e) {
      if (m === mine) toast(e.message);
    } finally {
      if (m === mine && m.speaking === which) { m.speaking = null; resetSpeakBtn(which); }
    }
  }
  async function playRecorded(url) {
    try { await BT.pronunciation.get('dictionary-audio').speak(url); } catch (e) { toast(e.message); }
  }

  /* ---------- copy / toast ---------- */
  async function copy(text, btn) {
    if (!text) return;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try {
        const ta = h('textarea', { style: 'position:fixed;opacity:0;pointer-events:none;' });
        ta.value = text;
        layer.append(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch (e2) { ok = false; }
    }
    toast(ok ? 'Copied' : 'Could not copy');
    if (ok && btn) {
      btn.classList.add('ok');
      setIcon(btn, 'check');
      setTimeout(() => { btn.classList.remove('ok'); setIcon(btn, 'copy'); }, 1200);
    }
  }
  let toastTimer = null;
  function toast(msg) {
    if (!modal) return;
    modal.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', { class: 'toast', role: 'status', text: msg });
    modal.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 2000);
  }

  /* ---------- language controls ---------- */
  function onSourceChange() {
    m.source = m.srcSel.value;
    if (!settings.autoDetect && m.source !== 'auto') BT.storage.saveSettings({ sourceLang: m.source }).catch(() => {});
    run();
  }
  function onTargetChange() {
    m.target = m.tgtSel.value;
    settings.targetLang = m.target;
    BT.storage.saveSettings({ targetLang: m.target }).catch(() => {});
    run();
  }
  function onSwap() {
    if (!m.result || m.result.sameLanguage) return;
    // Reverse translation: the translation becomes the text, languages trade places.
    const newSource = m.result.target;
    const newTarget = m.result.source;
    m.text = m.result.translation;
    m.kind = BT.selection.classify(m.text);
    m.source = newSource;
    m.target = newTarget;
    m.srcSel.value = newSource;
    m.tgtSel.value = newTarget;
    renderOriginal();
    run();
  }

  /* ---------- public API ---------- */
  BT.ui = {
    configure(s) { settings = s; applyTheme(); },
    showTrigger,
    hideTrigger,
    openModal,
    closeModal,
    isModalOpen: () => !!m,
    modalText: () => (m ? m.text : null),
    contains(e) { return !!host && e.composedPath().includes(host); },
    triggerVisible: () => !!trigger
  };
})();
