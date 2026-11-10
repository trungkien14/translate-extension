# Brave Translate

Select text on any web page, click the small floating button (or press **Alt+Shift+T**), and see the translation in a
compact modal — with the detected language, copy and pronunciation buttons, and, for English words, dictionary details
(IPA, definitions, examples, synonyms).

> Status: code is written but has **not yet been verified in Brave**. See DEVELOPMENT_STATUS.md and docs/TESTING.md.

## Install (unpacked)
1. Open `brave://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and choose this folder.
3. Pin the extension from the puzzle-piece menu if you want the toolbar popup handy.

## Use
- Select a word, phrase, or sentence -> click the round button -> read the translation. Esc or a click outside closes it.
- Change languages in the modal header, or in Settings. The target language is remembered.
- Toolbar icon: type or paste text to translate, see recent translations, toggle the selection popup.
- Shortcut: Alt+Shift+T. To change it, paste `brave://extensions/shortcuts` into the address bar.

## Translation providers
| Provider | Needs | Notes |
|---|---|---|
| MyMemory (default) | nothing | ~5,000 chars/day anonymously; ~50,000 with an email (Settings) |
| LibreTranslate | your own server URL (+ key if required) | free only when self-hosted; Save asks for permission to that server |
| Google Cloud Translation | API key, billing-enabled project | first 500k chars/month free (per Google pricing at time of research) |
| Microsoft Translator | Azure Translator key (+ region if regional) | pricing page lists a free tier of 2M chars/month; Azure account required |

Keys are stored in `chrome.storage.local` of your browser profile; they are not in the source code. Extension storage is
not encrypted, so restrict the Google key in Cloud Console.

MyMemory is convenient but is a translation-memory service: results for phrases and idioms are often poor. For better quality use Microsoft or Google.

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
