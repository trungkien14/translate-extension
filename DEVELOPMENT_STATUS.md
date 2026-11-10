# DEVELOPMENT_STATUS

**Last updated:** 2026-11-10 (session 3)
**Status:** The extension has been loaded in Brave. The user hand-checked the earlier session-3 changes (key encryption + "Remember on this device", parallel chunking, Gemini minimal thinking). The later removal of Google/Microsoft/LibreTranslate (only MyMemory + Gemini remain) was verified by the assistant with syntax and mock tests only. The full docs/TESTING.md scenario list is not recorded as run.
**Last completed milestone:** Providers reduced to MyMemory + Gemini (see CHANGELOG 2026-11-10).

## Completed (code written, desk-reviewed, NOT run)
- Manifest V3, shared modules, service worker, translate/detect/chunk, providers (MyMemory, Gemini),
  dictionary (dictionaryapi.dev), offscreen audio, content script (selection, Shadow DOM UI, TTS registry), popup, options.

## In progress
- Nothing partially written.

## Not implemented
- Extension icons (PNG needed; manifest has no `icons` yet).
- Manual cleanup: delete the unused files background/providers/google.js, microsoft.js, libretranslate.js.
- Non-browser pronunciation provider (registry ready).
- file:// and iframe support.

## Known bugs
- None known. None could be found without running it. Expect first-run issues.

## Blockers
- The assistant's tools cannot launch Brave, so a human must load the extension and report errors (see docs/TESTING.md).
  Claude's shell here has no access to the user's machine and has no network access.

## Exact next action
1. User: reload the extension, open Settings (only MyMemory and Gemini should be listed), press Test connection for each, copy any errors.
2. User: delete the 3 unused provider files.
3. Claude: fix reported errors, then walk through docs/TESTING.md scenarios with the user and tick TASK_TRACKER.md section 9.
4. Then: add icons, re-test, finalize README.
