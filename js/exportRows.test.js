const test = require('node:test');
const assert = require('node:assert/strict');
const { buildExportRows } = require('./exportRows.js');

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

test('handles missing/null fields as empty strings', () => {
  const rows = buildExportRows([{ created_at: '2026-01-01T10:00:00Z', custom_fields: null }], 'Test Event');
  assert.equal(rows[0]['ชื่อ'], '');
});
