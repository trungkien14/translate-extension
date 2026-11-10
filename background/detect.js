/* Local language detection: script heuristics first (reliable for CJK/Vietnamese), then chrome.i18n.detectLanguage. */
import '../shared/languages.js';
const BT = globalThis.BT;

const KANA = /[\u3040-\u30ff\u31f0-\u31ff]/;
const HANGUL = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const VI = /[ăâđêôơưĂÂĐÊÔƠƯạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ]/;
const CYRILLIC = /[\u0400-\u04ff]/;
const THAI = /[\u0e00-\u0e7f]/;

function i18nDetect(text) {
  return new Promise((resolve) => {
    try {
      chrome.i18n.detectLanguage(text, (r) => resolve(chrome.runtime.lastError ? null : r));
    } catch (e) {
      resolve(null);
    }
  });
}

/** @returns {Promise<string>} one of our language codes (best effort; defaults to 'en'). */
export async function detectLanguage(text) {
  if (KANA.test(text)) return 'ja';
  if (HANGUL.test(text)) return 'ko';
  if (THAI.test(text)) return 'th';
  if (HAN.test(text)) {
    const r = await i18nDetect(text);
    const top = r && r.languages && r.languages[0] && r.languages[0].language;
    return top && /^zh-(tw|hant)/i.test(top) ? 'zh-TW' : 'zh-CN';
  }
  if (CYRILLIC.test(text)) return 'ru';
  if (VI.test(text)) return 'vi';

  const r = await i18nDetect(text);
  if (r && r.languages && r.languages.length) {
    const top = r.languages[0];
    // Very short Latin-script text (1-2 words) is easily misdetected (e.g. "challenges" -> Dutch):
    // trust the detector only when it says the result is reliable, otherwise fall back to English.
    const shortText = text.trim().split(/\s+/).length <= 2;
    if (r.isReliable || (!shortText && top.percentage >= 60)) {
      const code = BT.normalizeLang(top.language);
      if (code && code !== 'und') return code;
    }
  }
  return 'en';
}
