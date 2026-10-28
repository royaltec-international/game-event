const test = require('node:test');
const assert = require('node:assert/strict');
const {
  OTHER,
  CHOICE_TYPES,
  isChoiceType,
  resolveAnswer,
  otherText,
  formatAnswer,
  validateFieldConfig,
  validateAnswer,
  buildCustomFields,
} = require('./fieldAnswers.js');

test('exposes the choice-field constants and identifies choice types', () => {
  assert.equal(OTHER, 'อื่นๆ');
  assert.deepEqual(CHOICE_TYPES, ['checkbox', 'dropdown', 'radio']);
  assert.equal(isChoiceType('checkbox'), true);
  assert.equal(isChoiceType('dropdown'), true);
  assert.equal(isChoiceType('radio'), true);
  assert.equal(isChoiceType('text'), false);
});

test('resolves an answer by key before its current label', () => {
  const field = { key: 'custom_1', label: 'แผนก' };
  assert.equal(resolveAnswer({ custom_1: 'Sales', 'แผนก': 'IT' }, field), 'Sales');
});

test('falls back to a legacy label-keyed answer', () => {
  const field = { key: 'custom_1', label: 'แผนก' };
  assert.equal(resolveAnswer({ 'แผนก': 'IT' }, field), 'IT');
  assert.equal(resolveAnswer(null, field), undefined);
});

test('reads other text by the field key and defaults to empty text', () => {
  const field = { key: 'custom_1', label: 'แผนก' };
  assert.equal(otherText({ custom_1__other: 'ขายส่ง' }, field), 'ขายส่ง');
  assert.equal(otherText(null, field), '');
});

test('formats array answers and expands the other marker', () => {
  const field = { key: 'custom_1', label: 'ประเภทธุรกิจ' };
  assert.equal(formatAnswer({ custom_1: ['A', 'อื่นๆ'], custom_1__other: 'X' }, field), 'A, อื่นๆ: X');
  assert.equal(formatAnswer({ custom_1: ['A', 'อื่นๆ'] }, field), 'A, อื่นๆ');
  assert.equal(formatAnswer({}, field), '');
});

test('rejects a choice field with no non-blank options', () => {
  assert.equal(
    validateFieldConfig({ type: 'checkbox', options: ['', '   '] }),
    'กรุณาเพิ่มตัวเลือกอย่างน้อย 1 ข้อ'
  );
});

test('rejects an ordinary other option when allowOther is enabled', () => {
  assert.equal(
    validateFieldConfig({ type: 'radio', options: ['A', '  อื่นๆ  '], allowOther: true }),
    'ตัวเลือก "อื่นๆ" ใช้ไม่ได้ เมื่อเปิดตัวเลือกอื่นๆ (โปรดระบุ)'
  );
});

test('rejects duplicate trimmed options', () => {
  assert.equal(
    validateFieldConfig({ type: 'dropdown', options: ['โรงงาน', ' โรงงาน '] }),
    'ตัวเลือกซ้ำกัน'
  );
  assert.equal(validateFieldConfig({ type: 'text' }), null);
  assert.equal(validateFieldConfig({ type: 'dropdown', options: ['A', 'B'] }), null);
});

test('validates required checkbox and single-choice answers', () => {
  assert.equal(
    validateAnswer({ type: 'checkbox', required: true }, [], ''),
    'กรุณาเลือกอย่างน้อย 1 ข้อ'
  );
  assert.equal(
    validateAnswer({ type: 'radio', required: true }, '', ''),
    'กรุณาเลือก'
  );
  assert.equal(
    validateAnswer({ type: 'dropdown', required: true }, '', ''),
    'กรุณาเลือก'
  );
});

test('requires other text whenever the other marker is selected', () => {
  assert.equal(validateAnswer({ type: 'checkbox' }, ['A', OTHER], '   '), 'กรุณาระบุ');
  assert.equal(validateAnswer({ type: 'radio' }, OTHER, ''), 'กรุณาระบุ');
  assert.equal(validateAnswer({ type: 'radio' }, OTHER, 'ขายส่ง'), null);
});

test('builds key-based custom fields and ignores base and disabled fields', () => {
  const fields = [
    ...['firstName', 'lastName', 'email', 'phone', 'company', 'position']
      .map(key => ({ key, enabled: true })),
    { key: 'custom_disabled', enabled: false },
    { key: 'custom_text', enabled: true },
    { key: 'custom_choice', enabled: true },
  ];
  const answers = {
    firstName: { value: 'สมชาย', other: '' },
    lastName: { value: 'ใจดี', other: '' },
    email: { value: 'a@b.com', other: '' },
    phone: { value: '0812345678', other: '' },
    company: { value: 'Acme', other: '' },
    position: { value: 'Engineer', other: '' },
    custom_disabled: { value: 'ignore', other: '' },
    custom_text: { value: 'IT', other: '' },
    custom_choice: { value: ['A', OTHER], other: 'ขายส่ง' },
  };

  assert.deepEqual(buildCustomFields(fields, field => answers[field.key]), {
    custom_text: 'IT',
    custom_choice: ['A', OTHER],
    custom_choice__other: 'ขายส่ง',
  });
});

test('does not store other text unless the other marker is selected and text is non-blank', () => {
  const fields = [
    { key: 'custom_a', enabled: true },
    { key: 'custom_b', enabled: true },
  ];
  const answers = {
    custom_a: { value: ['A'], other: 'unused' },
    custom_b: { value: OTHER, other: '   ' },
  };

  assert.deepEqual(buildCustomFields(fields, field => answers[field.key]), {
    custom_a: ['A'],
    custom_b: OTHER,
  });
});
