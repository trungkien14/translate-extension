# Brave Translate

Select text on any web page, click the small floating button (or press **Alt+Shift+T**), and see the translation in a
compact modal — with the detected language, copy and pronunciation buttons, and, for English words, dictionary details
(IPA, definitions, examples, synonyms).

> Status: the API-key security, "Remember on this device", parallel chunking and Gemini low-thinking changes of 2026-11-10
> were checked by hand in Brave by the user. The provider list was then reduced to MyMemory + Gemini (that change was checked by the assistant with syntax and mock tests only).
> The full scenario list in docs/TESTING.md has **not** been recorded as run. See DEVELOPMENT_STATUS.md.

## Install (unpacked)
1. Open `brave://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and choose this folder.
3. Pin the extension from the puzzle-piece menu if you want the toolbar popup handy.

## Use
- Select a word, phrase, or sentence -> click the round button -> read the translation. Esc or a click outside closes it.
- Change languages in the modal header, or in Settings. The target language is remembered. The swap button translates the result back.
- Original and translation each have a speaker button (browser voice) and a copy button; English words also show IPA, definitions, examples, synonyms and, when available, a recorded pronunciation.
- Toolbar icon: type or paste text to translate, see recent translations, toggle the selection popup.
- Shortcut: Alt+Shift+T. To change it, paste `brave://extensions/shortcuts` into the address bar.
- Saved words: single looked-up words are saved automatically (word, meaning, IPA for English). Manage or export them as CSV in Settings -> Saved words.
- History: kept locally, size and on/off in Settings -> History.

## Troubleshooting
| Message / symptom | Likely cause and fix |
|---|---|
| "Your API keys are locked" | encrypted keys not unlocked this session: Settings -> Security of API keys -> passphrase -> Unlock |
| "Wrong passphrase" | retype it; if forgotten, use Remove all saved keys |
| "... is not configured" | no Gemini key saved while Gemini is selected |
| Key rejected / denied | Gemini key wrong, restricted, or not allowed in your region |
| Gemini "model not found" | copy a current Flash model name from AI Studio into the Model box |
| Quota / rate limit | wait and retry, add an email for MyMemory, or switch between MyMemory and Gemini |
| Translation feels slow | Gemini already runs with minimal thinking; try a lighter Flash model. Long text with MyMemory is split into pieces |
| Nothing appears on a page | brave://, the Web Store, the PDF viewer and file:// pages are not supported; reload the page after reloading the extension |

## Translation providers
Only two providers are supported: MyMemory (default, no key) and Gemini (free key). Google Cloud Translation, Microsoft Translator and LibreTranslate were removed on 2026-11-10.

| Provider | Needs | Notes |
|---|---|---|
| MyMemory (default) | nothing | ~5,000 chars/day anonymously; ~50,000 with an email (Settings) |
| Gemini (Google AI Studio) | free API key from aistudio.google.com, no billing card | best for phrases/idioms; free-tier data may be used by Google to improve its products |

## Entering API keys
MyMemory works with no key. Gemini needs one. Open Settings first: `brave://extensions` -> Brave Translate -> Details -> Extension options (or the Settings link in the toolbar popup).

### 1. Get a Gemini key
Sign in at aistudio.google.com -> Get API key. No billing card for the free tier; free-tier text may be used by Google to improve its products, so do not translate confidential text.
Use a dedicated key, set a quota or budget alert if offered, and revoke it in AI Studio if you suspect a leak.

### 2. Enter and save it
1. In Settings -> **Translation provider**, choose **Gemini**.
2. Paste the key into the **API key** box (optionally change the **Model** name).
3. Press **Save**. The box then shows "saved - type to replace"; saved keys are never displayed again.
4. Press **Test connection**. A green result means it works. To replace a key, just type a new one and Save.

### 3. Protect it with a passphrase (recommended)
By default a saved key is stored unencrypted in your Brave profile. To encrypt it:
1. Scroll to **Security of API keys**, type a passphrase (at least 8 characters) twice, press **Encrypt keys**.
2. Decide about **Remember on this device** *before* pressing the button:
   - **Off (safer):** after each browser start, open Settings, type the passphrase, press **Unlock** once. Until you do, key-based providers show "keys are locked" with an *Open settings* button (MyMemory still works).
   - **On (more convenient):** no passphrase after restarts. The unlock key is then stored on disk next to the encrypted keys, so it only stops casual reading, not someone who copies your browser profile.
3. Once encrypted, saving or replacing a key works only while unlocked.

| Situation | What you need to do |
|---|---|
| Refresh a web page | nothing |
| Reload the extension (round arrow in `brave://extensions`) | keys stay; unlocked state is lost, so type the passphrase again unless "Remember" is on |
| Restart Brave | same as above |
| Lock manually | **Lock now** (also forgets "Remember") |
| Stop using encryption | type the passphrase, press **Remove encryption** |
| Forgot the passphrase | not recoverable: press **Remove all saved keys** and enter the keys again |
| Remove the extension and Load unpacked again, or move its folder | new extension ID: all settings and keys are gone, enter them again |

Keep the project folder in the same place and use the reload button, not remove/re-add.

Keys are stored in `chrome.storage.local` of your browser profile; they are not in the source code. By default they are
unencrypted until you encrypt them as above. See docs/SECURITY.md for what this does and does not protect.

Speed: Gemini runs with thinking set to the minimum (`minimal` on Gemini 3.x, budget 0 on 2.5 Flash). If it is still slow, try a
lighter Flash model name in Settings. MyMemory splits long text into 500-byte pieces and sends up to 3 at a time.

MyMemory is convenient but is a translation-memory service: results for phrases and idioms are often poor. Gemini gives better phrase and idiom quality.

## Privacy
Selected text is sent only to the provider you choose (and to api.dictionaryapi.dev for English word lookups). History
is stored locally and can be cleared in Settings.

## Limitations
Does not work on brave:// / chrome:// pages, the Web Store, extension pages, the built-in PDF viewer, or file:// pages.
Speaker buttons use browser text-to-speech (synthesized) and need a system voice for the language. Dictionary details are
English-only. Other limits: TECHNICAL_DECISIONS.md.

## Project docs
PROJECT_CONTEXT.md (start here) · DEVELOPMENT_STATUS.md · TASK_TRACKER.md · TECHNICAL_DECISIONS.md · CHANGELOG.md ·
NEXT_SESSION_PROMPT.md · docs/DESIGN_SYSTEM.md · docs/TESTING.md
