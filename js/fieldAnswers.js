const OTHER = 'อื่นๆ';
const CHOICE_TYPES = ['checkbox', 'dropdown', 'radio'];
const BASE_FIELD_KEYS = new Set(['firstName', 'lastName', 'email', 'phone', 'company', 'position']);

function isChoiceType(type) {
  return CHOICE_TYPES.includes(type);
}

function resolveAnswer(customFields, field) {
  const fields = customFields || {};
  return fields[field.key] ?? fields[field.label];
}

function otherText(customFields, field) {
  const fields = customFields || {};
  return fields[`${field.key}__other`] || '';
}

function formatAnswer(customFields, field) {
  const answer = resolveAnswer(customFields, field);
  if (answer === undefined) return '';

  const replacement = otherText(customFields, field);
  const formatValue = value => value === OTHER && replacement.trim()
    ? `${OTHER}: ${replacement}`
    : value;

  return Array.isArray(answer)
    ? answer.map(formatValue).join(', ')
    : String(formatValue(answer));
}

function validateFieldConfig(field) {
  if (!isChoiceType(field.type)) return null;

  const options = (field.options || []).map(option => String(option).trim()).filter(Boolean);
  if (options.length === 0) return 'กรุณาเพิ่มตัวเลือกอย่างน้อย 1 ข้อ';
  if (field.allowOther && options.includes(OTHER)) {
    return 'ตัวเลือก "อื่นๆ" ใช้ไม่ได้ เมื่อเปิดตัวเลือกอื่นๆ (โปรดระบุ)';
  }
  if (new Set(options).size !== options.length) return 'ตัวเลือกซ้ำกัน';
  return null;
}

function validateAnswer(field, value, other) {
  if (field.required && field.type === 'checkbox' && (!Array.isArray(value) || value.length === 0)) {
    return 'กรุณาเลือกอย่างน้อย 1 ข้อ';
  }
  if (field.required && (field.type === 'radio' || field.type === 'dropdown') && value === '') {
    return 'กรุณาเลือก';
  }

  const selectedOther = Array.isArray(value) ? value.includes(OTHER) : value === OTHER;
  if (selectedOther && !String(other || '').trim()) return 'กรุณาระบุ';
  return null;
}

function buildCustomFields(fields, read) {
  const customFields = {};

  fields.forEach(field => {
    if (field.enabled === false || BASE_FIELD_KEYS.has(field.key)) return;

    const { value, other } = read(field);
    customFields[field.key] = value;

    const selectedOther = Array.isArray(value) ? value.includes(OTHER) : value === OTHER;
    if (selectedOther && String(other || '').trim()) {
      customFields[`${field.key}__other`] = other;
    }
  });

  return customFields;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OTHER,
    CHOICE_TYPES,
    isChoiceType,
    resolveAnswer,
    otherText,
    formatAnswer,
    validateFieldConfig,
    validateAnswer,
    buildCustomFields,
  };
}
