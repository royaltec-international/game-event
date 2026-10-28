const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {
  bangkokParts,
  contactKeys,
  isLowStock,
  prizeRows,
  costSummary,
  brandSummary,
  choiceSummary,
  hourly,
  eventStats,
  eventsInYear,
  yearStats,
  compareStats,
} = require('./dashboardStats.js');

test('reads the other marker when loaded as classic browser scripts', () => {
  const context = vm.createContext({});
  ['fieldAnswers.js', 'prizeCost.js', 'dashboardStats.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(require.resolve(`./${file}`), 'utf8'), context);
  });

  assert.equal(
    vm.runInContext("brandSummary([{ brands: 'hacked' }], ['A']).rows[0].name", context),
    'อื่นๆ'
  );
});

test('converts UTC timestamps to fixed Bangkok date parts across midnight', () => {
  assert.deepEqual(bangkokParts('2026-10-24T17:30:00Z'), {
    date: '2026-10-25',
    hour: 0,
    month: 10,
    year: 2026,
  });
});

test('normalises valid phone and email contact keys', () => {
  assert.deepEqual(contactKeys({ phone: '+66 (0)81-234-5678', email: ' USER@Example.COM ' }), [
    'p:660812345678',
    'e:user@example.com',
  ]);
  assert.deepEqual(contactKeys({ phone: '123-456', email: 'not-an-email' }), []);
});

test('marks low stock at either the ten-percent or five-item boundary', () => {
  assert.equal(isLowStock({ quantity: 10, remaining: 1 }), true);
  assert.equal(isLowStock({ quantity: 100, remaining: 6 }), true);
  assert.equal(isLowStock({ quantity: 100, remaining: 11 }), false);
  assert.equal(isLowStock({ quantity: 0, remaining: 0 }), false);
});

test('builds sorted prize rows with cost metadata', () => {
  assert.deepEqual(
    prizeRows(
      [
        { id: 'paid', label: 'Z paid', quantity: 20, used: 2, remaining: 18 },
        { id: 'vendor', label: 'A vendor', quantity: 10, used: 1, remaining: 1 },
        { id: 'unknown', label: 'B unknown', quantity: 10, used: 0, remaining: 1 },
      ],
      {
        paid: { unit_cost: '25.50', vendor_sponsored: false },
        vendor: { unit_cost: null, vendor_sponsored: true },
      }
    ),
    [
      {
        id: 'vendor',
        label: 'A vendor',
        quantity: 10,
        used: 1,
        remaining: 1,
        low: true,
        costStatus: 'vendor',
        unitCost: 0,
        cost: 0,
      },
      {
        id: 'unknown',
        label: 'B unknown',
        quantity: 10,
        used: 0,
        remaining: 1,
        low: true,
        costStatus: 'unknown',
        unitCost: null,
        cost: null,
      },
      {
        id: 'paid',
        label: 'Z paid',
        quantity: 20,
        used: 2,
        remaining: 18,
        low: false,
        costStatus: 'known',
        unitCost: 25.5,
        cost: 51,
      },
    ]
  );
});

test('reports incomplete cost coverage while treating vendor prizes as known zero cost', () => {
  assert.deepEqual(
    costSummary(
      [
        { label: 'Vendor gift', used: 1, costStatus: 'vendor', cost: 0 },
        { label: 'Mystery gift', used: 1, costStatus: 'unknown', cost: null },
        { label: 'Unused unknown', used: 0, costStatus: 'unknown', cost: null },
      ],
      2,
      1
    ),
    {
      total: 0,
      perLead: 0,
      perContactable: 0,
      coverage: { known: 1, given: 2 },
      missing: ['Mystery gift'],
    }
  );
});

test('groups injected brand values under other without creating new bars', () => {
  assert.deepEqual(brandSummary([{ brands: 'A, hacked' }], ['A', 'B']), {
    rows: [
      { name: 'A', count: 1, pct: 100 },
      { name: 'อื่นๆ', count: 1, pct: 100 },
      { name: 'B', count: 0, pct: 0 },
    ],
    anyPct: 100,
    avgPerPerson: 2,
    base: 1,
  });
});

