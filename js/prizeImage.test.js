const test = require('node:test');
const assert = require('node:assert/strict');
const { fitDimensions, prizeImagePath } = require('./prizeImage.js');

test('fitDimensions returns the original size when already within bounds', () => {
  assert.deepEqual(fitDimensions(100, 80, 160), { width: 100, height: 80 });
});

test('fitDimensions scales down a wide image preserving aspect ratio', () => {
  assert.deepEqual(fitDimensions(400, 200, 160), { width: 160, height: 80 });
});

test('fitDimensions scales down a tall image preserving aspect ratio', () => {
  assert.deepEqual(fitDimensions(200, 400, 160), { width: 80, height: 160 });
});

test('fitDimensions never upscales a smaller-than-max image', () => {
  assert.deepEqual(fitDimensions(50, 30, 160), { width: 50, height: 30 });
});

test('fitDimensions handles a square image at exactly the max size', () => {
  assert.deepEqual(fitDimensions(160, 160, 160), { width: 160, height: 160 });
});

test('prizeImagePath builds a deterministic webp path from eventId and prizeId', () => {
  assert.equal(
    prizeImagePath('11111111-2222-3333-4444-555555555555', 'notepad'),
    '11111111-2222-3333-4444-555555555555/notepad.webp'
  );
});
