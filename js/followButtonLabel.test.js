const test = require('node:test');
const assert = require('node:assert/strict');
const { followButtonLabel, DEFAULT_FOLLOW_BUTTON_LABEL } = require('./followButtonLabel.js');

test('uses the configured text', () => {
  assert.equal(followButtonLabel('ติดตามเราบน LINE'), 'ติดตามเราบน LINE');
});

test('trims surrounding whitespace', () => {
  assert.equal(followButtonLabel('  Follow us  '), 'Follow us');
});

test('falls back to default when empty, blank or missing', () => {
  assert.equal(followButtonLabel(''), DEFAULT_FOLLOW_BUTTON_LABEL);
  assert.equal(followButtonLabel('   '), DEFAULT_FOLLOW_BUTTON_LABEL);
  assert.equal(followButtonLabel(undefined), DEFAULT_FOLLOW_BUTTON_LABEL);
  assert.equal(followButtonLabel(null), DEFAULT_FOLLOW_BUTTON_LABEL);
});
