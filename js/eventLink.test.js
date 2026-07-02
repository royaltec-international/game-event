const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEventUrl, pageDirectoryUrl } = require('./eventLink.js');

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

test('pageDirectoryUrl keeps the repo subpath for a GitHub project page', () => {
  assert.equal(
    pageDirectoryUrl('https://royaltec-international.github.io', '/game-event/admin.html'),
    'https://royaltec-international.github.io/game-event/'
  );
});

test('pageDirectoryUrl returns origin root when the page is at the domain root', () => {
  assert.equal(
    pageDirectoryUrl('https://example.github.io', '/admin.html'),
    'https://example.github.io/'
  );
});
