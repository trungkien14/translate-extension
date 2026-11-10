/* Split text into pieces of at most `maxBytes` UTF-8 bytes, preferring sentence, then word, then character boundaries. */
const enc = new TextEncoder();
const bytes = (s) => enc.encode(s).length;

function hardSplit(s, maxBytes) {
  const out = [];
  let cur = '';
  for (const ch of Array.from(s)) {
    if (bytes(cur + ch) > maxBytes) { out.push(cur); cur = ch; } else { cur += ch; }
  }
  if (cur) out.push(cur);
  return out;
}

export function chunkText(text, maxBytes) {
  if (!maxBytes || bytes(text) <= maxBytes) return [text];
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？]*\s*|\n+/g) || [text];
  const pieces = [];
  for (const s of sentences) {
    if (bytes(s) <= maxBytes) { pieces.push(s); continue; }
    // sentence too long: split on whitespace, then hard-split anything still too long
    for (const w of s.split(/(?<=\s)/)) {
      if (bytes(w) <= maxBytes) pieces.push(w); else pieces.push(...hardSplit(w, maxBytes));
    }
  }
  const chunks = [];
  let cur = '';
  for (const p of pieces) {
    if (cur && bytes(cur + p) > maxBytes) { chunks.push(cur); cur = p; } else { cur += p; }
  }
  if (cur) chunks.push(cur);
  return chunks.map((c) => c.trim()).filter(Boolean);
}
