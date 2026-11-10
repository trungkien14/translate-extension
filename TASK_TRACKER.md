# TASK_TRACKER

Legend: `[ ]` not started · `[x]` code written (see note: "verified" only where stated) · `[~]` in progress · `[!]` blocked

IMPORTANT: As of 2026-11-10 NOTHING has been loaded or run in Brave. `[x]` below means "code written and
desk-reviewed", NOT "verified in the browser". Verification is tracked in section 9.

## 1. Foundation
- [x] manifest.json (MV3, minimal permissions: storage, offscreen; fixed host permissions for 3 APIs; optional https/http origins for self-hosted LibreTranslate)
- [x] shared/constants.js, languages.js, storage.js, tokens.css
- [x] docs/DESIGN_SYSTEM.md

## 2. Background
- [x] service-worker.js (message router, command handler, defaults on install)
- [x] translate.js (detect -> provider -> chunk -> history, small memo cache)
- [x] detect.js (script heuristics + chrome.i18n.detectLanguage)
- [x] chunk.js (500-byte chunking for MyMemory)
- [x] providers/http.js, index.js, mymemory.js, libretranslate.js, google.js
- [x] dictionary.js (dictionaryapi.dev, English only)
- [x] audio.js + offscreen/ (recorded dictionary audio)

## 3. Content script
- [x] selection.js (page + input/textarea selections, word/phrase/sentence classification)
- [x] styles.js (Shadow DOM CSS + icons, light/dark)
- [x] tts.js (pronunciation provider registry: browser-tts + dictionary-audio)
- [x] ui.js (trigger, modal, loading/error/empty states, copy, speakers, dictionary, alternatives, swap)
- [x] main.js (event wiring, debounce, teardown, ACTIVATE shortcut message)

## 4. Extension pages
- [x] popup/popup.html, popup.css, popup.js (quick translate + recent history)
- [x] options/options.html, options.css, options.js (general, languages, provider + keys + test, voices, shortcut guidance, history)

## 5. Documentation / handoff
- [x] PROJECT_CONTEXT.md, DEVELOPMENT_STATUS.md, TASK_TRACKER.md, TECHNICAL_DECISIONS.md, CHANGELOG.md, NEXT_SESSION_PROMPT.md
- [x] README.md, docs/TESTING.md

## 5b. Saved words feature (2026-11-10) — code written, NOT run
- [x] Storage + message + worker handler + modal auto-save + options list/export + popup link
- [ ] Verify: look up an English word -> appears in Settings -> Saved words with IPA
- [ ] Verify: repeat lookup does not duplicate; toggle off stops saving; Remove / Clear all / Export CSV work
- [ ] Optional follow-ups: Anki export, search box in the list, Notion/Sheets sync (needs OAuth/API research first)

## 5c. API key security (2026-11-10) — code written, NOT run
- [x] Passphrase encryption, session unlock, write-only key fields, http guard, LOCKED handling
- [ ] Run the checklist in docs/SECURITY.md (encrypt, restart, unlock, wrong passphrase, remove encryption, wipe)
- [ ] Re-verify provider Save buttons (LibreTranslate/Google/Gemini/Microsoft) after the write-only change

## 6. Missing / to do
- [ ] Extension icons (PNG 16/48/128) + `icons` and `action.default_icon` in manifest (needs PNG files; text tools cannot create binaries)
- [x] Microsoft Translator provider written (docs researched; NOT run). [ ] Verify with a real Azure key: translation, auto-detect field, Chinese codes, regional key error
- [ ] Consider context-aware translation (send surrounding sentence) to improve phrase quality
- [ ] Alternative pronunciation provider beyond browser TTS (architecture is ready: BT.pronunciation.register)
- [ ] Support for file:// pages (manifest currently matches only http/https)
- [ ] Optional: all_frames / iframe support

## 7. Known risks to check first in Brave
- [ ] Brave Shields / fingerprinting protection may affect speechSynthesis.getVoices() (voices list may be empty) — verify
- [ ] MyMemory/dictionaryapi.dev reachability from the service worker
- [ ] Offscreen document audio playback of dictionary mp3s

## 8. Bugs found
(none recorded yet — nothing has been run)

## 9. Verification (docs/TESTING.md has the procedure). Mark `[x]` ONLY after running it in Brave.
- [ ] 0. Load unpacked in Brave with no errors (brave://extensions -> Errors empty)
- [ ] 1. Single English word
- [ ] 2. English phrase
- [ ] 3. English sentence
- [ ] 4. Vietnamese
- [ ] 5. Japanese
- [ ] 6. Chinese
- [ ] 7. Korean
- [ ] 8. Very long paragraph (chunking, truncation notice)
- [ ] 9. Selection near right edge
- [ ] 10. Selection near bottom edge
- [ ] 11. Repeated selection (no duplicate trigger/modal)
- [ ] 12. New selection while modal open
- [ ] 13. Escape closes modal
- [ ] 14. Click outside closes modal
- [ ] 15. Copy original / translation
- [ ] 16. Original pronunciation
- [ ] 17. Translated pronunciation
- [ ] 18. Offline error state + Retry
- [ ] 19. Invalid/missing credentials (Google key wrong, LibreTranslate not configured)
- [ ] 20. Restart Brave: settings + history persist
- [ ] 21. Popup: translate box + history reopen/copy/remove/clear
- [ ] 22. Options: every control persists; Test connection works
- [ ] 23. Keyboard shortcut Alt+Shift+T
- [ ] 24. SPA page (e.g. a React site) and a page with strict CSP
