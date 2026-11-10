/* Offscreen document: plays one audio clip at a time on request from the service worker. */
let audio = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target !== 'offscreen' || msg.type !== 'bt/offscreen/play') return false;
  try {
    if (audio) { audio.pause(); audio = null; }
    audio = new Audio(msg.url);
    audio.play().then(
      () => sendResponse({ ok: true }),
      (e) => sendResponse({ ok: false, error: String((e && e.message) || e) })
    );
  } catch (e) {
    sendResponse({ ok: false, error: String((e && e.message) || e) });
  }
  return true;
});
