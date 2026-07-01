const test = require('node:test');
const assert = require('node:assert/strict');
const { hasValidSession } = require('./sessionGuard.js');

test('returns false for null session', () => {
  assert.equal(hasValidSession(null), false);
});

test('returns false when session has no user', () => {
  assert.equal(hasValidSession({}), false);
});

test('returns true when session has a user with an id', () => {
  assert.equal(hasValidSession({ user: { id: 'abc-123' } }), true);
});
