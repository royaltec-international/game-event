// Builds dashboard report workbook sheet definitions and safe download filenames.
// Consumes Task 6/8 stats shapes; registrant rows arrive pre-built via buildExportRows.

function workbookMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function workbookCostCell(row, field) {
  if (row.costStatus === 'unknown') return 'ไม่ทราบ';
  if (row.costStatus === 'vendor') return 'vendor (0)';
  return workbookMoney(row[field]);
}

function workbookSummaryRows(stats) {
  const cost = stats && stats.cost;
  const costText = cost && cost.coverage && cost.coverage.given > 0
    ? `มีราคาครบ ${cost.coverage.known}/${cost.coverage.given} รายการที่แจก`
    : 'ยังไม่มีรายการที่แจก';
  const missingText = cost && cost.missing && cost.missing.length
    ? ` · อาจต่ำกว่าจริง · ${cost.missing.join(', ')} ยังไม่มีราคา`
    : '';
  return [
    { 'หัวข้อ': 'ผู้ลงทะเบียน', 'ค่า': stats.leads },
    { 'หัวข้อ': 'ติดต่อได้ (PDPA)', 'ค่า': stats.contactable === null ? 'ไม่ได้เปิด PDPA' : stats.contactable },
    { 'หัวข้อ': 'คนใหม่', 'ค่า': stats.newCount === null ? 'นับไม่ได้ (ไม่มีเบอร์/อีเมล)' : stats.newCount },
    { 'หัวข้อ': 'เคยมางานเราแล้ว', 'ค่า': stats.returningCount === null ? 'นับไม่ได้ (ไม่มีเบอร์/อีเมล)' : stats.returningCount },
    { 'หัวข้อ': 'แจกของ', 'ค่า': stats.given },
    { 'หัวข้อ': 'ของหมด', 'ค่า': stats.soldOut },
    { 'หัวข้อ': 'ใกล้หมด', 'ค่า': stats.lowCount },
    { 'หัวข้อ': 'ต้นทุนรวม', 'ค่า': workbookMoney(cost && cost.total) },
    { 'หัวข้อ': 'ต้นทุนต่อ lead', 'ค่า': cost && cost.perLead === null ? null : workbookMoney(cost && cost.perLead) },
    { 'หัวข้อ': 'ต้นทุนต่อ lead ที่ติดต่อได้', 'ค่า': cost && cost.perContactable === null ? (stats.contactable === null ? 'ไม่ได้เปิด PDPA' : null) : workbookMoney(cost && cost.perContactable) },
    { 'หัวข้อ': 'หมายเหตุต้นทุน', 'ค่า': `${costText}${missingText}` },
  ];
}

function workbookChoiceRows(choices) {
  return (choices || []).flatMap(choice => [
    { 'คำถาม': choice.label, 'ตัวเลือก': 'ตอบทั้งหมด', 'จำนวน': choice.answered, '%': null, 'ฐาน': null },
    ...(choice.rows || []).map(row => ({
      'คำถาม': choice.label,
      'ตัวเลือก': row.option,
      'จำนวน': row.count,
      '%': Number(Number(row.pct).toFixed(2)),
      'ฐาน': `${choice.answered} คน (ไม่ตอบ ${choice.unanswered})`,
    })),
  ]);
}

function workbookHourlyRows(hourly) {
  const days = (hourly && hourly.days) || [];
  if (!days.length) return [];
  return days.flatMap(day => (hourly.byDay[day] || []).map((count, hour) => ({
    'วันที่': day,
    'ชั่วโมง': `${String(hour).padStart(2, '0')}:00`,
    'จำนวน': count,
  })));
}

function workbookCompareRows(compare) {
  const rows = [
    { 'หัวข้อ': 'ตัวชี้วัด', 'งานนี้': null, 'งานเทียบ': null, 'ต่าง %': '' },
  ];
  (compare.kpis || []).forEach(kpi => {
    const a = kpi.a === null || kpi.a === undefined ? '' : kpi.a;
    const b = kpi.b === null || kpi.b === undefined ? '' : kpi.b;
    rows.push({
      'หัวข้อ': kpi.key,
      'งานนี้': a,
      'งานเทียบ': b,
      'ต่าง %': kpi.deltaPct === null || kpi.deltaPct === undefined ? '' : Number(Number(kpi.deltaPct).toFixed(2)),
    });
  });
  if ((compare.brands || []).length) {
    rows.push({ 'หัวข้อ': '— แบรนด์ —', 'งานนี้': '', 'งานเทียบ': '', 'ต่าง %': '' });
    compare.brands.forEach(row => rows.push({
      'หัวข้อ': row.name,
      'งานนี้': row.a === null ? '' : row.a,
      'งานเทียบ': row.b === null ? '' : row.b,
      'ต่าง %': '',
    }));
  }
  if ((compare.prizesByLabel || []).length) {
    rows.push({ 'หัวข้อ': '— ของแจก (ที่แจก) —', 'งานนี้': '', 'งานเทียบ': '', 'ต่าง %': '' });
    compare.prizesByLabel.forEach(row => rows.push({
      'หัวข้อ': row.label,
      'งานนี้': row.a === null ? '' : row.a,
      'งานเทียบ': row.b === null ? '' : row.b,
      'ต่าง %': '',
    }));
  }
  return rows;
}

