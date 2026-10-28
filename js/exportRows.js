// Browser: fieldAnswers.js is an earlier classic script, so its functions are globals.
// Don't redeclare `formatAnswer` here: a global `const` with the same name throws in browsers.
const exportAnswers = typeof require === 'function' ? require('./fieldAnswers.js') : globalThis;
const EXPORT_BASE_FIELD_KEYS = new Set(['firstName', 'lastName', 'email', 'phone', 'company', 'position']);

function buildExportRows(registrations, eventName, formFields = []) {
  return registrations.map(r => {
    const base = {
      'Timestamp': r.created_at,
      'Event Name': eventName,
      'ชื่อ': r.first_name || '',
      'นามสกุล': r.last_name || '',
      'อีเมล': r.email || '',
      'เบอร์โทร': r.phone || '',
      'บริษัท': r.company || '',
      'ตำแหน่ง': r.position || '',
      'ของรางวัล': r.prize_label || '',
      'แบรนด์ที่สนใจ': r.brands || '',
      'PDPA Consent': r.pdpa_consent || '',
    };
    const customFields = r.custom_fields && typeof r.custom_fields === 'object'
      ? r.custom_fields
      : {};
    const consumedKeys = new Set();

    formFields.filter(field => !EXPORT_BASE_FIELD_KEYS.has(field.key)).forEach(field => {
      base[field.label] = exportAnswers.formatAnswer(customFields, field);
      consumedKeys.add(field.key);
      consumedKeys.add(field.label);
    });

    Object.entries(customFields).forEach(([key, value]) => {
      if (consumedKeys.has(key) || key.endsWith('__other')) return;
      base[key] = Array.isArray(value) ? value.join(', ') : value;
    });
    return base;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildExportRows };
}
