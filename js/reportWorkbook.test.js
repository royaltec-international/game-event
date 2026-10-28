const test = require('node:test');
const assert = require('node:assert/strict');
const {
  eventReportSheets,
  yearReportSheets,
  reportFilename,
} = require('./reportWorkbook.js');

function statsFixture() {
  return {
    leads: 10,
    contactable: 8,
    pdpaOff: false,
    newCount: 7,
    returningCount: 3,
    given: 6,
    soldOut: 1,
    lowCount: 1,
    prizes: [
      { label: 'ของA', quantity: 5, used: 5, remaining: 0, low: false, costStatus: 'known', cost: 250 },
      { label: 'ของB', quantity: 3, used: 1, remaining: 2, low: true, costStatus: 'vendor', cost: 0 },
      { label: 'ของC', quantity: 5, used: 0, remaining: 5, low: false, costStatus: 'unknown', cost: null },
    ],
    cost: {
      total: 250,
      perLead: 25,
      perContactable: 31.25,
      coverage: { known: 2, given: 2 },
      missing: ['ของC'],
    },
    brands: {
      rows: [{ name: 'แบรนด์ A', count: 6, pct: 60 }],
      anyPct: 60,
      avgPerPerson: 0.6,
      base: 10,
    },
    choices: [
      {
        key: 'custom_1',
        label: 'ธุรกิจ',
        type: 'radio',
        answered: 9,
        unanswered: 1,
        multi: false,
        rows: [{ option: 'โรงงาน', count: 4, pct: 44.44 }],
      },
    ],
    hourly: {
      days: ['2026-10-28'],
      byDay: { '2026-10-28': Array(24).fill(0).map((_, hour) => (hour === 9 ? 3 : 0)) },
      total: Array(24).fill(0).map((_, hour) => (hour === 9 ? 3 : 0)),
      peak: { hour: 9, count: 3 },
    },
  };
}

test('event report sheet order and names include the brands sheet', () => {
  const sheets = eventReportSheets(statsFixture(), [{ 'ชื่อ': 'A' }]);
  assert.deepEqual(sheets.map(sheet => sheet.name), [
    'สรุป', 'ของแจก', 'แบรนด์', 'สรุปคำตอบ', 'รายชั่วโมง', 'ผู้ลงทะเบียน',
  ]);
  assert.equal(sheets.find(sheet => sheet.name === 'ของแจก').rows[1]['ต้นทุน/ชิ้น'], 'vendor (0)');
  assert.equal(sheets.find(sheet => sheet.name === 'ของแจก').rows[2]['ต้นทุน/ชิ้น'], 'ไม่ทราบ');
  assert.equal(sheets.find(sheet => sheet.name === 'รายชั่วโมง').rows.length, 24);
  assert.ok(sheets.find(sheet => sheet.name === 'สรุป').rows
    .some(row => String(row['ค่า']).includes('มีราคาครบ 2/2')));
});

test('omits the brands sheet when stats.brands is null', () => {
  const stats = statsFixture();
  stats.brands = null;
  const names = eventReportSheets(stats, []).map(sheet => sheet.name);
  assert.deepEqual(names, ['สรุป', 'ของแจก', 'สรุปคำตอบ', 'รายชั่วโมง', 'ผู้ลงทะเบียน']);
});

test('appends the compare sheet last when a comparison is given', () => {
  const compare = {
    kpis: [{ key: 'leads', a: 10, b: 8, deltaPct: 25 }],
    brands: [],
    prizesByLabel: [],
  };
  const sheets = eventReportSheets(statsFixture(), [], compare);
  assert.equal(sheets[sheets.length - 1].name, 'เปรียบเทียบ');
  assert.equal(sheets.find(sheet => sheet.name === 'เปรียบเทียบ')
    .rows.some(row => row['หัวข้อ'] === 'leads' && row['ต่าง %'] === 25), true);
});

test('year report sheet names in order and registrant rows pass through', () => {
  const yearStatsResult = {
    year: 2026,
    leads: 20,
    uniqueContacts: 15,
    contactable: 18,
    eventCount: 2,
    cost: { total: 500, perLead: 25, complete: true },
    table: [{ name: 'งานA', firstDate: '2026-01-02', leads: 10, contactable: 9, given: 3, perLead: 25, costComplete: true }],
    brandsTop5: [{ name: 'แบรนด์ A', count: 8 }],
    monthly: [1, 2, 3, 0, 0, 0, 4, 0, 0, 0, 0, 10],
  };
  const sheets = yearReportSheets(yearStatsResult, [{ 'Event Name': 'งานA', 'ชื่อ': 'คน' }]);
  assert.deepEqual(sheets.map(sheet => sheet.name), [
    'สรุปปี', 'งาน', 'แบรนด์รวม', 'รายเดือน', 'ผู้ลงทะเบียน',
  ]);
  assert.equal(sheets.find(sheet => sheet.name === 'ผู้ลงทะเบียน').rows[0]['Event Name'], 'งานA');
});

test('reportFilename strips invalid chars and collapses spaces', () => {
  assert.equal(reportFilename('Expo: 2026/Q4', '2026-10-28T10:00:00Z'), 'Expo-2026Q4-2026-10-28.xlsx');
  assert.equal(reportFilename('ภาพรวมปี 2026', '2026-10-28'), 'ภาพรวมปี-2026-2026-10-28.xlsx');
  assert.equal(reportFilename('', '2026-10-28'), 'report-2026-10-28.xlsx');
  assert.equal(reportFilename('งานใหญ่', ''), 'งานใหญ่.xlsx');
});
