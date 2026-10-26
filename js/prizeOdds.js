function computeUsedMap(prizeRows) {
  const map = {};
  prizeRows.forEach(row => { map[row.id] = row.used || 0; });
  return map;
}

// Stock + win chance per prize. Chance = remaining / total remaining,
// the same rule draw_prize() uses on the server.
function prizeStats(prizes, usedMap) {
  const byId = {};
  const totals = { quantity: 0, used: 0, remaining: 0 };
  prizes.forEach(p => {
    const quantity = +p.quantity || 0;
    const used = usedMap[p.id] || 0;
    const remaining = Math.max(0, quantity - used);
    byId[p.id] = { used, remaining, pct: 0 };
    totals.quantity += quantity;
    totals.used += used;
    totals.remaining += remaining;
  });
  if (totals.remaining > 0) {
    prizes.forEach(p => {
      byId[p.id].pct = Math.round((byId[p.id].remaining / totals.remaining) * 1000) / 10;
    });
  }
  return { byId, totals };
}

// Prizes whose quantity is set lower than what was already given out —
// the database rejects these (prizes_used_within_quantity).
function quantityBelowUsed(prizes, usedMap) {
  return prizes
    .filter(p => (+p.quantity || 0) < (usedMap[p.id] || 0))
    .map(p => ({ id: p.id, label: p.label, quantity: +p.quantity || 0, used: usedMap[p.id] }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeUsedMap, prizeStats, quantityBelowUsed };
}
