# NEXT_SESSION_PROMPT (paste this whole file into the new Claude session)

You are continuing development of **Brave Translate**, a Manifest V3 translation extension for Brave, in
`D:\Vibe\TranslateExtension`. Use the Filesystem/FileStream tools to read and write files there. Do not give me code to
paste; edit the files directly. Reply in the language I write to you in (usually Vietnamese).

## Read first, in this order
1. `PROJECT_CONTEXT.md` (overview, architecture, message protocol, providers)
2. `DEVELOPMENT_STATUS.md` and `TASK_TRACKER.md`
3. `TECHNICAL_DECISIONS.md` (LOCKED decisions: do not reverse)
4. Only the source files relevant to your current task. Do not re-read everything.
If the docs and the source disagree, the source is the truth: fix the docs first.

## State
- All planned files exist: manifest, shared/, background/ (+providers/), content/, offscreen/, popup/, options/.
- NOTHING has been run in Brave yet. Treat all code as unverified. Never mark a test as passed unless it was actually run.
- Missing: PNG icons, Microsoft Translator provider (never researched), extra pronunciation provider.

## Do NOT
- Rebuild the project, change the architecture, add a build step or dependencies, delete working code,
  repeat completed tasks, hardcode API keys, scrape translation websites, or claim provider features you did not verify.

## Next specific task
1. Ask me to load the extension (`brave://extensions` -> Developer mode -> Load unpacked) and to paste any errors from the
   extension card's **Errors** button, the service-worker console, and the options page console.
2. Fix each reported error in the smallest possible edit.
3. Walk me through `docs/TESTING.md` scenarios one group at a time; record real results in TASK_TRACKER.md section 9.
4. Then add icons (I can supply PNGs; text tools cannot create binaries) and update manifest `icons`/`action.default_icon`.

## Files most likely to need attention
`content/ui.js` (positioning, modal behavior), `content/main.js` (selection events), `options/options.js`,
`popup/popup.js` (written last, least reviewed), `background/audio.js` + `offscreen/` (recorded audio),
`content/tts.js` (Brave Shields may hide speech voices).

## Verify previous work
- Reload the extension, reload the test page, select a word, click the round button.
- Service worker console: `chrome.storage.local.get(null, console.log)`.
- Options page -> Test connection (MyMemory should translate "Hello").

## Known constraints
- Restricted pages (brave://, chrome://, Web Store, PDF viewer, file://) are unsupported by design.
- MyMemory limits: 500 bytes per request (chunked), ~5,000 chars/day anonymous.
- Dictionary API is English-only and sometimes unreliable.

## Before you stop
Update DEVELOPMENT_STATUS.md, TASK_TRACKER.md, CHANGELOG.md and this file. If usage is nearly exhausted, stop new work,
document the partial task and the exact remaining steps, and leave the project in a recoverable state.
