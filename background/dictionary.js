/*
 * Dictionary: Free Dictionary API (api.dictionaryapi.dev) — English only, keyless.
 * Verified fields: word, phonetic(s)[{text,audio}], meanings[{partOfSpeech, definitions[{definition,example,synonyms}], synonyms}].
 * Reported: 450 requests / 5 min / IP, and occasional slowness/outages -> short timeout, caching, graceful failure.
 */
import { ProviderError, fetchJson } from './providers/http.js';

const cache = new Map();
const CACHE_MAX = 100;
const WORD_RE = /^[A-Za-z][A-Za-z'’-]{0,39}$/;

function uniq(arr) { return Array.from(new Set(arr.filter(Boolean))); }

function audioLabel(url) {
  const m = /-(us|uk|au)\.(mp3|ogg|wav)/i.exec(url);
  return m ? m[1].toUpperCase() : 'Audio';
}

function normalise(word, entries) {
  let ipa = null;
  const audios = [];
  const meanings = [];
  const synonyms = [];
  for (const e of entries) {
    if (!ipa) ipa = e.phonetic || (e.phonetics || []).map((p) => p.text).find(Boolean) || null;
    for (const p of e.phonetics || []) {
      if (p.audio && /^https:\/\//i.test(p.audio) && !audios.some((a) => a.url === p.audio)) {
        audios.push({ url: p.audio, label: audioLabel(p.audio) });
      }
    }
    for (const m of e.meanings || []) {
      const defs = (m.definitions || []).slice(0, 4).map((d) => ({ definition: d.definition, example: d.example || null }));
      if (!defs.length) continue;
      meanings.push({ pos: m.partOfSpeech || '', definitions: defs });
      synonyms.push(...(m.synonyms || []));
      for (const d of m.definitions || []) synonyms.push(...(d.synonyms || []));
    }
  }
  return {
    found: true,
    word,
    ipa,
    audios: audios.slice(0, 3),
    meanings: meanings.slice(0, 4),
    synonyms: uniq(synonyms).slice(0, 10),
    source: 'Free Dictionary API (Wiktionary)'
  };
}

export async function lookupEnglish(rawWord) {
  const word = String(rawWord || '').trim();
  if (!WORD_RE.test(word)) throw new ProviderError('UNSUPPORTED', 'Not a single English word.');
  const key = word.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const { status, data } = await fetchJson(
    'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(key),
    { timeoutMs: 8000 }
  );
  let result;
  if (status === 404) result = { found: false, word };
  else if (status === 429) throw new ProviderError('QUOTA', 'Dictionary rate limit reached. Try again in a few minutes.', { status, retryable: true });
  else if (status >= 400 || !Array.isArray(data)) throw new ProviderError('UPSTREAM', 'The dictionary service is unavailable right now.', { status, retryable: true });
  else result = normalise(word, data);

  cache.set(key, result);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return result;
}
