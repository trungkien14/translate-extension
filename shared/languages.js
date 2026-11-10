/* Language catalogue. `code` is our canonical code (BCP-47-ish, as MyMemory/Google accept). */
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});

  // speech = BCP-47 tag handed to speechSynthesis
  BT.LANGUAGES = [
    { code: 'en', name: 'English', native: 'English', speech: 'en-US' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', speech: 'vi-VN' },
    { code: 'ja', name: 'Japanese', native: '日本語', speech: 'ja-JP' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文', speech: 'zh-CN' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文', speech: 'zh-TW' },
    { code: 'ko', name: 'Korean', native: '한국어', speech: 'ko-KR' },
    { code: 'fr', name: 'French', native: 'Français', speech: 'fr-FR' },
    { code: 'de', name: 'German', native: 'Deutsch', speech: 'de-DE' },
    { code: 'es', name: 'Spanish', native: 'Español', speech: 'es-ES' },
    { code: 'pt', name: 'Portuguese', native: 'Português', speech: 'pt-PT' },
    { code: 'it', name: 'Italian', native: 'Italiano', speech: 'it-IT' },
    { code: 'ru', name: 'Russian', native: 'Русский', speech: 'ru-RU' },
    { code: 'th', name: 'Thai', native: 'ไทย', speech: 'th-TH' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', speech: 'id-ID' }
  ];

  BT.langName = function (code) {
    if (!code || code === 'auto') return 'Auto-detect';
    const l = BT.LANGUAGES.find((x) => x.code === code);
    return l ? l.name : String(code).toUpperCase();
  };
  BT.speechTag = function (code) {
    const l = BT.LANGUAGES.find((x) => x.code === code);
    return l ? l.speech : code;
  };
  BT.isCJK = function (code) {
    return code === 'ja' || code === 'ko' || (code || '').startsWith('zh');
  };
  /** Normalise a detector/provider code into one of ours (e.g. "zh" -> "zh-CN", "pt-BR" -> "pt"). */
  BT.normalizeLang = function (code) {
    if (!code) return null;
    const c = String(code).trim();
    if (BT.LANGUAGES.some((l) => l.code === c)) return c;
    const lower = c.toLowerCase();
    if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh-hans') return 'zh-CN';
    if (lower === 'zh-tw' || lower === 'zh-hant') return 'zh-TW';
    const base = lower.split(/[-_]/)[0];
    return BT.LANGUAGES.some((l) => l.code === base) ? base : base;
  };
})();
