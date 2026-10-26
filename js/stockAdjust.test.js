const test = require('node:test');
const assert = require('node:assert/strict');
const { adjustStock } = require('./stockAdjust.js');

test('day-2 top-up adds to the running total, keeping what is left from day 1', () => {
  // day 1: 20 stocked, 10 given out -> 10 left; day 2 adds 20
  assert.deepEqual(adjustStock(20, 10, 20), { ok: true, quantity: 40, remainingBefore: 10, remainingAfter: 30 });
});

test('items handed out outside the game are deducted from what is left', () => {
  assert.deepEqual(adjustStock(10, 0, -2), { ok: true, quantity: 8, remainingBefore: 10, remainingAfter: 8 });
});

test('cannot deduct more than is left', () => {
  const r = adjustStock(10, 7, -4);
  assert.equal(r.ok, false);
  assert.match(r.error, /3 ชิ้น/);
});

test('deducting exactly what is left is allowed (sold out)', () => {
  assert.deepEqual(adjustStock(10, 7, -3), { ok: true, quantity: 7, remainingBefore: 3, remainingAfter: 0 });
});

test('rejects zero, fractions, empty and non-numbers', () => {
  for (const d of [0, 1.5, '', 'abc', NaN, undefined]) {
    assert.equal(adjustStock(10, 0, d).ok, false, String(d));
  }
});

test('caps the running total at 9999', () => {
  assert.equal(adjustStock(9990, 0, 10).ok, false);
  assert.equal(adjustStock(9990, 0, 9).ok, true);
});

test('used above quantity (stale data) never reports negative remaining', () => {
  assert.equal(adjustStock(5, 8, 10).remainingBefore, 0);
});
