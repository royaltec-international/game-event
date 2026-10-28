const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildExportRows } = require('./exportRows.js');

test('loads after fieldAnswers as classic browser scripts', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(`${__dirname}/fieldAnswers.js`, 'utf8'), context);
  vm.runInContext(fs.readFileSync(`${__dirname}/exportRows.js`, 'utf8'), context);

  const answer = vm.runInContext(`
    buildExportRows(
      [{ custom_fields: { custom_x: ['A', OTHER], custom_x__other: 'X' } }],
      'Event',
      [{ key: 'custom_x', label: 'คำตอบ' }]
    )[0]['คำตอบ']
  `, context);
  assert.equal(answer, 'A, อื่นๆ: X');
});

test('maps a registration row to Thai-labeled export columns', () => {
  const rows = buildExportRows([{
    created_at: '2026-01-01T10:00:00Z',
    first_name: 'สมชาย', last_name: 'ใจดี', email: 'a@b.com', phone: '0812345678',
    company: 'Acme', position: 'Engineer', prize_label: 'โน๊ตก้อน',
    brands: 'Belden, Eaton', pdpa_consent: 'YES', custom_fields: null,
  }], 'Belden Roadshow 2026');

  assert.deepEqual(rows[0], {
    'Timestamp': '2026-01-01T10:00:00Z',
    'Event Name': 'Belden Roadshow 2026',
    'ชื่อ': 'สมชาย',
    'นามสกุล': 'ใจดี',
    'อีเมล': 'a@b.com',
    'เบอร์โทร': '0812345678',
    'บริษัท': 'Acme',
    'ตำแหน่ง': 'Engineer',
    'ของรางวัล': 'โน๊ตก้อน',
    'แบรนด์ที่สนใจ': 'Belden, Eaton',
    'PDPA Consent': 'YES',
  });
});

test('spreads custom_fields as extra columns keyed by their label', () => {
  const rows = buildExportRows([{
    created_at: '2026-01-01T10:00:00Z', first_name: '', last_name: '', email: '', phone: '',
    company: '', position: '', prize_label: '', brands: '', pdpa_consent: 'N/A',
    custom_fields: { 'แผนก': 'IT' },
  }], 'Test Event');

  assert.equal(rows[0]['แผนก'], 'IT');
});

test('exports new key-based answers under the current field label', () => {
  const rows = buildExportRows([{
    created_at: '2026-01-01T10:00:00Z',
    custom_fields: { custom_x: 'โรงงาน' },
  }], 'Test Event', [
    { key: 'custom_x', label: 'ประเภทธุรกิจ', type: 'dropdown' },
  ]);

  assert.equal(rows[0]['ประเภทธุรกิจ'], 'โรงงาน');
  assert.equal('custom_x' in rows[0], false);
});

test('formats arrays and never exports other-text storage keys as columns', () => {
  const rows = buildExportRows([{
    created_at: '2026-01-01T10:00:00Z',
    custom_fields: {
      custom_x: ['โรงงาน', 'อื่นๆ'],
      custom_x__other: 'ขายส่ง',
      legacy_array: ['A', 'B'],
      orphan__other: 'hidden',
    },
  }], 'Test Event', [
    { key: 'custom_x', label: 'ประเภทธุรกิจ', type: 'checkbox' },
  ]);

  assert.equal(rows[0]['ประเภทธุรกิจ'], 'โรงงาน, อื่นๆ: ขายส่ง');
  assert.equal(rows[0].legacy_array, 'A, B');
  assert.equal('custom_x__other' in rows[0], false);
  assert.equal('orphan__other' in rows[0], false);
});

test('includes configured custom columns as empty when a row has no custom fields', () => {
  const rows = buildExportRows([{
    created_at: '2026-01-01T10:00:00Z',
    custom_fields: null,
  }], 'Test Event', [
    { key: 'custom_x', label: 'ประเภทธุรกิจ', type: 'dropdown' },
  ]);

  assert.equal(rows[0]['ประเภทธุรกิจ'], '');
});

test('handles missing/null fields as empty strings', () => {
  const rows = buildExportRows([{ created_at: '2026-01-01T10:00:00Z', custom_fields: null }], 'Test Event');
  assert.equal(rows[0]['ชื่อ'], '');
});
