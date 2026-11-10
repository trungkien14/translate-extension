/* Provider registry. To add a provider: create a module exporting
 * { id, name, capabilities:{autoDetect, alternatives, maxBytes}, isConfigured(config, secrets),
 *   translate({text, source, target, config, secrets}) -> {text, detectedSource?, alternatives?} }
 * and register it here (+ a settings panel in options/). Throw ProviderError for failures. */
import mymemory from './mymemory.js';
import gemini from './gemini.js';

const providers = [mymemory, gemini];

export function getProvider(id) {
  return providers.find((p) => p.id === id) || mymemory;
}
export function listProviders() {
  return providers.map((p) => ({ id: p.id, name: p.name }));
}
