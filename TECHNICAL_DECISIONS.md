# TECHNICAL_DECISIONS

Decisions marked **LOCKED** should not be reversed without a strong, written reason.

## Architecture
1. **LOCKED — Manifest V3, plain JavaScript, no build step, no npm dependencies.** Keeps the project loadable
   straight from disk in Brave and easy for a new Claude account to read. Revisit only if the code outgrows it.
2. **LOCKED — All network calls happen in the service worker** (not content scripts). Avoids page CORS/CSP and keeps
   API keys out of page contexts. Content script <-> worker protocol is `BT.MSG` (shared/constants.js).
3. **LOCKED — In-page UI lives in a Shadow DOM** (open mode) so host-page CSS cannot break it and vice versa.
   Stylesheet is a JS string (content/styles.js) applied via adoptedStyleSheets (fallback: <style>).
4. **LOCKED — DOM is built with createElement/textContent.** The only innerHTML use is for static icon SVG strings.
   Never inject page text or API text as HTML.
5. Shared scripts attach to `globalThis.BT`. Classic scripts so the same file serves content scripts, popup and options;
   the service worker imports them for the side effect.
6. Selection logic is separate from UI (selection.js vs ui.js). Translation orchestration (translate.js) is separate
   from providers (providers/*) and from dictionary (dictionary.js). Pronunciation is its own registry (tts.js).

## Storage
7. **LOCKED — chrome.storage.local only** (no sync, no localStorage). Keys: `settings`, `secrets`, `history`.
   Secrets are in a separate key and are read only by the worker and options page. Content scripts read only `settings`
   (content scripts can technically read all of storage.local; the separation limits accidental exposure, it is not a
   security boundary — documented honestly in README).
7b. **LOCKED — API key protection:** optional passphrase encryption (AES-GCM + PBKDF2-SHA256 600k) in shared/storage.js; ciphertext in `secretsEnc`,
    unlock key only in chrome.storage.session; locked state throws code `LOCKED` (MyMemory still works). Key inputs are write-only. Full threat model: docs/SECURITY.md.
    Do NOT move secrets to storage.sync. Do NOT show saved keys back in the UI.
7c. Optional "Remember on this device": the derived AES key is also written to storage.local (`secretsKeyRemembered`) so restarts need no passphrase. Deliberate trade-off
    (convenience vs. disk-at-rest protection); off by default; removed by lockSecrets/wipe/disable/failed decrypt. Do not make it the default.
8. History: newest first, de-duplicated by (text, target), capped by `settings.history.limit` (default 200).
   Saved by the worker when `save:true`. Text only goes to the selected provider, never elsewhere.

## Providers (verified by web research in an earlier session; re-verify before relying on limits)
9. **MyMemory is the default** because it works with no key. 500-byte `q` limit (we chunk), 5,000 chars/day anonymous,
   ~50,000 with `de` email. No language auto-detect used -> local detection (detect.js). Quality is "translation memory"
   quality; can return noisy results. This is a convenience default, not a commercial-grade recommendation.
9b. translate.js sends up to 3 chunks concurrently (order preserved). Safe because providers with chunking (MyMemory) get a concrete source language; with source 'auto' and several chunks the first goes alone.
10. LibreTranslate: only free when self-hosted; libretranslate.com needs a paid key. Server URL is user-supplied, so
    its origin is requested at runtime via `optional_host_permissions` (chrome.permissions.request from options page).
11. Google Cloud Translation Basic v2: requires billing-enabled project; key stored locally by user. Never in source. Key is sent in the `X-goog-api-key` header, not the URL (not re-verified with a live call by the assistant).
12. Microsoft Translator (Azure AI Translator v3.0): implemented in background/providers/microsoft.js. Verified from Microsoft Learn: POST
    api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=..; headers Ocp-Apim-Subscription-Key (+ Ocp-Apim-Subscription-Region, required
    for regional resources); body [{"Text":..}]. Pricing page lists free F0 = 2M chars/month (one third-party source says the free period may be
    limited to 12 months: re-check at signup). NOT verified by a live call: detectedLanguage field, zh-Hans/zh-Hant codes. Key + region are in `secrets`.
12b. Gemini (Google AI Studio): providers/gemini.js. REST format verified from ai.google.dev docs. Free tier / no card / data-use-for-improvement verified only via
    third-party summaries + a pricing-page excerpt: re-check on ai.google.dev. Model name is user-editable because it changes. autoDetect=false (local detection).
    Prompt treats page text as data, not instructions; output shown with textContent only. Thinking is minimised for speed: `thinkingLevel: minimal` (gemini-3*), `thinkingBudget: 0` (gemini-2.5-flash*), nothing for other models; one retry without it on HTTP 400 mentioning thinking.
13. Dictionary: Free Dictionary API (api.dictionaryapi.dev), English only, keyless, rate-limited, sometimes unreliable.
    UI shows dictionary details only for English words (or for the English translation of a single foreign word).
    It supplies IPA, definitions, examples, synonyms, and some recorded audio. It does NOT provide translations.
14. Scraping Google Translate or similar sites is forbidden (project requirement).

## Saved words
- Storage key `words` (chrome.storage.local). Entry: {id, ts, word, translation, ipa, source, target}; unique by lowercase word + source + target; cap 2000.
- Saved only when the selection is classified as a single word (not phrase/sentence) and source != target. Written by the service worker (SAVE_WORD) so writes are serialised.
- Pronunciation = IPA from the Free Dictionary API, only when the looked-up word itself is English. Foreign-language words are saved without IPA (no verified source for it).
- Google Keep: official Keep API is Workspace-only (not personal accounts), so it is not used. No unofficial Keep access.

## Pronunciation
15. **LOCKED — Honesty rule:** browser speechSynthesis = "synthesized voice" (label + tooltip say so). Dictionary audio =
    "Recorded" (labeled). Never present synthesized speech as a native recording.
16. Recorded audio is played via an offscreen document (AUDIO_PLAYBACK) so page CSP cannot block it.
17. New providers: `BT.pronunciation.register({id,label,kind,speak,stop})` in content/tts.js.

## UI
18. Design tokens in shared/tokens.css (pages) and mirrored in content/styles.js (modal). Keep both in sync.
    Accent #4f46e5 light / #8b8dfc dark. Theme: system | light | dark.
19. Floating trigger (30px button) appears near the selection; modal opens on click or Alt+Shift+T. A new selection
    while the modal is open replaces it with a fresh trigger. Outside click and Escape close it.
20. Modal adapts by selection kind: word (large original + dictionary), phrase, sentence (translation first, smaller type,
    "Show more" clamp for long originals).

## Permissions
21. `storage`, `offscreen` only. Fixed host permissions for the three known API hosts. No `tabs`, no `activeTab`, no
    `<all_urls>` host permission. Content script matches http/https only.

## Known limitations
- Cannot run on brave://, chrome://, Chrome Web Store, extension pages, built-in PDF viewer, or file:// (not matched).
- Content script runs in top frame only (`all_frames: false`).
- Selections inside closed shadow roots or cross-origin iframes are not seen.
- Auto-detect for MyMemory relies on chrome.i18n.detectLanguage + script heuristics; short Latin-script text can be misdetected
  (fallback 'en'). The user can pick the source language in the modal.
- In-memory caches are lost when the service worker sleeps.
- No extension icons yet (PNG needed).
