/* Content-script entry: wires selection events to the UI. Guarded against double injection; listeners are registered once. */
(function () {
  const BT = globalThis.BT;
  if (!BT || !BT.ui || !BT.selection || !BT.storage) return;
  if (globalThis.__braveTranslateLoaded) return; // never register listeners twice
  globalThis.__braveTranslateLoaded = true;

  let settings = BT.DEFAULT_SETTINGS;
  let lastPoint = null;
  let timer = null;

  const alive = () => !!(chrome.runtime && chrome.runtime.id);

  function loadSettings() {
    return BT.storage.getSettings().then((s) => { settings = s; BT.ui.configure(s); }).catch(() => {});
  }

  /** Debounced: read selection and show the trigger (or react to a new selection while the modal is open). */
  function scheduleCheck(delay) {
    clearTimeout(timer);
    timer = setTimeout(check, delay);
  }

  function check() {
    if (!alive()) return teardown();
    if (!settings.enabled) { BT.ui.hideTrigger(); return; }
    const sel = BT.selection.read(lastPoint);
    if (!sel) { BT.ui.hideTrigger(); return; }
    if (BT.ui.isModalOpen()) {
      if (sel.text === BT.ui.modalText()) return; // same selection: leave modal alone
      BT.ui.closeModal(); // new selection replaces the open modal with a fresh trigger
    }
    BT.ui.showTrigger(sel);
  }

  function onMouseDown(e) {
    if (BT.ui.contains(e)) return;
    lastPoint = { x: e.clientX, y: e.clientY };
    BT.ui.hideTrigger();
    BT.ui.closeModal(); // click outside dismisses
  }
  function onMouseUp(e) {
    if (BT.ui.contains(e)) return;
    lastPoint = { x: e.clientX, y: e.clientY };
    scheduleCheck(20);
  }
  function onKeyUp(e) {
    if (BT.ui.contains(e)) return;
    const k = e.key;
    if (k === 'Shift' || k.startsWith('Arrow') || k === 'Home' || k === 'End' || k === 'PageUp' || k === 'PageDown' || ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'a')) {
      scheduleCheck(150);
    }
  }
  function onKeyDown(e) {
    if (e.key !== 'Escape') return;
    if (BT.ui.isModalOpen()) {
      BT.ui.closeModal();
      e.stopPropagation();
      e.preventDefault();
    } else if (BT.ui.triggerVisible()) {
      BT.ui.hideTrigger();
    }
  }
  let selTimer = null;
  function onSelectionChange() {
    if (!BT.ui.triggerVisible()) return; // cheap early exit: only matters while the trigger is shown
    clearTimeout(selTimer);
    selTimer = setTimeout(() => { if (!BT.selection.read(lastPoint)) BT.ui.hideTrigger(); }, 120);
  }

  function onMessage(msg) {
    if (!msg || msg.type !== BT.MSG.ACTIVATE) return;
    const sel = BT.selection.read(lastPoint);
    if (sel) BT.ui.openModal(sel); // keyboard shortcut works even when the popup icon is disabled
  }

  function onStorage(changes, area) {
    if (area === 'local' && changes[BT.KEYS.SETTINGS]) loadSettings();
  }

  function teardown() {
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('keyup', onKeyUp, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('selectionchange', onSelectionChange, true);
    BT.ui.hideTrigger();
    BT.ui.closeModal();
  }

  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('selectionchange', onSelectionChange, true);
  chrome.runtime.onMessage.addListener(onMessage);
  chrome.storage.onChanged.addListener(onStorage);
  loadSettings();
})();
