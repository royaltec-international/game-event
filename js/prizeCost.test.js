const test = require('node:test');
const assert = require('node:assert/strict');
const {
  costStatus,
  unitCostOf,
  parseCostInput,
  prizeCostRows,
  stripPrivatePrizeFields,
} = require('./prizeCost.js');

test('classifies vendor, known, and unknown prize costs', () => {
  assert.equal(costStatus({ unit_cost: 125, vendor_sponsored: true }), 'vendor');
  assert.equal(costStatus({ unit_cost: 0, vendor_sponsored: false }), 'known');
  assert.equal(costStatus({ unit_cost: 125, vendor_sponsored: false }), 'known');
  assert.equal(costStatus({ unit_cost: null, vendor_sponsored: false }), 'unknown');
  assert.equal(costStatus(undefined), 'unknown');
});

test('returns zero for vendor costs and null for unknown costs', () => {
  assert.equal(unitCostOf({ unit_cost: 125, vendor_sponsored: true }), 0);
  assert.equal(unitCostOf({ unit_cost: 125, vendor_sponsored: false }), 125);
  assert.equal(unitCostOf({ unit_cost: 0, vendor_sponsored: false }), 0);
  assert.equal(unitCostOf({ unit_cost: null, vendor_sponsored: false }), null);
  assert.equal(unitCostOf(undefined), null);
});

test('parses blank, comma-formatted, and invalid cost input', () => {
  assert.equal(parseCostInput(''), null);
  assert.equal(parseCostInput('   '), null);
  assert.equal(parseCostInput('1,250.50'), 1250.5);
  assert.equal(parseCostInput(' 0 '), 0);
  assert.equal(Number.isNaN(parseCostInput('not a number')), true);
  assert.equal(Number.isNaN(parseCostInput('-0.01')), true);
});

test('builds private cost rows and clears unit cost for vendor prizes', () => {
  assert.deepEqual(
    prizeCostRows('00000000-0000-0000-0000-000000000005', [
      { id: 'paid', label: 'Paid', unitCost: 125.5, vendorSponsored: false },
      { id: 'vendor', label: 'Vendor', unitCost: 999, vendorSponsored: true },
      { id: 'unknown', label: 'Unknown' },
    ]),
    [
      {
        prize_id: 'paid',
        event_id: '00000000-0000-0000-0000-000000000005',
        unit_cost: 125.5,
        vendor_sponsored: false,
      },
      {
        prize_id: 'vendor',
        event_id: '00000000-0000-0000-0000-000000000005',
        unit_cost: null,
        vendor_sponsored: true,
      },
      {
        prize_id: 'unknown',
        event_id: '00000000-0000-0000-0000-000000000005',
        unit_cost: null,
        vendor_sponsored: false,
      },
    ]
  );
});

test('strips private prize fields without changing other keys or mutating input', () => {
  const image = { path: 'fan.png' };
  const prizes = [{
    id: 'fan',
    label: 'Fan',
    quantity: 10,
    image,
    unitCost: 25,
    vendorSponsored: false,
  }];

  const stripped = stripPrivatePrizeFields(prizes);

  assert.deepEqual(stripped, [{ id: 'fan', label: 'Fan', quantity: 10, image }]);
  assert.notEqual(stripped, prizes);
  assert.notEqual(stripped[0], prizes[0]);
  assert.equal(stripped[0].image, image);
  assert.deepEqual(prizes, [{
    id: 'fan',
    label: 'Fan',
    quantity: 10,
    image,
    unitCost: 25,
    vendorSponsored: false,
  }]);
});
