# TESTING (manual, in Brave)

There is no automated test runner (no build step, no dependencies). Verification is manual. Record results in
TASK_TRACKER.md section 9 — mark `[x]` only after actually running the step.

## Load the extension
1. Open `brave://extensions`, enable **Developer mode**.
2. **Load unpacked** -> select `D:\Vibe\TranslateExtension`.
3. Check the card shows no **Errors** button. Click **service worker** link -> Console should have no errors.
4. After editing code: click the reload icon on the extension card, then **reload the web page** you test on.

## Quick checks
- Service worker console: `chrome.storage.local.get(null, console.log)` shows `settings`.
- Page console on a normal http(s) page: `document.getElementById('brave-translate-root')` is non-null after selecting text.

## Scenarios (1-20 from the project brief)
Test page ideas: en.wikipedia.org, a Vietnamese news site, ja/zh/ko Wikipedia pages.
1. Single English word -> modal shows large word, translation, IPA/definitions (dictionary).
2. English phrase -> translation, no dictionary card.
3. English sentence -> translation first, smaller type.
4-7. Vietnamese / Japanese / Chinese / Korean selections -> detected language label is right; translation present.
8. Very long paragraph (>500 bytes, and >5000 chars) -> chunked result; truncation notice beyond 5000 chars; "Show more" on original.
9. Select text at the far right edge -> trigger and modal stay inside the viewport.
10. Select text at the bottom edge -> modal opens above the selection.
11. Select repeatedly -> only one trigger / one modal at a time (inspect shadow root of #brave-translate-root).
12. With modal open, select new text -> old modal closes, new trigger appears.
13. Esc closes modal. 14. Click outside closes modal.
15. Copy buttons for original and translation (paste somewhere to confirm).
16-17. Speaker buttons: original and translation. Needs an installed system voice for that language; otherwise an
   inline message says no voice is installed. Check Brave Shields does not hide voices.
18. DevTools -> Network -> Offline (or disconnect), translate -> error with Retry; go online, Retry works.
19. Options -> provider Google with a wrong key -> "Test connection" shows an auth error; LibreTranslate with no URL -> "not configured".
20. Fully quit and reopen Brave -> settings and history still present.

## Additional
21. Popup (toolbar icon): translate box, recent list (open / copy / remove / clear all).
22. Options page: each control persists after reopening; Test connection for MyMemory returns “Hello” -> “Hola”.
23. Shortcut Alt+Shift+T with text selected (also with the selection popup turned off).
24. A React/SPA site and a site with a strict CSP (e.g. github.com).

## Not supported (document, do not "fix")
brave:// and chrome:// pages, Chrome Web Store, extension pages, built-in PDF viewer, file:// URLs.
