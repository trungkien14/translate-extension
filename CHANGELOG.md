# CHANGELOG

## 2026-11-10 — Key convenience, Google key header, speed (checked by hand by the user in Brave)
- `shared/storage.js`, `options/options.html`, `options/options.js`: optional **Remember on this device** — the derived unlock key is also kept in storage.local
  (`secretsKeyRemembered`) so no passphrase is needed after a restart. `lockSecrets()` (and wipe/disable/wrong-key) removes it. Trade-off documented in README and docs/SECURITY.md.
- `background/providers/google.js`: API key moved from the `?key=` URL query to the `X-goog-api-key` header.
- `background/translate.js`: chunks are translated up to 3 in parallel (was sequential); when the source is 'auto' and there are several chunks, the first goes alone to fix the source language.
- `background/providers/gemini.js`: thinking set to minimum (`thinkingLevel: 'minimal'` for gemini-3*, `thinkingBudget: 0` for gemini-2.5-flash*, none otherwise); one retry without it if Google answers HTTP 400 naming thinking.
- Tests run by the assistant: `node --check`, a storage lock/remember simulation, a mock timing test (6 chunks x 300 ms: ~1800 ms -> ~603 ms) and a mock Gemini config test. Not measured against the live APIs by the assistant.
- Docs updated: README (new "Entering API keys" section), docs/SECURITY.md, TECHNICAL_DECISIONS.md, TASK_TRACKER.md, DEVELOPMENT_STATUS.md.

## 2026-11-10 — Session 2 (completing the extension pages + docs)
- Added: `popup/popup.css`, `popup/popup.js` (quick translate box, recent history, selection-popup toggle, settings link).
- Added: `options/options.html`, `options.css`, `options.js` (general, languages + swap, provider settings with keys,
  Test connection, per-language voices + speed, shortcut guidance, history management).
- Added: `TASK_TRACKER.md`, `TECHNICAL_DECISIONS.md`, `CHANGELOG.md`, `NEXT_SESSION_PROMPT.md`, `README.md`, `docs/TESTING.md`.
- Updated: `DEVELOPMENT_STATUS.md`.
- Reviewed (read-only, no changes): manifest, shared/*, background/*, content/*, offscreen/*. No syntax or logic defects found
  by reading; NOT executed.
- Not run: nothing has been loaded in Brave yet.

## 2026-11-10 — Bug fixes from first screenshot (not yet re-run)
- `background/detect.js`: 1-2 word Latin text is trusted only if chrome.i18n reports it reliable, else English ("challenges" was detected as Dutch).
- `background/providers/mymemory.js`: alternatives limited to inputs of <=4 words and to short, similar-length results (unrelated long TM sentences were shown).

## 2026-11-10 — API key security hardening (not yet run)
- `shared/storage.js`: optional passphrase encryption of secrets (AES-GCM-256, PBKDF2-SHA256 600k), unlock key in storage.session; new API secretsState/enableSecretsLock/unlockSecrets/lockSecrets/disableSecretsLock/wipeSecrets; getSecrets throws code LOCKED when locked.
- `shared/constants.js` KEYS.SECRETS_ENC; `background/service-worker.js` (LOCKED error mapping, session access level TRUSTED_CONTEXTS); `background/translate.js` (locked keys do not block MyMemory);
  `background/providers/libretranslate.js` (refuse to send key over plain http except localhost); `content/ui.js` (Open settings button on LOCKED).
- `options/*`: "Security of API keys" panel; key fields are write-only (saved keys never shown again); saves wrapped with error toasts.
- New `docs/SECURITY.md` (measures, honest limits, verification checklist).

## 2026-11-10 — Gemini provider (not yet run)
- New `background/providers/gemini.js` (Google AI Studio key, no billing card; LLM translation for phrases/idioms). Model name is a setting.
- manifest host permission generativelanguage.googleapis.com; secret `geminiKey`; settings.providerConfig.gemini.model; Settings UI box.
- Reason: user has no Azure subscription; MyMemory quality is poor for phrases.
- Privacy caveat shown in UI: free-tier prompts may be used by Google to improve products.

## 2026-11-10 — Microsoft Translator provider + modal language-select fix (not yet run)
- New `background/providers/microsoft.js`, registered in providers/index.js; manifest host permission for api.cognitive.microsofttranslator.com;
  secrets `microsoftKey`/`microsoftRegion`; Settings provider option + key/region fields.
- `content/styles.js`: language selects share the header width equally (target select was shrunk to an empty box).
- Reason: MyMemory (translation-memory) gives poor results for phrases such as "crunch peace" -> "crunch hòa bình".

## 2026-11-10 — Feature: Saved words (not yet run)
- Single looked-up words are auto-saved as {word, translation, ipa, source, target}; IPA (English words only) is filled in after the dictionary lookup.
- `shared/constants.js` (MSG.SAVE_WORD, KEYS.WORDS, settings.words), `shared/storage.js` (getWords/upsertWord/removeWord/clearWords, serialised writes),
  `background/service-worker.js` (SAVE_WORD handler), `content/ui.js` (saveWord + "Saved to word list" footer note),
  `options/*` (Saved words section: toggle, list, remove, clear, Export CSV), `popup/*` ("Saved words (N)" link).
- Decision: Google Keep has no API for personal accounts (Workspace only), so notes integration is local + CSV export for now.

## Session 1 (date not recorded)
- Research of providers, continuity docs, design system, manifest, shared modules, background modules, content script modules,
  offscreen document, popup.html.
