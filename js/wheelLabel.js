// Split a wheel label into two lines near the middle. Prefers a space;
// otherwise a word boundary (Intl.Segmenter knows Thai), so a line never
// starts with a detached vowel or tone mark. Returns [text] if unsplittable.
function splitLabel(text) {
  const mid = text.length / 2;
  let cuts = [];
  for (let i = 1; i < text.length; i++) if (text[i] === ' ') cuts.push(i);

  if (cuts.length > 0) {
    const at = cuts.reduce((best, c) => Math.abs(c - mid) < Math.abs(best - mid) ? c : best);
    return [text.slice(0, at).trim(), text.slice(at).trim()];
  }

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter('th', { granularity: 'word' });
    cuts = [...seg.segment(text)].map(s => s.index).filter(i => i > 0);
  }
  if (cuts.length === 0) return [text];
  const at = cuts.reduce((best, c) => Math.abs(c - mid) < Math.abs(best - mid) ? c : best);
  return [text.slice(0, at), text.slice(at)];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { splitLabel };
}