test('summarises legacy label-keyed choice answers and groups stale options under other', () => {
  const field = {
    key: 'custom_department',
    label: 'แผนก',
    type: 'radio',
    options: ['IT', 'Sales'],
    allowOther: false,
  };

  assert.deepEqual(
    choiceSummary(
      [
        { custom_fields: { 'แผนก': 'IT' } },
        { custom_fields: { custom_department: 'Old option' } },
        { custom_fields: {} },
      ],
      field
    ),
    {
      type: 'radio',
      rows: [
        { option: 'IT', count: 1, pct: 50 },
        { option: 'อื่นๆ', count: 1, pct: 50 },
        { option: 'Sales', count: 0, pct: 0 },
      ],
      answered: 2,
      unanswered: 1,
      multi: false,
    }
  );
});

test('uses answered people as the percentage base for multi-choice answers', () => {
  const field = {
    key: 'custom_interest',
    label: 'สนใจ',
    type: 'checkbox',
    options: ['A', 'B'],
    allowOther: true,
  };

  assert.deepEqual(
    choiceSummary(
      [
        { custom_fields: { custom_interest: ['A', 'B', 'A'] } },
        { custom_fields: { custom_interest: ['อื่นๆ'], custom_interest__other: 'X' } },
        { custom_fields: { custom_interest: [] } },
      ],
      field
    ),
    {
      type: 'checkbox',
      rows: [
        { option: 'A', count: 1, pct: 50 },
        { option: 'B', count: 1, pct: 50 },
        { option: 'อื่นๆ', count: 1, pct: 50 },
      ],
      answered: 2,
      unanswered: 1,
      multi: true,
    }
  );
});

test('buckets hourly registrations by Bangkok day and finds the earliest peak hour', () => {
  const result = hourly([
    { created_at: '2026-10-24T17:30:00Z' },
    { created_at: '2026-10-24T18:15:00Z' },
    { created_at: '2026-10-25T17:00:00Z' },
  ]);

  assert.deepEqual(result.days, ['2026-10-25', '2026-10-26']);
  assert.equal(result.byDay['2026-10-25'][0], 1);
  assert.equal(result.byDay['2026-10-25'][1], 1);
  assert.equal(result.byDay['2026-10-26'][0], 1);
  assert.equal(result.total[0], 2);
  assert.equal(result.total[1], 1);
  assert.deepEqual(result.peak, { hour: 0, count: 2 });
});

test('event stats disable PDPA contactable cost when every registration is N/A', () => {
  const stats = eventStats({
    event: { config: { pdpa: { enabled: false } } },
    registrations: [
      { pdpa_consent: 'N/A', prize_id: '', created_at: '2026-10-24T17:30:00Z' },
      { pdpa_consent: 'N/A', prize_id: 'gift', created_at: '2026-10-24T18:30:00Z' },
    ],
    prizes: [{ id: 'gift', label: 'Gift', quantity: 10, used: 1, remaining: 9 }],
    costs: [{ prize_id: 'gift', unit_cost: 20, vendor_sponsored: false }],
    priorContactKeys: new Set(),
  });

  assert.equal(stats.pdpaOff, true);
  assert.equal(stats.contactable, null);
  assert.equal(stats.cost.perContactable, null);
  assert.equal(stats.soldOut, 1);
});

test('empty event stats contain null or finite metrics and no NaN', () => {
  const stats = eventStats({
    event: {
      config: {
        pdpa: { enabled: false },
        brandsCheckbox: { enabled: true, items: ['A'] },
        formFields: [{
          key: 'custom_choice',
          label: 'ตัวเลือก',
          type: 'dropdown',
          enabled: true,
          options: ['X'],
        }],
      },
    },
    registrations: [],
    prizes: [],
    costs: [],
    priorContactKeys: new Set(),
  });

  assert.equal(stats.leads, 0);
  assert.equal(stats.contactable, null);
  assert.equal(stats.pdpaOff, true);
  assert.equal(stats.cost.perLead, null);
  assert.equal(stats.cost.perContactable, null);
  assert.equal(stats.brands.anyPct, 0);
  assert.equal(stats.brands.avgPerPerson, 0);
  assert.equal(stats.choices[0].rows[0].pct, 0);
  assert.equal(stats.hourly.peak, null);

  const numbers = [];
  const collectNumbers = value => {
    if (typeof value === 'number') numbers.push(value);
    else if (Array.isArray(value)) value.forEach(collectNumbers);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectNumbers);
  };
  collectNumbers(stats);
  assert.equal(numbers.every(Number.isFinite), true);
});

