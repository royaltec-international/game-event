const { test } = require('node:test');
const assert = require('node:assert');
const { splitLabel } = require('./wheelLabel.js');

test('splitLabel breaks at the space nearest the middle', () => {
  assert.deepStrictEqual(splitLabel('ปากกา Multi Funtion'), ['ปากกา Multi', 'Funtion']);
  assert.deepStrictEqual(splitLabel('ตุ๊กตาน้อง Royaltec'), ['ตุ๊กตาน้อง', 'Royaltec']);
});

test('splitLabel breaks Thai without spaces at a word boundary, never inside a cluster', () => {
  const [a, b] = splitLabel('กระเป๋าแท็บแล็ต');
  assert.strictEqual(a + b, 'กระเป๋าแท็บแล็ต');
  assert.ok(a.length > 0 && b.length > 0);
  // second line must not start with a combining mark (vowel/tone sign)
  assert.ok(!/^[ัิ-ฺ็-๎]/.test(b), `bad split: ${a} | ${b}`);
});

test('splitLabel returns a single line when there is nothing to split', () => {
  assert.deepStrictEqual(splitLabel('ร่ม'), ['ร่ม']);
  assert.deepStrictEqual(splitLabel(''), ['']);
});
