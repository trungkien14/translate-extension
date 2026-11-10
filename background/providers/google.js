/*
 * Google Cloud Translation Basic (v2) — VERIFIED from Google docs/pricing:
 *  - POST https://translation.googleapis.com/language/translate/v2 with header X-goog-api-key: API_KEY, JSON {q, target, source?, format}
 *  - response data.translations[0].{translatedText, detectedSourceLanguage}
 *  - first 500,000 chars/month free, then $20 per 1M chars; a billing-enabled Cloud project is required.
 * The key is user-supplied and stored in chrome.storage.local (never in source). Restrict it in Cloud Console.
 */
import { ProviderError, fetchJson } from './http.js';

export default {
  id: 'google',
  name: 'Google Cloud Translation',
  capabilities: { autoDetect: true, alternatives: false, maxBytes: null },

  isConfigured(config, secrets) { return !!(secrets && secrets.googleKey); },

  async translate({ text, source, target, secrets }) {
    if (!secrets.googleKey) throw new ProviderError('NOT_CONFIGURED', 'Google Cloud Translation needs an API key. Add one in Settings → Translation provider.');

    const body = { q: text, target, format: 'text' };
    if (source && source !== 'auto') body.source = source;

    // Key goes in a header, not the URL, so it cannot leak through URLs shown in DevTools, logs or error messages.
    const url = 'https://translation.googleapis.com/language/translate/v2';
    const { status, data } = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': secrets.googleKey },
      body: JSON.stringify(body)
    });

    if (status >= 400) {
      const msg = (data && data.error && data.error.message) || `Google Translation error (HTTP ${status}).`;
      if (status === 400 && /api key/i.test(msg)) throw new ProviderError('AUTH', 'Google rejected the API key. Check it in Settings.', { status });
      if (status === 401 || status === 403) throw new ProviderError('AUTH', 'Google denied the request (key restricted, API disabled, or billing off).', { status });
      if (status === 429) throw new ProviderError('QUOTA', 'Google Translation quota exceeded.', { status, retryable: true });
      throw new ProviderError('UPSTREAM', msg, { status });
    }
    const t = data && data.data && data.data.translations && data.data.translations[0];
    if (!t || typeof t.translatedText !== 'string') throw new ProviderError('BAD_RESPONSE', 'Google returned an unexpected response.', { status });

    return { text: t.translatedText, detectedSource: t.detectedSourceLanguage || null, alternatives: [] };
  }
};
