/* Translation orchestration: detection -> provider (chunked) -> history. Pure logic, no UI. */
import '../shared/constants.js';
import '../shared/languages.js';
import '../shared/storage.js';
import { chunkText } from './chunk.js';
import { detectLanguage } from './detect.js';
import { getProvider } from './providers/index.js';
import { ProviderError } from './providers/http.js';

const BT = globalThis.BT;
const cache = new Map(); // small in-memory memo (avoids duplicate API calls); lost when the worker sleeps
const CACHE_MAX = 60;

function memoGet(k) {
  if (!cache.has(k)) return null;
  const v = cache.get(k);
  cache.delete(k); cache.set(k, v);
  return v;
}
function memoSet(k, v) {
  cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

export async function translate({ text, source, target, save = false, providerId }) {
  let clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) throw new ProviderError('UNSUPPORTED', 'There is no text to translate.');
  let truncated = false;
  if (clean.length > BT.MAX_SELECTION_CHARS) { clean = clean.slice(0, BT.MAX_SELECTION_CHARS); truncated = true; }

  const settings = await BT.storage.getSettings();
  const secrets = await BT.storage.getSecrets();
  const provider = getProvider(providerId || settings.provider);
  const config = (settings.providerConfig && settings.providerConfig[provider.id]) || {};
  target = target || settings.targetLang;
  source = source || (settings.autoDetect ? 'auto' : settings.sourceLang || 'auto');

  if (!provider.isConfigured(config, secrets)) {
    throw new ProviderError('NOT_CONFIGURED', `${provider.name} is not configured. Open Settings → Translation provider.`);
  }

  // Language detection
  let effectiveSource = source;
  let detected = null;
  if (source === 'auto') {
    if (!provider.capabilities.autoDetect) {
      detected = await detectLanguage(clean);
      effectiveSource = detected;
    }
  } else {
    detected = source;
  }

  const base = { target, provider: { id: provider.id, name: provider.name }, truncated };
  if (effectiveSource !== 'auto' && effectiveSource === target) {
    return { ...base, translation: clean, source: effectiveSource, detectedSource: detected || effectiveSource, alternatives: [], sameLanguage: true };
  }

  const key = [provider.id, effectiveSource, target, clean].join('\u0001');
  let out = memoGet(key);
  if (!out) {
    const maxBytes = provider.capabilities.maxBytes;
    const chunks = chunkText(clean, maxBytes);
    const parts = [];
    let alternatives = [];
    let providerDetected = null;
    let srcForChunks = effectiveSource;
    for (const chunk of chunks) {
      const r = await provider.translate({ text: chunk, source: srcForChunks, target, config, secrets });
      parts.push(r.text);
      if (!providerDetected && r.detectedSource) {
        providerDetected = BT.normalizeLang(r.detectedSource);
        if (srcForChunks === 'auto') srcForChunks = providerDetected; // keep later chunks consistent
      }
      if (chunks.length === 1) alternatives = r.alternatives || [];
    }
    const joiner = BT.isCJK(target) ? '' : ' ';
    out = {
      translation: parts.join(joiner).trim(),
      providerDetected,
      alternatives
    };
    memoSet(key, out);
  }

  let finalSource = effectiveSource;
  if (finalSource === 'auto') {
    finalSource = out.providerDetected || (await detectLanguage(clean));
    detected = finalSource;
  }

  const result = {
    ...base,
    translation: out.translation,
    source: finalSource,
    detectedSource: detected || finalSource,
    alternatives: out.alternatives,
    sameLanguage: false
  };

  if (save && settings.history.enabled) {
    try {
      await BT.storage.addHistory(
        { text: clean, translation: result.translation, source: result.source, target },
        settings.history.limit
      );
    } catch (e) { /* history failure must never break translation */ }
  }
  return result;
}
