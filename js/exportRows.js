function buildExportRows(registrations, eventName) {
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
    if (r.custom_fields && typeof r.custom_fields === 'object') {
      Object.entries(r.custom_fields).forEach(([label, value]) => {
        base[label] = value;
      });
    }
    return base;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildExportRows };
}