// Registration rows arrive pre-built by the caller via buildExportRows, so the
// workbook functions only assemble sheet definitions around them.
function eventReportSheets(stats, registrationRows, compare) {
  const sheets = [{ name: 'สรุป', rows: workbookSummaryRows(stats) }];

  sheets.push({
    name: 'ของแจก',
    rows: (stats.prizes || []).map(prize => ({
      'ของรางวัล': prize.label,
      'จำนวน': prize.quantity,
      'ใช้ไป': prize.used,
      'เหลือ': prize.remaining,
      'สถานะ': prize.low ? 'ใกล้หมด ⚠' : 'ปกติ',
      'ต้นทุน/ชิ้น': workbookCostCell(prize, 'unitCost'),
      'ต้นทุนรวม': workbookCostCell(prize, 'cost'),
    })),
  });

  if (stats.brands) {
    sheets.push({
      name: 'แบรนด์',
      rows: (stats.brands.rows || []).map(row => ({
        'แบรนด์': row.name,
        'จำนวน': row.count,
        '%': Number(Number(row.pct).toFixed(2)),
      })),
    });
  }

  sheets.push({ name: 'สรุปคำตอบ', rows: workbookChoiceRows(stats.choices) });
  sheets.push({ name: 'รายชั่วโมง', rows: workbookHourlyRows(stats.hourly) });
  sheets.push({ name: 'ผู้ลงทะเบียน', rows: registrationRows || [] });

  if (compare) sheets.push({ name: 'เปรียบเทียบ', rows: workbookCompareRows(compare) });
  return sheets;
}

function yearReportSheets(yearStatsResult, registrationRows) {
  const cost = yearStatsResult && yearStatsResult.cost;
  const costNote = cost
    ? `ต้นทุนรวม ${workbookMoney(cost.total)} · ต่อ lead ${cost.perLead === null ? '' : workbookMoney(cost.perLead)}${cost.complete ? '' : ' · ⚠ ราคาของแจกยังไม่ครบ'}`
    : '';
  const sheets = [
    {
      name: 'สรุปปี',
      rows: [
        { 'หัวข้อ': 'ปี', 'ค่า': yearStatsResult.year === undefined ? '' : yearStatsResult.year },
        { 'หัวข้อ': 'ผู้ลงทะเบียน', 'ค่า': yearStatsResult.leads },
        { 'หัวข้อ': 'ติดต่อได้ (PDPA)', 'ค่า': yearStatsResult.contactable },
        { 'หัวข้อ': 'ผู้ติดต่อไม่ซ้ำ', 'ค่า': yearStatsResult.uniqueContacts },
        { 'หัวข้อ': 'จำนวนงาน', 'ค่า': yearStatsResult.eventCount },
        { 'หัวข้อ': 'ต้นทุนรวม', 'ค่า': workbookMoney(cost && cost.total) },
        { 'หัวข้อ': 'ต้นทุนต่อ lead', 'ค่า': cost && cost.perLead === null ? null : workbookMoney(cost && cost.perLead) },
        { 'หัวข้อ': 'หมายเหตุต้นทุน', 'ค่า': costNote },
      ],
    },
    {
      name: 'งาน',
      rows: (yearStatsResult.table || []).map(row => ({
        'งาน': row.name,
        'วันที่แรก': row.firstDate || '',
        'ลงทะเบียน': row.leads,
        'ติดต่อได้': row.contactable === null ? '' : row.contactable,
        'แจก': row.given,
        'ต้นทุน/lead': row.perLead === null ? '' : workbookMoney(row.perLead),
        'สถานะต้นทุน': row.costComplete ? 'ครบ' : 'ไม่ครบ ⚠',
      })),
    },
    {
      name: 'แบรนด์รวม',
      rows: (yearStatsResult.brandsTop5 || []).map(row => ({
        'แบรนด์': row.name,
        'จำนวน': row.count,
      })),
    },
    {
      name: 'รายเดือน',
      rows: (yearStatsResult.monthly || []).map((count, index) => ({
        'เดือน': index + 1,
        'จำนวน': count,
      })),
    },
    { name: 'ผู้ลงทะเบียน', rows: registrationRows || [] },
  ];
  return sheets;
}

function reportFilename(name, dateIso) {
  const base = String(name == null ? '' : name)
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const date = String(dateIso || '').slice(0, 10);
  const suffix = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `-${date}` : '';
  return `${base || 'report'}${suffix}.xlsx`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { eventReportSheets, yearReportSheets, reportFilename };
}
