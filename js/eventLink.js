function buildEventUrl(origin, slug) {
  return origin.replace(/\/$/, '') + '/index.html?event=' + encodeURIComponent(slug);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildEventUrl };
}
