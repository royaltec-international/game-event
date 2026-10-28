// Phone field format, chosen per field in admin (config.formFields[].phoneFormat).
// 'mobile' = Thai mobile 06/08/09 + 8 digits; 'any' = 0 + 9-10 digits (landline too).
const PHONE_FORMATS = ['mobile', 'any'];

function phoneFormatOf(field) {
  const format = field && field.phoneFormat;
  return PHONE_FORMATS.includes(format) ? format : 'mobile';
}

function isValidPhone(value, format = 'mobile') {
  const digits = String(value || '').replace(/[-\s]/g, '');
  if (format === 'any') return /^0[0-9]{8,9}$/.test(digits);
  return /^0[689][0-9]{8}$/.test(digits);
}

function phoneErrorMessage(format = 'mobile') {
  return format === 'any'
    ? 'กรุณากรอกเบอร์โทร 9-10 หลัก ขึ้นต้นด้วย 0'
    : 'กรุณากรอกเบอร์มือถือ 10 หลัก (06/08/09)';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PHONE_FORMATS, phoneFormatOf, isValidPhone, phoneErrorMessage };
}
