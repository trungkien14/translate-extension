/* Selection detection: reads the current selection (page text or <input>/<textarea>), classifies it, returns its viewport rect. */
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});

  const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', '']);

  function normalise(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  /** word | phrase | sentence */
  function classify(text) {
    const hasSpace = /\s/.test(text);
    const cjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text);
    const endsSentence = /[.!?。！？…]["')\]]?$/.test(text);
    const words = hasSpace ? text.split(/\s+/).length : 1;
    if (!hasSpace && !endsSentence && text.length <= (cjk ? 6 : 40)) return 'word';
    if (endsSentence || words >= 8 || text.length > 80 || (cjk && text.length > 12)) return 'sentence';
    return 'phrase';
  }

  function rectFromPoint(p) {
    const x = p ? p.x : 0, y = p ? p.y : 0;
    return { left: x, right: x, top: y, bottom: y + 18, width: 0, height: 18 };
  }
  function plainRect(r) { return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }

  function readEditable(el, lastPoint) {
    if (el.tagName === 'INPUT' && !TEXT_INPUT_TYPES.has((el.type || '').toLowerCase())) return null; // skips password etc.
    let s, e;
    try { s = el.selectionStart; e = el.selectionEnd; } catch (err) { return null; }
    if (s == null || e == null || s === e) return null;
    const text = normalise(el.value.slice(s, e));
    if (!text) return null;
    const r = el.getBoundingClientRect();
    const rect = lastPoint ? rectFromPoint(lastPoint) : plainRect(r);
    return { text, rect, kind: classify(text) };
  }

  /** @returns {{text:string, rect:object, kind:string}|null} */
  BT.selection = {
    classify,
    read(lastPoint) {
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
        const r = readEditable(active, lastPoint);
        if (r) return r;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
      const text = normalise(sel.toString());
      if (!text) return null;
      const range = sel.getRangeAt(0);
      let rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        const rects = range.getClientRects();
        rect = rects.length ? rects[rects.length - 1] : null;
      }
      const out = rect && (rect.width || rect.height) ? plainRect(rect) : rectFromPoint(lastPoint);
      return { text, rect: out, kind: classify(text) };
    }
  };
})();
