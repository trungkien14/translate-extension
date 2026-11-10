/*
 * MyMemory — VERIFIED (docs: mymemory.translated.net/doc/spec.php)
 *  - keyless GET /get?q=&langpair=src|tgt ; optional `de` = email (raises quota 5,000 -> 50,000 chars/day)
 *  - q limited to 500 bytes (we chunk). Does not return a detected language (we detect locally).
 */
import { ProviderError, fetchJson } from './http.js';

const ENDPOINT = 'https://api.mymemory.translated.net/get';

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export default {
  id: 'mymemory',
  name: 'MyMemory',
  capabilities: { autoDetect: false, alternatives: true, maxBytes: 500 },
  isConfigured: () => true,

  async translate({ text, source, target, secrets }) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('q', text);
    url.searchParams.set('langpair', `${source}|${target}`);
    if (secrets.mymemoryEmail) url.searchParams.set('de', secrets.mymemoryEmail);

    const { status, data } = await fetchJson(url.toString());
    if (status === 429) throw new ProviderError('QUOTA', 'MyMemory daily limit reached. Add an email in Settings (50,000 chars/day) or try tomorrow.', { status });
    if (!data || !data.responseData) throw new ProviderError('BAD_RESPONSE', 'MyMemory returned an unexpected response.', { status });

    const rs = Number(data.responseStatus);
    const translated = data.responseData.translatedText || '';
    if (/MYMEMORY WARNING/i.test(translated) || rs === 429) {
      throw new ProviderError('QUOTA', 'MyMemory daily limit reached. Add an email in Settings (50,000 chars/day) or try tomorrow.', { status: 429 });
    }
    if (rs === 403 || /INVALID LANGUAGE PAIR/i.test(String(data.responseDetails || ''))) {
      throw new ProviderError('UNSUPPORTED', `MyMemory does not support this language pair (${source} → ${target}).`, { status: 403 });
    }
    if (rs !== 200 || !translated) {
      throw new ProviderError('UPSTREAM', String(data.responseDetails || 'MyMemory could not translate this text.'), { status: rs });
    }

    const main = decodeEntities(translated);
    // MyMemory 'matches' are translation-memory segments and are often unrelated longer sentences.
    // Keep only short inputs and alternatives of similar length to the main translation.
    const alternatives = [];
    const mainLen = main.trim().length;
    const inputWords = text.trim().split(/\s+/).length;
    if (inputWords <= 4 && Array.isArray(data.matches)) {
      for (const m of data.matches) {
        const t = m && m.translation ? decodeEntities(m.translation).trim() : '';
        if (!t || t.toLowerCase() === main.trim().toLowerCase() || alternatives.includes(t)) continue;
        if (t.length > Math.max(mainLen * 2, mainLen + 12)) continue;
        if (t.split(/\s+/).length > 6) continue;
        alternatives.push(t);
        if (alternatives.length >= 4) break;
      }
    }
    return { text: main, alternatives };
  }
};
