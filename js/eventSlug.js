function resolveEventSlug(search) {
  const params = new URLSearchParams(search);
  const slug = params.get('event');
  return slug && slug.trim() !== '' ? slug.trim() : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolveEventSlug };
}
