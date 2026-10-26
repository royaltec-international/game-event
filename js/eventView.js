// Decides which view the game page shows. Every link/QR carries ?event=<slug>;
// without a slug, or when the event could not be loaded, there is no game to play.
// slug: result of resolveEventSlug() (string | null); config: loaded event config (object | null)
function decideView(slug, config) {
  if (!slug) return 'not-found';
  if (!config || typeof config !== 'object') return 'not-found';
  return 'game';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { decideView };
}
