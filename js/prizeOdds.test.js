const { test } = require('node:test');
const assert = require('node:assert');
const { computeUsedMap, prizeStats, quantityBelowUsed } = require('./prizeOdds.js');

test('computeUsedMap maps prize rows to used counts', () => {
  assert.deepStrictEqual(computeUsedMap([{ id: 'a', used: 3 }, { id: 'b', used: null }]), { a: 3, b: 0 });
});

test('prizeStats: chance is proportional to remaining stock, matching draw_prize', () => {
  const stats = prizeStats(
    [{ id: 'pen', quantity: 30 }, { id: 'doll', quantity: 3 }, { id: 'gone', quantity: 5 }],
    { pen: 0, doll: 1, gone: 5 }
  );
  assert.deepStrictEqual(stats.totals, { quantity: 38, used: 6, remaining: 32 });
  assert.deepStrictEqual(stats.byId.pen, { used: 0, remaining: 30, pct: 93.8 });
  assert.deepStrictEqual(stats.byId.doll, { used: 1, remaining: 2, pct: 6.3 });
  assert.deepStrictEqual(stats.byId.gone, { used: 5, remaining: 0, pct: 0 });
});

test('prizeStats: new prize (not in DB yet) counts as unused; all sold out gives 0%', () => {
  const stats = prizeStats([{ id: 'new', quantity: '4' }], {});
  assert.deepStrictEqual(stats.byId.new, { used: 0, remaining: 4, pct: 100 });
  assert.strictEqual(prizeStats([{ id: 'x', quantity: 1 }], { x: 1 }).byId.x.pct, 0);
});

test('prizeStats: quantity edited below used never shows negative stock', () => {
  assert.strictEqual(prizeStats([{ id: 'x', quantity: 7 }], { x: 8 }).byId.x.remaining, 0);
});

test('quantityBelowUsed lists prizes whose quantity is lower than already given out', () => {
  const prizes = [{ id: 'a', label: 'A', quantity: 5 }, { id: 'b', label: 'B', quantity: 2 }];
  assert.deepStrictEqual(quantityBelowUsed(prizes, { a: 5, b: 3 }), [{ id: 'b', label: 'B', quantity: 2, used: 3 }]);
  assert.deepStrictEqual(quantityBelowUsed(prizes, {}), []);
});
