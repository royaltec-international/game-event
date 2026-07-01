const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveEventSlug } = require('./eventSlug.js');

test('returns slug when ?event= is present', () => {
  assert.equal(resolveEventSlug('?event=belden-roadshow-2026'), 'belden-roadshow-2026');
});

test('returns null when there is no event param', () => {
  assert.equal(resolveEventSlug('?foo=bar'), null);
});

test('returns null when event param is an empty string', () => {
  assert.equal(resolveEventSlug('?event='), null);
});

test('trims whitespace around the slug', () => {
  assert.equal(resolveEventSlug('?event=%20belden-roadshow-2026%20'), 'belden-roadshow-2026');
});
