/* HTTP helper + shared error type for providers. */
export class ProviderError extends Error {
  /** code: NOT_CONFIGURED | AUTH | QUOTA | NETWORK | TIMEOUT | UNSUPPORTED | BAD_RESPONSE | UPSTREAM | NOT_FOUND */
  constructor(code, message, { retryable = false, status = 0 } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

/** Fetch with timeout. Resolves {status, ok, data} (data = parsed JSON or null). Throws ProviderError on network/timeout. */
export async function fetchJson(url, { method = 'GET', headers, body, timeoutMs = 10000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res;
    try {
      res = await fetch(url, { method, headers, body, signal: ctrl.signal, credentials: 'omit' });
    } catch (e) {
      if (e && e.name === 'AbortError') {
        throw new ProviderError('TIMEOUT', 'The service took too long to respond. Try again.', { retryable: true });
      }
      throw new ProviderError('NETWORK', 'Could not reach the service. Check your internet connection.', { retryable: true });
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      if (e && e.name === 'AbortError') {
        throw new ProviderError('TIMEOUT', 'The service took too long to respond. Try again.', { retryable: true });
      }
      /* non-JSON body */
    }
    return { status: res.status, ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}
