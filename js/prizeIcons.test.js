const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PRIZE_ICONS,
  PRIZE_ICON_LABELS,
  LEGACY_EMOJI_ICONS,
  iconNameFor,
  iconSvg,
  iconDataUrl,
} = require('./prizeIcons.js');

const sourceIcons = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../assets/icons/lucide-subset-0.460.0.json'),
  'utf8',
));

test('vendored icons exactly match the Lucide source subset', () => {
  assert.deepEqual(PRIZE_ICONS, sourceIcons);
  assert.deepEqual(Object.keys(PRIZE_ICON_LABELS), Object.keys(sourceIcons));
});

test('valid iconName wins and invalid iconName falls back to legacy emoji', () => {
  assert.equal(iconNameFor({ iconName: 'tablet', icon: '🎁' }), 'tablet');
  assert.equal(iconNameFor({ iconName: 'missing', icon: '🎁' }), 'gift');
  assert.equal(iconNameFor({ iconName: '__proto__' }), 'gift');
  assert.equal(iconNameFor({ iconName: 'constructor' }), 'gift');
});

test('every legacy emoji maps with or without a trailing variation selector', () => {
  const expected = {
    '🎁': 'gift',
    '☂': 'umbrella',
    '⛱': 'umbrella',
    '🛍': 'shopping-bag',
    '💼': 'briefcase',
    '🌀': 'fan',
    '🪭': 'fan',
    '📓': 'sticky-note',
    '📒': 'sticky-note',
    '📝': 'sticky-note',
    '🧮': 'calculator',
    '📱': 'smartphone',
    '🧸': 'smile',
    '☕': 'coffee',
    '🥤': 'cup-soda',
    '🖊': 'pen-line',
    '✏': 'pen-line',
    '🎧': 'headphones',
    '👕': 'shirt',
    '🎒': 'backpack',
    '⌚': 'watch',
    '🏆': 'trophy',
    '🎫': 'ticket',
    '📦': 'package',
  };

  assert.deepEqual(LEGACY_EMOJI_ICONS, expected);
  for (const [emoji, iconName] of Object.entries(expected)) {
    assert.equal(iconNameFor({ icon: emoji }), iconName, emoji);
    assert.equal(iconNameFor({ icon: `${emoji}\uFE0F` }), iconName, `${emoji} + VS16`);
  }
});

test('unknown or absent prize data falls back to gift', () => {
  assert.equal(iconNameFor({ icon: '❓' }), 'gift');
  assert.equal(iconNameFor(null), 'gift');
  assert.equal(iconNameFor(undefined), 'gift');
  assert.equal(iconNameFor({}), 'gift');
  assert.equal(iconNameFor('not a prize'), 'gift');
});

test('iconSvg renders one safe, sized SVG', () => {
  const svg = iconSvg('tablet', '#1f5f8b', 36);

  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.equal((svg.match(/<svg/g) || []).length, 1);
  assert.match(svg, /stroke="#1f5f8b"/);
  assert.match(svg, /width="36" height="36"/);
  assert.ok(svg.includes(PRIZE_ICONS.tablet));
});

test('iconSvg uses gift for unknown names and sanitizes unsafe values', () => {
  const svg = iconSvg('constructor', 'red" onload="x', 0);

  assert.ok(svg.includes(PRIZE_ICONS.gift));
  assert.match(svg, /stroke="currentColor"/);
  assert.match(svg, /width="24" height="24"/);
});

test('iconDataUrl decodes to the matching SVG', () => {
  const dataUrl = iconDataUrl('coffee', '#abc');
  const prefix = 'data:image/svg+xml;charset=utf-8,';

  assert.ok(dataUrl.startsWith(prefix));
  assert.equal(decodeURIComponent(dataUrl.slice(prefix.length)), iconSvg('coffee', '#abc', 24));
});