test('event stats combine contactability, returning contacts, stock, brands, and choices', () => {
  const event = {
    config: {
      pdpa: { enabled: true },
      brandsCheckbox: { enabled: true, items: ['A', 'B'] },
      formFields: [
        { key: 'phone', enabled: true, isBase: true },
        { key: 'email', enabled: true, isBase: true },
        {
          key: 'custom_department',
          label: 'แผนก',
          type: 'dropdown',
          enabled: true,
          options: ['IT'],
        },
        {
          key: 'custom_disabled',
          label: 'ไม่นับ',
          type: 'radio',
          enabled: false,
          options: ['X'],
        },
      ],
    },
  };
  const registrations = [
    {
      phone: '081-234-5678',
      email: '',
      pdpa_consent: 'YES',
      prize_id: 'gift',
      brands: 'A',
      custom_fields: { 'แผนก': 'IT' },
      created_at: '2026-10-24T17:30:00Z',
    },
    {
      phone: '',
      email: 'new@example.com',
      pdpa_consent: 'true',
      prize_id: '',
      brands: '',
      custom_fields: {},
      created_at: '2026-10-24T18:30:00Z',
    },
  ];

  const stats = eventStats({
    event,
    registrations,
    prizes: [{ id: 'gift', label: 'Gift', quantity: 10, used: 1, remaining: 1 }],
    costs: [{ prize_id: 'gift', unit_cost: 30, vendor_sponsored: false }],
    priorContactKeys: new Set(['p:0812345678']),
  });

  assert.equal(stats.leads, 2);
  assert.equal(stats.contactable, 2);
  assert.equal(stats.pdpaOff, false);
  assert.equal(stats.newCount, 1);
  assert.equal(stats.returningCount, 1);
  assert.equal(stats.given, 1);
  assert.equal(stats.soldOut, 1);
  assert.equal(stats.lowCount, 1);
  assert.equal(stats.cost.total, 30);
  assert.equal(stats.brands.rows.find(row => row.name === 'A').count, 1);
  assert.equal(stats.choices.length, 1);
  assert.equal(stats.choices[0].label, 'แผนก');
  assert.equal(stats.choices[0].rows[0].count, 1);
});

test('event stats omit new and returning counts when phone and email are disabled', () => {
  const stats = eventStats({
    event: {
      config: {
        formFields: [
          { key: 'phone', enabled: false },
          { key: 'email', enabled: false },
        ],
        pdpa: { enabled: true },
      },
    },
    registrations: [{ phone: '0812345678', email: 'a@example.com', pdpa_consent: 'NO' }],
    prizes: [],
    costs: [],
    priorContactKeys: new Set(['p:0812345678']),
  });

  assert.equal(stats.newCount, null);
  assert.equal(stats.returningCount, null);
});

test('filters events by Bangkok creation year and sorts latest first-registration date first', () => {
  const early = {
    id: 'early',
    created_at: '2025-12-31T18:00:00Z',
    firstDate: '2026-01-05',
  };
  const late = {
    id: 'late',
    created_at: '2026-06-01T00:00:00Z',
    firstDate: '2026-08-10',
  };
  const previousYear = {
    id: 'previous',
    created_at: '2025-12-31T16:00:00Z',
    firstDate: '2025-12-31',
  };

  assert.deepEqual(eventsInYear([late, previousYear, early], 2026), [late, early]);
});

test('builds year totals with cross-event contact dedupe and incomplete cost coverage', () => {
  const result = yearStats({
    events: [
      {
        id: 'one',
        name: 'มกราคม',
        created_at: '2026-01-01T00:00:00Z',
        config: {
          pdpa: { enabled: true },
          brandsCheckbox: { enabled: true, items: ['A', 'B'] },
        },
      },
      {
        id: 'two',
        name: 'มีนาคม',
        created_at: '2026-03-01T00:00:00Z',
        config: {
          pdpa: { enabled: false },
          brandsCheckbox: { enabled: true, items: ['A', 'C'] },
        },
      },
    ],
    registrationsByEvent: {
      one: [{
        phone: '081-234-5678',
        pdpa_consent: 'YES',
        brands: 'A',
        created_at: '2026-01-10T03:00:00Z',
      }],
      two: [{
        phone: '0812345678',
        pdpa_consent: 'N/A',
        brands: 'A',
        created_at: '2027-03-20T03:00:00Z',
      }],
    },
    prizesByEvent: {
      one: [{ id: 'known', label: 'Known', quantity: 10, used: 1, remaining: 9 }],
      two: [{ id: 'unknown', label: 'Unknown', quantity: 10, used: 1, remaining: 9 }],
    },
    costsByEvent: {
      one: [{ prize_id: 'known', unit_cost: 20, vendor_sponsored: false }],
      two: [],
    },
  });

  assert.equal(result.leads, 2);
  assert.equal(result.uniqueContacts, 1);
  assert.equal(result.contactable, 1);
  assert.equal(result.eventCount, 2);
  assert.deepEqual(result.cost, { total: 20, perLead: 10, complete: false });
  assert.deepEqual(result.table.map(row => ({
    eventId: row.eventId,
    firstDate: row.firstDate,
    contactable: row.contactable,
    costComplete: row.costComplete,
  })), [
    { eventId: 'two', firstDate: '2027-03-20', contactable: null, costComplete: false },
    { eventId: 'one', firstDate: '2026-01-10', contactable: 1, costComplete: true },
  ]);
  assert.deepEqual(result.brandsTop5[0], { name: 'A', count: 2 });
  assert.equal(result.monthly.length, 12);
  assert.equal(result.monthly[0], 1);
  assert.equal(result.monthly[2], 1);
});

