/* Background service worker: message router, keyboard command, first-run defaults. No long-lived state. */
import '../shared/constants.js';
import '../shared/languages.js';
import '../shared/storage.js';
import { translate } from './translate.js';
import { lookupEnglish } from './dictionary.js';
import { playRecordedAudio } from './audio.js';
import { ProviderError } from './providers/http.js';

const BT = globalThis.BT;

function toError(e) {
  if (e instanceof ProviderError) return { code: e.code, message: e.message, retryable: e.retryable };
  return { code: 'UNKNOWN', message: (e && e.message) || 'Something went wrong.', retryable: true };
}

async function handle(msg) {
  switch (msg.type) {
    case BT.MSG.TRANSLATE:
      return translate({ text: msg.text, source: msg.source, target: msg.target, save: !!msg.save });
    case BT.MSG.TEST_PROVIDER:
      return translate({ text: 'Hello', source: 'en', target: 'es', save: false, providerId: msg.provider });
    case BT.MSG.SAVE_WORD: {
      const s = await BT.storage.getSettings();
      if (!s.words.enabled) return { saved: false };
      const word = String(msg.word || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
      const translation = String(msg.translation || '').trim();
      if (!word || word.length > 60 || /\s/.test(word) || !translation) return { saved: false };
      await BT.storage.upsertWord(
        { word, translation: translation.slice(0, 300), ipa: String(msg.ipa || '').slice(0, 80), source: msg.source, target: msg.target },
        s.words.limit
      );
      return { saved: true };
    }
    case BT.MSG.DICTIONARY:
      return lookupEnglish(msg.word);
    case BT.MSG.PLAY_AUDIO:
      await playRecordedAudio(msg.url);
      return { played: true };
    case BT.MSG.OPEN_OPTIONS:
      await chrome.runtime.openOptionsPage();
      return {};
    default:
      throw new Error('Unknown message type.');
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target === 'offscreen' || typeof msg.type !== 'string' || !msg.type.startsWith('bt/')) return false;
  if (sender.id !== chrome.runtime.id) return false;
  handle(msg).then(
    (data) => sendResponse({ ok: true, data }),
    (e) => sendResponse({ ok: false, error: toError(e) })
  );
  return true; // async response
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'activate-translation') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || tab.id == null) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: BT.MSG.ACTIVATE });
  } catch (e) {
    /* restricted page (brave://, Web Store, PDF viewer) or content script not present: nothing to do */
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  // Materialise defaults so every context reads the same values.
  const s = await BT.storage.getSettings();
  await chrome.storage.local.set({ [BT.KEYS.SETTINGS]: s });
});
