const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEventUrl } = require('./eventLink.js');

test('builds a URL with the event slug as a query param', () => {
  assert.equal(
    buildEventUrl('https://example.github.io', 'belden-roadshow-2026'),
    'https://example.github.io/index.html?event=belden-roadshow-2026'
  );
});

test('strips a trailing slash from origin before appending', () => {
  assert.equal(
    buildEventUrl('https://example.github.io/', 'belden-roadshow-2026'),
    'https://example.github.io/index.html?event=belden-roadshow-2026'
  );
});

test('URL-encodes special characters in the slug', () => {
  assert.equal(
    buildEventUrl('https://example.github.io', 'panduit fair 2026'),
    'https://example.github.io/index.html?event=panduit%20fair%202026'
  );
});
