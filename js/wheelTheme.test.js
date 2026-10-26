const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RTI_WHEEL_SHADES,
  MAX_PRIZES,
  wheelPalette,
  contrastRatio,
  inkFor,
  wheelLayout,
} = require('./wheelTheme.js');

const EXPECTED_SHADES = [
  '#0f2a3d', '#153952', '#1b4968', '#20587d', '#266893', '#2c77a8',
  '#5391b9', '#71a4c5', '#8fb7d2', '#adcadf', '#cadeeb', '#e8f1f8',
];

test('exposes the fixed RTI wheel shades and prize limit', () => {
  assert.deepEqual(RTI_WHEEL_SHADES, EXPECTED_SHADES);
  assert.equal(MAX_PRIZES, 16);
});

for (const n of [1, 2, 6, 9, 12, 13, 16]) {
  test(`builds a valid ${n}-slice palette`, () => {
    const palette = wheelPalette(n);

    assert.equal(palette.length, n);
    assert.ok(palette.every(colour => RTI_WHEEL_SHADES.includes(colour)));

    if (n <= 12) {
      assert.equal(new Set(palette).size, n);
    }

    if (n >= 3) {
      for (let i = 0; i < n; i++) {
        assert.notEqual(palette[i], palette[(i + 1) % n]);
      }
    }

    for (const colour of palette) {
      assert.ok(contrastRatio(colour, inkFor(colour)) >= 4.5);
    }
  });
}

test('selects shades evenly before interleaving dark and light halves', () => {
  assert.deepEqual(wheelPalette(6), [
    '#0f2a3d', '#71a4c5', '#1b4968', '#adcadf', '#266893', '#e8f1f8',
  ]);
});

test('normalises non-positive and fractional palette sizes', () => {
  assert.deepEqual(wheelPalette(0), []);
  assert.deepEqual(wheelPalette(-2), []);
  assert.deepEqual(wheelPalette(2.9), ['#0f2a3d', '#e8f1f8']);
});

test('chooses wheel layouts at the prize-count boundaries', () => {
  assert.equal(wheelLayout(1), 'stack');
  assert.equal(wheelLayout(8), 'stack');
  assert.equal(wheelLayout(9), 'radial-icon');
  assert.equal(wheelLayout(12), 'radial-icon');
  assert.equal(wheelLayout(13), 'radial-text');
  assert.equal(wheelLayout(16), 'radial-text');
});

test('computes symmetric black-white WCAG contrast', () => {
  const forward = contrastRatio('#ffffff', '#000000');
  const reverse = contrastRatio('#000000', '#ffffff');

  assert.ok(Math.abs(forward - 21) < 1e-12);
  assert.equal(reverse, forward);
});
