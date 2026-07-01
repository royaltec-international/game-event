function computeRemainingMap(prizeRows) {
  const map = {};
  prizeRows.forEach(row => {
    const remaining = row.quantity - (row.used || 0);
    map[row.id] = Math.max(0, remaining);
  });
  return map;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeRemainingMap };
}
