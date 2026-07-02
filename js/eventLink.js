function buildEventUrl(origin, slug) {
  return origin.replace(/\/$/, '') + '/index.html?event=' + encodeURIComponent(slug);
}

function pageDirectoryUrl(origin, pathname) {
  return origin.replace(/\/$/, '') + pathname.replace(/[^/]*$/, '');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildEventUrl, pageDirectoryUrl };
}
