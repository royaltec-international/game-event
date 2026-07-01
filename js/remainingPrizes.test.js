const test = require('node:test');
const assert = require('node:assert/strict');
const { computeRemainingMap } = require('./remainingPrizes.js');

test('computes remaining as quantity minus used', () => {
  const result = computeRemainingMap([{ id: 'notepad', quantity: 55, used: 10 }]);
  assert.deepEqual(result, { notepad: 45 });
});

test('defaults used to 0 when missing', () => {
  const result = computeRemainingMap([{ id: 'fan', quantity: 2 }]);
  assert.deepEqual(result, { fan: 2 });
});

test('clamps remaining at 0, never negative', () => {
  const result = computeRemainingMap([{ id: 'special', quantity: 1, used: 5 }]);
  assert.deepEqual(result, { special: 0 });
});

test('handles multiple rows', () => {
  const result = computeRemainingMap([
    { id: 'a', quantity: 10, used: 3 },
    { id: 'b', quantity: 5, used: 5 },
  ]);
  assert.deepEqual(result, { a: 7, b: 0 });
});
