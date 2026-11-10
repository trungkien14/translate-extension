/* Storage layer (chrome.storage.local only; nothing is synced or sent anywhere). */
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});
  const { KEYS } = BT;

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function deepMerge(base, over) {
    const out = Array.isArray(base) ? base.slice() : { ...base };
    if (!isObj(over)) return out;
    for (const k of Object.keys(over)) {
      out[k] = isObj(base[k]) && isObj(over[k]) ? deepMerge(base[k], over[k]) : over[k];
    }
    return out;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  const storage = {
    deepMerge,

    async getSettings() {
      const r = await chrome.storage.local.get(KEYS.SETTINGS);
      return deepMerge(clone(BT.DEFAULT_SETTINGS), r[KEYS.SETTINGS] || {});
    },
    /** Deep-merges `patch` into stored settings and returns the result. */
    async saveSettings(patch) {
      const cur = await storage.getSettings();
      const next = deepMerge(cur, patch);
      await chrome.storage.local.set({ [KEYS.SETTINGS]: next });
      return next;
    },

    async getSecrets() {
      const r = await chrome.storage.local.get(KEYS.SECRETS);
      return { ...BT.DEFAULT_SECRETS, ...(r[KEYS.SECRETS] || {}) };
    },
    async saveSecrets(patch) {
      const next = { ...(await storage.getSecrets()), ...patch };
      await chrome.storage.local.set({ [KEYS.SECRETS]: next });
      return next;
    },

    async getHistory() {
      const r = await chrome.storage.local.get(KEYS.HISTORY);
      return Array.isArray(r[KEYS.HISTORY]) ? r[KEYS.HISTORY] : [];
    },
    /** entry: {text, translation, source, target}. Same text+target moves to the top instead of duplicating. */
    async addHistory(entry, limit) {
      const list = await storage.getHistory();
      const filtered = list.filter((e) => !(e.text === entry.text && e.target === entry.target));
      filtered.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ts: Date.now(),
        ...entry
      });
      const max = Math.max(1, Number(limit) || 200);
      await chrome.storage.local.set({ [KEYS.HISTORY]: filtered.slice(0, max) });
    },
    async removeHistory(id) {
      const list = await storage.getHistory();
      await chrome.storage.local.set({ [KEYS.HISTORY]: list.filter((e) => e.id !== id) });
    },
    async clearHistory() {
      await chrome.storage.local.set({ [KEYS.HISTORY]: [] });
    },

    /* ---- Saved words: {id, ts, word, translation, ipa, source, target}. Newest first. ---- */
    async getWords() {
      const r = await chrome.storage.local.get(KEYS.WORDS);
      return Array.isArray(r[KEYS.WORDS]) ? r[KEYS.WORDS] : [];
    },
    /**
     * Insert or update a word (same word + source + target). An empty `ipa` never erases a stored one,
     * because the pronunciation arrives in a second call after the dictionary lookup.
     * Calls are serialised so the two writes cannot overwrite each other.
     */
    upsertWord(entry, limit) {
      const run = async () => {
        const list = await storage.getWords();
        const key = (e) => [String(e.word).toLowerCase(), e.source, e.target].join('|');
        const k = key(entry);
        const old = list.find((e) => key(e) === k);
        const rest = list.filter((e) => key(e) !== k);
        const item = {
          id: old ? old.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          ts: Date.now(),
          word: entry.word,
          translation: entry.translation,
          ipa: entry.ipa || (old && old.ipa) || '',
          source: entry.source,
          target: entry.target
        };
        rest.unshift(item);
        const max = Math.max(1, Number(limit) || 2000);
        await chrome.storage.local.set({ [KEYS.WORDS]: rest.slice(0, max) });
      };
      const p = wordQueue.then(run, run);
      wordQueue = p.catch(() => {});
      return p;
    },
    async removeWord(id) {
      const list = await storage.getWords();
      await chrome.storage.local.set({ [KEYS.WORDS]: list.filter((e) => e.id !== id) });
    },
    async clearWords() {
      await chrome.storage.local.set({ [KEYS.WORDS]: [] });
    }
  };
  let wordQueue = Promise.resolve();

  BT.storage = storage;
})();
