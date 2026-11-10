/* Provider registry. To add a provider: create a module exporting
 * { id, name, capabilities:{autoDetect, alternatives, maxBytes}, isConfigured(config, secrets),
 *   translate({text, source, target, config, secrets}) -> {text, detectedSource?, alternatives?} }
 * and register it here (+ a settings panel in options/). Throw ProviderError for failures. */
import mymemory from './mymemory.js';
import libretranslate from './libretranslate.js';
import google from './google.js';
import microsoft from './microsoft.js';

const providers = [mymemory, libretranslate, google, microsoft];

export function getProvider(id) {
  return providers.find((p) => p.id === id) || mymemory;
}
export function listProviders() {
  return providers.map((p) => ({ id: p.id, name: p.name }));
}
