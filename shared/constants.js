/* Shared constants. Classic script: attaches to globalThis.BT (content, popup, options, and SW via side-effect import). */
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});

  BT.MSG = {
    TRANSLATE: 'bt/translate',
    DICTIONARY: 'bt/dictionary',
    PLAY_AUDIO: 'bt/playAudio',
    OPEN_OPTIONS: 'bt/openOptions',
    TEST_PROVIDER: 'bt/testProvider',
    SAVE_WORD: 'bt/saveWord',
    ACTIVATE: 'bt/activate' // service worker -> content script
  };

  BT.KEYS = { SETTINGS: 'settings', SECRETS: 'secrets', HISTORY: 'history', WORDS: 'words' };

  BT.MAX_SELECTION_CHARS = 5000;

  BT.DEFAULT_SETTINGS = {
    enabled: true, // show the floating icon after selection
    autoDetect: true,
    sourceLang: 'auto', // used only when autoDetect === false
    targetLang: 'vi',
    theme: 'system', // system | light | dark
    provider: 'mymemory', // mymemory | libretranslate | google
    providerConfig: {
      libretranslate: { url: '' } // non-secret; API key lives in secrets
    },
    tts: { voices: {}, rate: 1 }, // voices: { en: voiceURI, ... }
    history: { enabled: true, limit: 200 },
    words: { enabled: true, limit: 2000 } // auto-save looked-up single words (word, meaning, pronunciation)
  };

  // Secrets are kept in a separate key so content scripts never read them.
  BT.DEFAULT_SECRETS = { mymemoryEmail: '', libretranslateKey: '', googleKey: '', microsoftKey: '', microsoftRegion: '' };
})();
