# DEVELOPMENT_STATUS

**Last updated:** 2026-11-10 (session 3)
**Status:** The extension has been loaded in Brave. The user hand-checked the session-3 changes (key encryption + "Remember on this device", Google key header, parallel chunking, Gemini minimal thinking). The full docs/TESTING.md scenario list is not recorded as run.
**Last completed milestone:** API-key security and speed work (see CHANGELOG 2026-11-10 "Key convenience, Google key header, speed").

## Completed (code written, desk-reviewed, NOT run)
- Manifest V3, shared modules, service worker, translate/detect/chunk, providers (MyMemory, LibreTranslate, Google, Gemini, Microsoft),
  dictionary (dictionaryapi.dev), offscreen audio, content script (selection, Shadow DOM UI, TTS registry), popup, options.

## In progress
- Nothing partially written.

## Not implemented
- Extension icons (PNG needed; manifest has no `icons` yet).
- Microsoft Translator and Google (after the header change) not verified with real keys.
- Non-browser pronunciation provider (registry ready).
- file:// and iframe support.

## Known bugs
- None known. None could be found without running it. Expect first-run issues.

## Blockers
- The assistant's tools cannot launch Brave, so a human must load the extension and report errors (see docs/TESTING.md).
  Claude's shell here has no access to the user's machine and has no network access.

## Exact next action
1. User: load unpacked in Brave (`brave://extensions`), open the service worker console and the options page, copy any errors.
2. Claude: fix reported errors, then walk through docs/TESTING.md scenarios with the user and tick TASK_TRACKER.md section 9.
3. Then: add icons, re-test, finalize README.
