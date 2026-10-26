// Builds a safe download filename (with .png) for an event QR code.
// Strips characters invalid on Windows/macOS, keeps Thai and spaces.
function sanitizeFilename(s) {
  return String(s == null ? '' : s)
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
}

function qrFilename(name, slug) {
  const base = sanitizeFilename(name) || sanitizeFilename(slug) || 'event-qr';
  return base + '.png';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sanitizeFilename, qrFilename };
}
