/*
 * Pronunciation providers (content-script side).
 *  - kind 'synthesized': browser speechSynthesis (NOT a native-speaker recording).
 *  - kind 'recorded'   : audio supplied by a provider (dictionary API), played via the service worker's offscreen document.
 * To add a provider later: BT.pronunciation.register({ id, label, kind, speak(text, lang, opts) -> Promise }).
 */
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});
  const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

  function loadVoices() {
    return new Promise((resolve) => {
      if (!synth) return resolve([]);
      const now = synth.getVoices();
      if (now.length) return resolve(now);
      let done = false;
      const finish = () => { if (done) return; done = true; synth.removeEventListener('voiceschanged', finish); resolve(synth.getVoices()); };
      synth.addEventListener('voiceschanged', finish);
      setTimeout(finish, 1500);
    });
  }

  function pickVoice(voices, tag, preferredURI) {
    if (preferredURI) {
      const v = voices.find((x) => x.voiceURI === preferredURI);
      if (v) return v;
    }
    const lower = tag.toLowerCase();
    const base = lower.split('-')[0];
    return (
      voices.find((v) => v.lang.toLowerCase() === lower) ||
      voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(base)) ||
      null
    );
  }

  const browserTts = {
    id: 'browser-tts',
    label: 'Browser text-to-speech',
    kind: 'synthesized',
    async speak(text, langCode, opts = {}) {
      if (!synth) throw new Error('Speech synthesis is not available in this browser.');
      const tag = BT.speechTag(langCode);
      const voices = await loadVoices();
      const voice = pickVoice(voices, tag, opts.voiceURI);
      if (!voice) throw new Error(`No ${BT.langName(langCode)} voice is installed on this system.`);
      synth.cancel();
      return new Promise((resolve, reject) => {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = opts.rate || 1;
        u.onend = () => resolve();
        u.onerror = (e) => (e.error === 'canceled' || e.error === 'interrupted' ? resolve() : reject(new Error('Speech failed: ' + e.error)));
        synth.speak(u);
      });
    },
    stop() { if (synth) synth.cancel(); },
    listVoices: loadVoices
  };

  const dictionaryAudio = {
    id: 'dictionary-audio',
    label: 'Dictionary recording',
    kind: 'recorded',
    async speak(url) {
      const res = await chrome.runtime.sendMessage({ type: BT.MSG.PLAY_AUDIO, url });
      if (!res || !res.ok) throw new Error((res && res.error && res.error.message) || 'Could not play the recording.');
    },
    stop() {}
  };

  const registry = new Map();
  BT.pronunciation = {
    register(p) { registry.set(p.id, p); },
    get(id) { return registry.get(id); }
  };
  BT.pronunciation.register(browserTts);
  BT.pronunciation.register(dictionaryAudio);
})();
