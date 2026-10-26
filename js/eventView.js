// Decides which view the game page shows. Every link/QR carries ?event=<slug>;
// without a slug, or when the event could not be loaded, there is no game to play.
// slug: result of resolveEventSlug() (string | null); config: loaded event config (object | null)
// loadFailed: true when the server could not be reached (network/5xx) — the event may exist
function decideView(slug, config, loadFailed = false) {
  if (!slug) return 'not-found';
  if (loadFailed) return 'unavailable';
  if (!config || typeof config !== 'object') return 'not-found';
  return 'game';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { decideView };
}
