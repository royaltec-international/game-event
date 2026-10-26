const test = require('node:test');
const assert = require('node:assert/strict');
const { qrFilename } = require('./qrFilename.js');

test('keeps Thai and spaces', () => {
  assert.equal(qrFilename('งาน Panduit วันเทคโนโลยี 2026', 's'), 'งาน Panduit วันเทคโนโลยี 2026.png');
});

test('strips illegal and control characters, collapses whitespace', () => {
  assert.equal(qrFilename('a/b\\c:d*e?f"g<h>i|j\u0001k', 's'), 'a b c d e f g h i j k.png');
  assert.equal(qrFilename('  Hello    World  ', 's'), 'Hello World.png');
});

test('removes trailing dots', () => {
  assert.equal(qrFilename('Roadshow 2026...', 's'), 'Roadshow 2026.png');
});

test('empty name falls back to slug, then event-qr', () => {
  assert.equal(qrFilename('', 'my-slug'), 'my-slug.png');
  assert.equal(qrFilename('///', 'my-slug'), 'my-slug.png');
  assert.equal(qrFilename('', ''), 'event-qr.png');
  assert.equal(qrFilename(null, undefined), 'event-qr.png');
});
