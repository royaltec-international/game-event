const { test } = require('node:test');
const assert = require('node:assert');
const { buildRegistrationPayload, segmentsForSpin } = require('./drawPayload.js');

test('buildRegistrationPayload maps form data to draw_prize columns', () => {
  const payload = buildRegistrationPayload({
    firstName: 'A', lastName: 'B', email: 'a@b.co', phone: '0812345678',
    company: 'C', position: 'P', brands: 'Panduit, Eaton', pdpaConsent: 'true',
    customFields: JSON.stringify({ 'แผนก': 'IT' }),
  });
  assert.deepStrictEqual(payload, {
    first_name: 'A', last_name: 'B', email: 'a@b.co', phone: '0812345678',
    company: 'C', position: 'P', brands: 'Panduit, Eaton', pdpa_consent: 'YES',
    custom_fields: { 'แผนก': 'IT' },
  });
});

test('buildRegistrationPayload defaults missing fields and maps consent', () => {
  assert.strictEqual(buildRegistrationPayload({ pdpaConsent: 'false' }).pdpa_consent, 'NO');
  const empty = buildRegistrationPayload({});
  assert.strictEqual(empty.pdpa_consent, 'N/A');
  assert.strictEqual(empty.first_name, '');
  assert.strictEqual(empty.custom_fields, null);
});

test('segmentsForSpin keeps the wheel as-is when the won prize is on it', () => {
  const a = { id: 'a' }, b = { id: 'b' };
  assert.deepStrictEqual(segmentsForSpin([a, b], [a, b], 'b'), [a, b]);
});

test('segmentsForSpin adds a won prize the stale wheel did not show', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
  // c was added by admin after the page loaded; keep config order
  assert.deepStrictEqual(segmentsForSpin([a, b], [a, c, b], 'c'), [a, c, b]);
});

test('segmentsForSpin returns null for a prize missing from config', () => {
  assert.strictEqual(segmentsForSpin([{ id: 'a' }], [{ id: 'a' }], 'zzz'), null);
});
