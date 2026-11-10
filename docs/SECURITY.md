# SECURITY — handling of API keys

Status: implemented 2026-11-10, NOT yet run in Brave. Verify with the checklist at the end.

## What is protected, and how
| Measure | Where | Notes |
|---|---|---|
| No keys in source code | whole project | keys are entered by the user in Settings |
| Keys never leave the browser except to their own provider | background/providers/* | endpoints are hardcoded; LibreTranslate uses the user's URL and refuses to send a key over plain http (except localhost) |
| Network calls only from the service worker | background/ | content scripts and pages never see keys |
| Keys kept apart from settings | storage keys `secrets` / `secretsEnc` | content scripts read only `settings` |
| Optional passphrase encryption (AES-GCM-256, PBKDF2-SHA256, 600k iterations, random salt/IV) | shared/storage.js | plaintext `secrets` is deleted after the encrypted copy is written |
| Unlock key held only in `chrome.storage.session` | shared/storage.js | per Chrome docs: not exposed to content scripts by default, cleared on browser restart/reload; SW also sets access level TRUSTED_CONTEXTS |
| Write-only key fields | options/ | a saved key is never placed back into the page; placeholder shows "saved" |
| Sender check | background/service-worker.js | ignores messages not from this extension; no message type returns secrets |
| No secrets in errors/logs | providers | error messages never include keys |
| Sync not used | storage.local only | keys are not uploaded to a Google/Brave account |

## Honest limits
- Without a passphrase, keys are plaintext in the profile's storage and `chrome.storage.local` is readable by this extension's content scripts (Chrome docs: local is exposed to content scripts by default). Web pages cannot read it; local malware/other users of the Windows account can.
- With a passphrase: protects data at rest only. Malware already running (keylogger, memory access while unlocked) can still win. While unlocked, the derived key sits in session storage (memory) until the browser closes or "Lock now".
- A 2022 Chromium Extensions thread notes `storage.session` changes may be observable by content scripts through `onChanged` regardless of access level; the unlock key is only written when the user unlocks. Treat as a known, unverified-in-2026 caveat.
- Old plaintext may remain in the browser's LevelDB files until compaction after encrypting/removing keys.
- A forgotten passphrase cannot be recovered (by design). "Remove all saved keys" wipes everything.
- Google Cloud Translation key travels in the request URL query string (per Google's documented v2 usage); other providers send it in headers/body.
- Provider-side safety (outside our control): use a dedicated key, set quotas/budget alerts, revoke on suspicion. Gemini free tier may use content to improve Google products.

## Verification checklist (to run in Brave)
- [ ] Encrypt keys with a passphrase -> DevTools (service worker) `chrome.storage.local.get(null, console.log)` shows `secretsEnc` and no `secrets`.
- [ ] Restart Brave -> translation with a key provider says "keys are locked" with an Open settings button; MyMemory still works.
- [ ] Unlock in Settings -> key provider works; saved keys show only a "saved" placeholder.
- [ ] Wrong passphrase -> "Wrong passphrase."
- [ ] Remove encryption -> `secrets` back, `secretsEnc` gone.
- [ ] Remove all saved keys -> both gone.
- [ ] In a page console (isolated world cannot be used; use the extension's content-script context in DevTools) `chrome.storage.session.get(null)` fails or returns nothing.