test('compares KPI deltas and sums duplicate trimmed prize and choice labels', () => {
  const aHours = Array(24).fill(0);
  const bHours = Array(24).fill(0);
  aHours[10] = 8;
  bHours[10] = 4;
  const result = compareStats({
    leads: 120,
    contactable: 60,
    newCount: 90,
    returningCount: 30,
    given: 8,
    soldOut: 2,
    lowCount: 1,
    cost: {
      perLead: 10,
      perContactable: 20,
      coverage: { known: 1, given: 2 },
    },
    brands: { rows: [{ name: 'A', count: 3 }] },
    prizes: [
      { label: 'Gift', used: 2 },
      { label: ' Gift ', used: 3 },
      { label: 'Only A', used: 9 },
    ],
    choices: [
      { label: 'Sector', rows: [{ option: 'Factory', count: 2 }] },
      { label: ' Sector ', rows: [{ option: 'Factory ', count: 1 }] },
    ],
    hourly: { total: aHours },
  }, {
    leads: 100,
    contactable: 0,
    newCount: 70,
    returningCount: 30,
    given: 4,
    soldOut: 0,
    lowCount: 0,
    cost: {
      perLead: 8,
      perContactable: null,
      coverage: { known: 1, given: 1 },
    },
    brands: { rows: [{ name: ' A ', count: 5 }, { name: 'B', count: 2 }] },
    prizes: [{ label: 'Gift', used: 4 }, { label: 'Only B', used: 7 }],
    choices: [{
      label: 'Sector',
      rows: [{ option: 'Factory', count: 4 }, { option: 'Retail', count: 1 }],
    }],
    hourly: { total: bHours },
  });

  assert.deepEqual(result.kpis.find(row => row.key === 'leads'), {
    key: 'leads', a: 120, b: 100, deltaPct: 20,
  });
  assert.equal(result.kpis.find(row => row.key === 'contactable').deltaPct, null);
  assert.deepEqual(result.brands, [
    { name: 'A', a: 3, b: 5 },
    { name: 'B', a: null, b: 2 },
  ]);
  assert.deepEqual(result.prizesByLabel, [{ label: 'Gift', a: 5, b: 4 }]);
  assert.deepEqual(result.choices, [{
    label: 'Sector',
    rows: [
      { option: 'Factory', a: 3, b: 4 },
      { option: 'Retail', a: 0, b: 1 },
    ],
  }]);
  assert.deepEqual(result.hourly, { a: aHours, b: bHours });
  assert.deepEqual(result.costComplete, { a: false, b: true });
});

test('brandSummary matches brand names that themselves contain ", "', () => {
  const items = ['Panduit ( Network, Cabling )', 'Belden'];
  const result = brandSummary([
    { brands: 'Panduit ( Network, Cabling ), Belden' },
    { brands: 'Panduit ( Network, Cabling )' },
    { brands: 'Belden, hacked' },
  ], items);
  const byName = Object.fromEntries(result.rows.map(r => [r.name, r.count]));
  assert.equal(byName['Panduit ( Network, Cabling )'], 2);
  assert.equal(byName.Belden, 2);
  assert.equal(byName['อื่นๆ'], 1);
});

test('costSummary gives no per-lead figure when no given prize has a price', () => {
  const s = costSummary([{ label: 'A', used: 3, costStatus: 'unknown', cost: null }], 10, 5);
  assert.equal(s.perLead, null);
  assert.equal(s.perContactable, null);
});
