# PROJECT_CONTEXT — Brave Translate Extension

> READ THIS FIRST. Then read DEVELOPMENT_STATUS.md, TASK_TRACKER.md, TECHNICAL_DECISIONS.md.
> If the docs and the source disagree, the SOURCE is the truth: fix the docs.

## 1. Overview
A Manifest V3 browser extension for Brave (Chromium). The user selects a word/phrase/sentence on any
web page; a small floating button appears; clicking it opens a compact modal with the translation,
detected language, pronunciation buttons, and (for English words) dictionary details.
Inspired by modern dictionary tools, NOT a full-page translator.

## 2. Product objectives
- Lightweight, fast, polished, non-intrusive.
- Works on ordinary and dynamic (SPA) pages. Never breaks page interactions.
- Works out of the box with a keyless verified provider (MyMemory); other providers pluggable.
- Honest pronunciation: browser speechSynthesis is SYNTHESIZED, dictionary audio is RECORDED; UI says which.
- Privacy: history stays in chrome.storage.local; text only goes to the selected provider.

## 3. Technology stack
- Manifest V3, plain JavaScript (no build step, no npm dependencies), HTML, CSS.
- Content script UI rendered inside a Shadow DOM (style isolation from the host page).
- Background service worker (ES module) does all network calls (avoids page CORS/CSP).
- Offscreen document (AUDIO_PLAYBACK) plays provider-supplied audio (page CSP cannot block it).
- chrome.storage.local for settings, secrets, history. chrome.commands for the shortcut.

## 4. Architecture (separation of concerns)
| Concern | Where |
|---|---|
| Text selection detection | content/selection.js, content/main.js |
| Translation logic | background/translate.js, background/chunk.js, background/detect.js |
| Providers (pluggable) | background/providers/{index,http,mymemory,libretranslate,google}.js |
| Dictionary / linguistic info | background/dictionary.js (dictionaryapi.dev, English only) |
| Pronunciation | content/tts.js (provider registry), background/audio.js + offscreen/ |
| Storage | shared/storage.js |
| UI | content/ui.js + content/styles.js (modal), popup/, options/ |

Shared classic scripts (shared/*.js) attach to `globalThis.BT`. The service worker imports them for
their side effect (`import '../shared/constants.js'`) and reads `globalThis.BT`.

## 5. Directory structure
```
manifest.json
shared/      constants.js languages.js storage.js tokens.css
background/  service-worker.js translate.js detect.js chunk.js dictionary.js audio.js providers/
content/     styles.js tts.js selection.js ui.js main.js        (load order = manifest order)
offscreen/   offscreen.html offscreen.js
popup/       popup.html popup.css popup.js
options/     options.html options.css options.js
docs/        DESIGN_SYSTEM.md TESTING.md
*.md         continuity docs + README.md
```

## 6. Message protocol (content/popup/options -> service worker)
Types live in BT.MSG (shared/constants.js): TRANSLATE, DICTIONARY, PLAY_AUDIO, OPEN_OPTIONS,
TEST_PROVIDER. Service worker -> content: ACTIVATE (keyboard shortcut). All replies: `{ok:true,data}` or
`{ok:false,error:{code,message,retryable}}`.

## 7. Provider information (VERIFIED by web research, see TECHNICAL_DECISIONS.md)
- MyMemory (default): keyless GET api.mymemory.translated.net/get?q=&langpair=src|tgt[&de=email].
  500-byte limit per q; 5,000 chars/day anonymous, 50,000/day with `de` email. No auto-detect used
  (we detect locally).
- LibreTranslate: POST {server}/translate. Free only when SELF-HOSTED; libretranslate.com needs a paid key.
  Supports source:"auto" and returns detectedLanguage.
- Google Cloud Translation Basic v2: POST translation.googleapis.com/language/translate/v2?key=KEY.
  Needs a billing-enabled GCP project; first 500k chars/month free.
- Microsoft Translator: researched? NO. Not implemented. Verify before adding.
- Dictionary: Free Dictionary API (api.dictionaryapi.dev), English only, keyless, 450 req/5 min/IP,
  reported unreliable at times -> must degrade gracefully.

## 8. How it works
1. content/main.js listens (mouseup/keyup/selectionchange) -> BT.selection.read() -> ui.showTrigger().
2. Trigger click (or Alt+Shift+T command) -> ui.openModal(): sends TRANSLATE to the worker.
3. Worker: detect language -> provider.translate (chunked if needed) -> save history -> reply.
4. Content shows translation, then asks DICTIONARY (English word, or the English translation of a
   single foreign word) and fills definitions/IPA/examples/synonyms progressively.

## 9. Conventions
- No build step. No new dependency without a strong reason. No localStorage; chrome.storage only.
- Never put API keys in source. Secrets live in storage key `secrets` (local only, never synced).
- Build DOM with createElement/textContent, never innerHTML with page or API text.
- Update DEVELOPMENT_STATUS.md + TASK_TRACKER.md after each milestone; NEXT_SESSION_PROMPT.md before stopping.
- Never mark something verified unless it was actually run in Brave (see docs/TESTING.md).
