const test = require('node:test');
const assert = require('node:assert/strict');
const { filterByDateRange } = require('./dateRangeFilter.js');

const rows = [
  { id: 1, created_at: '2026-01-01T10:00:00Z' },
  { id: 2, created_at: '2026-01-15T10:00:00Z' },
  { id: 3, created_at: '2026-02-01T10:00:00Z' },
];

test('returns all rows when no bounds given', () => {
  assert.deepEqual(filterByDateRange(rows, null, null).map(r => r.id), [1, 2, 3]);
});

test('filters by start bound only', () => {
  assert.deepEqual(filterByDateRange(rows, '2026-01-10T00:00:00Z', null).map(r => r.id), [2, 3]);
});

test('filters by end bound only', () => {
  assert.deepEqual(filterByDateRange(rows, null, '2026-01-10T00:00:00Z').map(r => r.id), [1]);
});

test('filters by both bounds, inclusive', () => {
  assert.deepEqual(
    filterByDateRange(rows, '2026-01-01T10:00:00Z', '2026-01-15T10:00:00Z').map(r => r.id),
    [1, 2]
  );
});
