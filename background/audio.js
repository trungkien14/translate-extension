/* Plays provider-supplied (recorded) audio through an offscreen document, so the host page's CSP can never block it. */
const OFFSCREEN_URL = 'offscreen/offscreen.html';
let creating = null;

async function ensureOffscreen() {
  const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (existing.length) return;
  if (!creating) {
    creating = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play dictionary pronunciation audio supplied by the dictionary provider.'
      })
      .finally(() => { creating = null; });
  }
  await creating;
}

export async function playRecordedAudio(url) {
  let u;
  try { u = new URL(url); } catch (e) { throw new Error('Invalid audio URL.'); }
  if (u.protocol !== 'https:') throw new Error('Only https audio is allowed.');
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'bt/offscreen/play', url: u.toString() });
  if (!res || !res.ok) throw new Error((res && res.error) || 'Audio playback failed.');
}
