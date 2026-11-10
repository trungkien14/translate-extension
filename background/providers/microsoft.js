/*
 * Microsoft Translator (Azure AI Translator) — v3.0 Text Translation.
 * VERIFIED from Microsoft Learn (v3.0 reference) and the Azure pricing page:
 *  - POST https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=<code>[&from=<code>]
 *  - headers: Ocp-Apim-Subscription-Key (secret key); Ocp-Apim-Subscription-Region (required for regional / multi-service
 *    resources, optional for a global Translator resource); Content-Type: application/json
 *  - body: [{"Text": "..."}]  ->  response: [{"translations":[{"text":"...","to":"vi"}]}]
 *  - pricing page lists a free F0 tier of 2 million characters/month (an Azure account is required; check the current terms when signing up).
 * NOT verified in a live call: the `detectedLanguage` field when `from` is omitted (read defensively), and the exact codes
 * zh-Hans / zh-Hant for Chinese (best knowledge of the service's language list).
 * The key is user-supplied and stored in chrome.storage.local; it is never in source.
 */
import { ProviderError, fetchJson } from './http.js';

const ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate';

function toMsCode(code) {
  if (code === 'zh-CN') return 'zh-Hans';
  if (code === 'zh-TW') return 'zh-Hant';
  return code;
}

export default {
  id: 'microsoft',
  name: 'Microsoft Translator',
  capabilities: { autoDetect: true, alternatives: false, maxBytes: null },

  isConfigured(config, secrets) { return !!(secrets && secrets.microsoftKey); },

  async translate({ text, source, target, secrets }) {
    if (!secrets.microsoftKey) {
      throw new ProviderError('NOT_CONFIGURED', 'Microsoft Translator needs an API key. Add one in Settings → Translation provider.');
    }
    const url = new URL(ENDPOINT);
    url.searchParams.set('api-version', '3.0');
    url.searchParams.set('to', toMsCode(target));
    if (source && source !== 'auto') url.searchParams.set('from', toMsCode(source));

    const headers = { 'Ocp-Apim-Subscription-Key': secrets.microsoftKey, 'Content-Type': 'application/json; charset=UTF-8' };
    if (secrets.microsoftRegion) headers['Ocp-Apim-Subscription-Region'] = secrets.microsoftRegion;

    const { status, data } = await fetchJson(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify([{ Text: text }])
    });

    if (status >= 400) {
      const msg = data && data.error && data.error.message;
      if (status === 401 || status === 403) {
        throw new ProviderError('AUTH', 'Microsoft rejected the key. Check the key, and enter the resource region in Settings if your resource is not global.', { status });
      }
      if (status === 429) throw new ProviderError('QUOTA', 'Microsoft Translator rate or quota limit reached.', { status, retryable: true });
      throw new ProviderError('UPSTREAM', msg || `Microsoft Translator error (HTTP ${status}).`, { status });
    }
    const first = Array.isArray(data) && data[0];
    const t = first && first.translations && first.translations[0];
    if (!t || typeof t.text !== 'string') throw new ProviderError('BAD_RESPONSE', 'Microsoft Translator returned an unexpected response.', { status });

    return {
      text: t.text,
      detectedSource: first.detectedLanguage && first.detectedLanguage.language ? first.detectedLanguage.language : null,
      alternatives: []
    };
  }
};
