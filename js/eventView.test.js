const test = require('node:test');
const assert = require('node:assert/strict');
const { decideView } = require('./eventView.js');

test('no slug -> not-found, even if a config exists', () => {
  assert.equal(decideView(null, null), 'not-found');
  assert.equal(decideView(null, { prizes: [] }), 'not-found');
  assert.equal(decideView('', { prizes: [] }), 'not-found');
});

test('slug but config not loaded -> not-found', () => {
  assert.equal(decideView('some-event', null), 'not-found');
  assert.equal(decideView('some-event', undefined), 'not-found');
});

test('slug but server unreachable -> unavailable (not "not found")', () => {
  assert.equal(decideView('some-event', null, true), 'unavailable');
});

test('no slug wins over a failed load', () => {
  assert.equal(decideView(null, null, true), 'not-found');
});

test('slug and loaded config -> game', () => {
  assert.equal(decideView('some-event', { prizes: [] }), 'game');
});
