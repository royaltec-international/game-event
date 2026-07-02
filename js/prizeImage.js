function fitDimensions(width, height, maxSize) {
  if (width <= maxSize && height <= maxSize) return { width, height };
  const scale = maxSize / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function prizeImagePath(eventId, prizeId) {
  return `${eventId}/${prizeId}.webp`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fitDimensions, prizeImagePath };
}
