/*
 * LibreTranslate — VERIFIED from the project README:
 *  - POST {server}/translate  JSON {q, source|"auto", target, format, api_key?}
 *  - response {translatedText, detectedLanguage:{language,confidence}} (when source=auto)
 *  - Free only when SELF-HOSTED. libretranslate.com requires a paid API key.
 * NOT verified: exact code for Chinese on every server version (we send "zh").
 * Host permission for the user's server origin is requested at runtime from the options page.
 */
import { ProviderError, fetchJson } from './http.js';

function toLtCode(code) {
  if (code === 'zh-CN') return 'zh';
  if (code === 'zh-TW') return 'zh'; // TODO(verify): some servers expose zh-Hant
  return code;
}

function normalizeBase(url) {
  try {
    const u = new URL(String(url || '').trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch (e) {
    return null;
  }
}

export default {
  id: 'libretranslate',
  name: 'LibreTranslate',
  capabilities: { autoDetect: true, alternatives: false, maxBytes: null },

  isConfigured(config) { return !!normalizeBase(config && config.url); },

  async translate({ text, source, target, config, secrets }) {
    const base = normalizeBase(config && config.url);
    if (!base) throw new ProviderError('NOT_CONFIGURED', 'LibreTranslate server URL is not set. Open Settings → Translation provider.');

    const origin = new URL(base).origin + '/*';
    const granted = await chrome.permissions.contains({ origins: [origin] });
    if (!granted) {
      throw new ProviderError('NOT_CONFIGURED', 'Permission for the LibreTranslate server has not been granted. Open Settings and press Save on the provider.');
    }
    if (/(^|\.)libretranslate\.com$/i.test(new URL(base).hostname) && !secrets.libretranslateKey) {
      throw new ProviderError('NOT_CONFIGURED', 'libretranslate.com requires an API key. Add one in Settings or use a self-hosted server.');
    }

    const body = { q: text, source: source === 'auto' ? 'auto' : toLtCode(source), target: toLtCode(target), format: 'text' };
    if (secrets.libretranslateKey) {
      const u = new URL(base);
      const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]';
      if (u.protocol !== 'https:' && !local) {
        throw new ProviderError('NOT_CONFIGURED', 'Refusing to send your API key over plain HTTP. Use an https:// server URL (http is allowed only for localhost).');
      }
      body.api_key = secrets.libretranslateKey;
    }

    const { status, data } = await fetchJson(base + '/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeoutMs: 15000
    });

    if (status === 403 || status === 401) throw new ProviderError('AUTH', (data && data.error) || 'LibreTranslate rejected the API key.', { status });
    if (status === 429) throw new ProviderError('QUOTA', (data && data.error) || 'LibreTranslate rate limit reached.', { status, retryable: true });
    if (status >= 400) throw new ProviderError('UPSTREAM', (data && data.error) || `LibreTranslate error (HTTP ${status}).`, { status });
    if (!data || typeof data.translatedText !== 'string') throw new ProviderError('BAD_RESPONSE', 'LibreTranslate returned an unexpected response.', { status });

    return {
      text: data.translatedText,
      detectedSource: data.detectedLanguage && data.detectedLanguage.language ? data.detectedLanguage.language : null,
      alternatives: []
    };
  }
};
