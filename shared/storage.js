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

  /* ---- Optional passphrase encryption of API keys: AES-GCM-256, key derived with PBKDF2-SHA256 (WebCrypto). ----
   * Ciphertext lives in storage.local (readable by content scripts, but useless without the key).
   * The derived key is kept only in storage.session, which is not exposed to content scripts by default and is
   * cleared when the browser closes. So after each browser start the user unlocks once in Settings. */
  const KDF_ITERATIONS = 600000;
  const SESSION_KEY = 'secretsKey';
  const b64 = (buf) => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  function lockedError() {
    const e = new Error('Your API keys are locked. Open Settings \u2192 Security of API keys and enter your passphrase.');
    e.code = 'LOCKED';
    e.retryable = false;
    return e;
  }
  async function deriveRaw(pass, salt, iterations) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pass)), 'PBKDF2', false, ['deriveBits']);
    return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256);
  }
  const aesKey = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function encryptJson(raw, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(raw), new TextEncoder().encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function decryptJson(raw, rec) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, await aesKey(raw), unb64(rec.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  async function readEnc() {
    const r = await chrome.storage.local.get(KEYS.SECRETS_ENC);
    return r[KEYS.SECRETS_ENC] || null;
  }
  /* Optional "remember on this device": the derived key is also kept in storage.local, so no passphrase is needed after a
   * restart. Trade-off: it sits on disk next to the ciphertext, so it only blocks casual reading, not someone copying the profile. */
  const REMEMBER_KEY = 'secretsKeyRemembered';
  async function sessionRaw() {
    try {
      const r = await chrome.storage.session.get(SESSION_KEY);
      if (r[SESSION_KEY]) return unb64(r[SESSION_KEY]);
    } catch (e) { /* fall through */ }
    try {
      const r = await chrome.storage.local.get(REMEMBER_KEY);
      return r[REMEMBER_KEY] ? unb64(r[REMEMBER_KEY]) : null;
    } catch (e) { return null; }
  }
  async function keepKey(raw, remember) {
    await chrome.storage.session.set({ [SESSION_KEY]: b64(raw) });
    if (remember) await chrome.storage.local.set({ [REMEMBER_KEY]: b64(raw) });
  }

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

    /** {encrypted, unlocked}. Unencrypted storage counts as unlocked. */
    async secretsState() {
      const enc = await readEnc();
      return { encrypted: !!enc, unlocked: !enc || !!(await sessionRaw()) };
    },
    /** Throws an error with code 'LOCKED' when keys are encrypted and not unlocked in this browser session. */
    async getSecrets() {
      const enc = await readEnc();
      if (!enc) {
        const r = await chrome.storage.local.get(KEYS.SECRETS);
        return { ...BT.DEFAULT_SECRETS, ...(r[KEYS.SECRETS] || {}) };
      }
      const raw = await sessionRaw();
      if (!raw) throw lockedError();
      try {
        return { ...BT.DEFAULT_SECRETS, ...(await decryptJson(raw, enc)) };
      } catch (e) {
        await storage.lockSecrets();
        throw lockedError();
      }
    },
    async saveSecrets(patch) {
      const enc = await readEnc();
      const merged = { ...(await storage.getSecrets()), ...patch };
      // Keep only the fields that still exist: keys of removed providers (Google, Microsoft, LibreTranslate) are erased on the next save.
      const next = {};
      for (const k of Object.keys(BT.DEFAULT_SECRETS)) next[k] = merged[k] != null ? merged[k] : BT.DEFAULT_SECRETS[k];
      if (!enc) {
        await chrome.storage.local.set({ [KEYS.SECRETS]: next });
        return next;
      }
      const raw = await sessionRaw();
      if (!raw) throw lockedError();
      await chrome.storage.local.set({ [KEYS.SECRETS_ENC]: { ...enc, ...(await encryptJson(raw, next)) } });
      return next;
    },
    async enableSecretsLock(pass, remember) {
      if (String(pass || '').length < 8) throw new Error('Use a passphrase of at least 8 characters.');
      if (await readEnc()) throw new Error('Your keys are already encrypted.');
      if (!chrome.storage.session) throw new Error('This browser does not support session storage, so encryption cannot be used.');
      const current = await storage.getSecrets();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const raw = await deriveRaw(pass, salt, KDF_ITERATIONS);
      const rec = { v: 1, kdf: 'PBKDF2-SHA256', iter: KDF_ITERATIONS, salt: b64(salt), ...(await encryptJson(raw, current)) };
      await keepKey(raw, remember);
      await chrome.storage.local.set({ [KEYS.SECRETS_ENC]: rec }); // plaintext is removed only after this succeeded
      await chrome.storage.local.remove(KEYS.SECRETS);
    },
    async unlockSecrets(pass, remember) {
      const enc = await readEnc();
      if (!enc) return;
      const raw = await deriveRaw(pass, unb64(enc.salt), enc.iter);
      try { await decryptJson(raw, enc); } catch (e) { throw new Error('Wrong passphrase.'); }
      await keepKey(raw, remember);
    },
    async lockSecrets() {
      try { await chrome.storage.session.remove(SESSION_KEY); } catch (e) { /* ignore */ }
      try { await chrome.storage.local.remove(REMEMBER_KEY); } catch (e) { /* ignore */ }
    },
    async disableSecretsLock(pass) {
      const enc = await readEnc();
      if (!enc) return;
      await storage.unlockSecrets(pass);
      const plain = await storage.getSecrets();
      await chrome.storage.local.set({ [KEYS.SECRETS]: plain });
      await chrome.storage.local.remove(KEYS.SECRETS_ENC);
      await storage.lockSecrets();
    },
    /** Deletes every saved key (works even if the passphrase is forgotten). */
    async wipeSecrets() {
      await chrome.storage.local.remove([KEYS.SECRETS, KEYS.SECRETS_ENC]);
      await storage.lockSecrets();
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
