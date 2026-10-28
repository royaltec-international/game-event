function dashboardViewEsc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// node tests load this file directly; browsers get these as earlier classic scripts.
const dashboardReportWorkbook = typeof require === 'function' ? require('./reportWorkbook.js') : globalThis;
const dashboardReportRows = typeof require === 'function' ? require('./exportRows.js') : globalThis;
const dashboardReportStats = typeof require === 'function' ? require('./dashboardStats.js') : globalThis;

function dashboardViewNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dashboardViewRatio(value, max) {
  const safeMax = dashboardViewNumber(max);
  if (safeMax <= 0) return 0;
  return Math.min(100, Math.max(0, (dashboardViewNumber(value) / safeMax) * 100));
}

function dashboardViewPercent(value) {
  return Number(dashboardViewNumber(value).toFixed(2));
}

function kpiTile(label, value, sub) {
  return `<div class="dash-kpi"><b>${dashboardViewEsc(value)}</b><span>${dashboardViewEsc(label)}</span>${sub ? `<small>${dashboardViewEsc(sub)}</small>` : ''}</div>`;
}

function barRow(label, value, max, text, opts = {}) {
  const width = dashboardViewPercent(dashboardViewRatio(value, max));
  const warnClass = opts.warn ? ' warn' : '';
  return `<div class="dash-bar-row${warnClass}"><span class="dash-bar-name" title="${dashboardViewEsc(label)}">${dashboardViewEsc(label)}</span><div class="dash-bar-track" aria-hidden="true"><i class="dash-bar-fill${warnClass}" style="width:${width}%"></i></div><span class="dash-bar-value${warnClass}">${dashboardViewEsc(text)}</span></div>`;
}

function hourlyChart(counts24, overlay24 = null) {
  const counts = Array.from({ length: 24 }, (_, hour) => (
    Math.max(0, dashboardViewNumber(Array.isArray(counts24) ? counts24[hour] : 0))
  ));
  const overlay = Array.isArray(overlay24)
    ? Array.from({ length: 24 }, (_, hour) => Math.max(0, dashboardViewNumber(overlay24[hour])))
    : null;
  const max = Math.max(0, ...counts, ...(overlay || []));
  const peak = Math.max(...counts);
  const peakHour = peak > 0 ? counts.indexOf(peak) : null;
  const bars = counts.map((count, hour) => {
    const height = dashboardViewPercent(dashboardViewRatio(count, max));
    return `<i class="dash-hour-bar" data-hour="${hour}" style="height:${height}%" title="${String(hour).padStart(2, '0')}:00 · ${count} คน"></i>`;
  }).join('');
  const axis = counts.map((_, hour) => (
    `<span>${hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}</span>`
  )).join('');
  const line = overlay && max > 0
    ? `<svg class="dash-hour-overlay" viewBox="0 0 720 80" preserveAspectRatio="none" aria-hidden="true"><polyline points="${overlay.map((count, hour) => {
      const x = dashboardViewPercent(((hour + 0.5) / 24) * 720);
      const y = dashboardViewPercent(76 - (dashboardViewRatio(count, max) * 0.68));
      return `${x},${y}`;
    }).join(' ')}" /></svg>`
    : '';
  const peakText = peakHour === null
    ? 'ยังไม่มีข้อมูลรายชั่วโมง'
    : `ชั่วโมงพีค ${String(peakHour).padStart(2, '0')}:00 · ${peak} คน`;

  return `<div class="dash-hour-chart" role="img" aria-label="${dashboardViewEsc(peakText)}"><div class="dash-hour-plot">${bars}${line}</div><div class="dash-hour-axis">${axis}</div><p class="dash-note">${dashboardViewEsc(peakText)}</p></div>`;
}

function monthlyChart(counts12) {
  const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const counts = Array.from({ length: 12 }, (_, month) => (
    Math.max(0, dashboardViewNumber(Array.isArray(counts12) ? counts12[month] : 0))
  ));
  const max = Math.max(0, ...counts);
  const bars = counts.map((count, month) => (
    `<i class="dash-month-bar" style="height:${dashboardViewPercent(dashboardViewRatio(count, max))}%" title="${monthLabels[month]} · ${count} คน"></i>`
  )).join('');
  const axis = monthLabels.map(label => `<span>${label}</span>`).join('');
  return `<div class="dash-month-chart" role="img" aria-label="ลงทะเบียนรายเดือน"><div class="dash-month-plot">${bars}</div><div class="dash-month-axis">${axis}</div></div>`;
}

function pairedBarRow(label, a, b, max, text) {
  const widthA = a === null || a === undefined ? 0 : dashboardViewPercent(dashboardViewRatio(a, max));
  const widthB = b === null || b === undefined ? 0 : dashboardViewPercent(dashboardViewRatio(b, max));
  const missingA = a === null || a === undefined ? ' missing' : '';
  const missingB = b === null || b === undefined ? ' missing' : '';
  return `<div class="dash-bar-row dash-paired-row"><span class="dash-bar-name" title="${dashboardViewEsc(label)}">${dashboardViewEsc(label)}</span><div class="dash-paired-track"><div class="dash-bar-track"><i class="dash-bar-fill dash-paired-a${missingA}" style="width:${widthA}%"></i></div><div class="dash-bar-track"><i class="dash-bar-fill dash-paired-b${missingB}" style="width:${widthB}%"></i></div></div><span class="dash-bar-value">${dashboardViewEsc(text)}</span></div>`;
}

function compareKpiSub(otherName, otherValue, deltaPct, incomplete = false) {
  let delta = '';
  if (deltaPct !== null && deltaPct !== undefined && Number.isFinite(Number(deltaPct))) {
    const numericDelta = dashboardViewPercent(Number(deltaPct));
    const direction = numericDelta > 0 ? '▲' : numericDelta < 0 ? '▼' : '•';
    delta = ` ${direction} ${Math.abs(numericDelta)}%`;
  }
  return `${otherName}: ${otherValue}${delta}${incomplete ? ' ⚠ ต้นทุนไม่ครบ' : ''}`;
}

var DashboardView = (function dashboardViewModule() {
  const dashboardState = {
    active: false,
    initialized: false,
    loading: false,
    requestId: 0,
    events: [],
    view: null,
    year: null,
    yearData: null,
    yearCache: new Map(),
    eventId: null,
    data: null,
    compareId: null,
    compareData: null,
    comparePicking: false,
    day: null,
    moreOpen: false,
    connected: true,
    updatedAt: null,
    timer: null,
  };

  function dashboardEventRoot() {
    return typeof document === 'undefined' ? null : document.getElementById('dashboard-event-view');
  }

  function dashboardYearRoot() {
    return typeof document === 'undefined' ? null : document.getElementById('dashboard-year-view');
  }

  function dashboardRoot() {
    return dashboardState.view === 'year' ? dashboardYearRoot() : dashboardEventRoot();
  }

  function dashboardSetVisibleView(view) {
    dashboardState.view = view;
    const yearRoot = dashboardYearRoot();
    const eventRoot = dashboardEventRoot();
    if (yearRoot) yearRoot.hidden = view !== 'year';
    if (eventRoot) eventRoot.hidden = view !== 'event';
  }

  function dashboardIsMobile() {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(max-width: 640px)').matches
      : false;
  }

  function dashboardFormatInteger(value) {
    return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(dashboardViewNumber(value));
  }

  function dashboardFormatDecimal(value, digits = 1) {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(dashboardViewNumber(value));
  }

  function dashboardFormatMoney(value) {
    if (value === null || value === undefined) return '—';
    return `฿${new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(dashboardViewNumber(value))}`;
  }

  function dashboardBangkokTime(date) {
    const shifted = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`;
  }

  function dashboardEventYear(event) {
    if (!event || !event.created_at) return '';
    try {
      return bangkokParts(event.created_at).year;
    } catch (_error) {
      return new Date(event.created_at).getUTCFullYear();
    }
  }

  function dashboardFormatDay(dateText) {
    const date = new Date(`${dateText}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) return dateText;
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  function dashboardHiddenFields(eventId) {
    try {
      const parsed = JSON.parse(localStorage.getItem(`dash-hidden-${eventId}`) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch (_error) {
      return new Set();
    }
  }

  function dashboardSaveHiddenFields(eventId, hidden) {
    try {
      localStorage.setItem(`dash-hidden-${eventId}`, JSON.stringify([...hidden]));
    } catch (_error) {
      // Storage can be unavailable in private browsing; the current render still works.
    }
  }

  function dashboardStatusHtml() {
    const text = dashboardState.connected && dashboardState.updatedAt
      ? `อัปเดต ${dashboardBangkokTime(dashboardState.updatedAt)}`
      : 'ขาดการเชื่อมต่อ';
    const errorClass = dashboardState.connected ? '' : ' error';
    return `<span id="dashboard-status" class="dash-status${errorClass}"><i></i>${dashboardViewEsc(text)}</span>`;
  }

  function dashboardUpdateStatus() {
    if (typeof document === 'undefined') return;
    const current = dashboardRoot()?.querySelector('#dashboard-status');
    if (!current) return;
    const holder = document.createElement('div');
    holder.innerHTML = dashboardStatusHtml();
    current.replaceWith(holder.firstElementChild);
  }

  function dashboardRenderEmpty(message) {
    const root = dashboardRoot();
    if (!root) return;
    root.innerHTML = `<div class="dash-empty">${dashboardViewEsc(message)}</div>`;
  }

  function dashboardYears() {
    return [...new Set(dashboardState.events.map(dashboardEventYear).filter(Number.isFinite))]
      .sort((a, b) => b - a);
  }

  function dashboardRenderYear() {
    const root = dashboardYearRoot();
    if (!root || !dashboardState.yearData) return;
    const stats = dashboardState.yearData.stats;
    const years = dashboardYears();
    const yearOptions = years.map(year => (
      `<option value="${year}"${year === dashboardState.year ? ' selected' : ''}>${year}</option>`
    )).join('');
    const tableMax = Math.max(0, ...stats.table.map(row => row.leads));
    const tableRows = stats.table.length ? stats.table.map(row => {
      const width = dashboardViewPercent(dashboardViewRatio(row.leads, tableMax));
      const contactable = row.contactable === null ? 'ไม่ได้เปิด PDPA' : dashboardFormatInteger(row.contactable);
      const cost = `${row.costComplete ? '' : '⚠ '}${dashboardFormatMoney(row.perLead)}`;
      return `<tr class="dash-year-event" data-dash-action="event" data-event-id="${dashboardViewEsc(row.eventId)}" tabindex="0"><td><button type="button" data-dash-action="event" data-event-id="${dashboardViewEsc(row.eventId)}">${dashboardViewEsc(row.name)}</button></td><td>${row.firstDate ? dashboardViewEsc(dashboardFormatDay(row.firstDate)) : '—'}</td><td>${dashboardFormatInteger(row.leads)}</td><td><div class="dash-table-bar" aria-hidden="true"><i style="width:${width}%"></i></div></td><td>${contactable}</td><td>${dashboardFormatInteger(row.given)}</td><td class="${row.costComplete ? '' : 'warn'}">${cost}</td></tr>`;
    }).join('') : '<tr><td colspan="7" class="dash-empty-inline">ยังไม่มีงานในปีนี้</td></tr>';
    const brandMax = Math.max(0, ...stats.brandsTop5.map(row => row.count));
    const brands = stats.brandsTop5.length
      ? stats.brandsTop5.map(row => barRow(
        row.name,
        row.count,
        brandMax,
        `${dashboardFormatInteger(row.count)} คน`
      )).join('')
      : '<div class="dash-empty-inline">ยังไม่มีข้อมูลแบรนด์</div>';
    const costValue = `${stats.cost.complete ? '' : '⚠ '}${dashboardFormatMoney(stats.cost.perLead)}`;
    const kpis = [
      kpiTile('ลงทะเบียนรวม', dashboardFormatInteger(stats.leads)),
      kpiTile('ผู้ติดต่อไม่ซ้ำทั้งปี', dashboardFormatInteger(stats.uniqueContacts)),
      kpiTile('ติดต่อต่อได้ (PDPA)', dashboardFormatInteger(stats.contactable)),
      kpiTile('จำนวนงาน', dashboardFormatInteger(stats.eventCount)),
      kpiTile('ต้นทุนต่อ lead ทั้งปี', costValue, stats.cost.complete ? '' : '⚠ ราคาของแจกยังไม่ครบ'),
    ].join('');

    root.innerHTML = `<div class="dash-shell dash-year-shell">
      <div class="dash-toolbar dash-year-toolbar">
        <label class="dash-year-picker"><span>ภาพรวมปี</span><select id="dashboard-year-select">${yearOptions}</select></label>
        <div class="dash-live">${dashboardStatusHtml()}<button type="button" class="btn btn-outline btn-sm" data-dash-action="refresh-year">↻ รีเฟรช</button><button type="button" class="btn btn-primary btn-sm" data-dash-action="export-year">Export ภาพรวมปี ${dashboardViewEsc(dashboardState.year)}</button></div>
      </div>
      <div class="dash-kpis dash-year-kpis">${kpis}</div>
      <div class="dash-year-grid">
        <section><h3>งานทั้งหมดในปี (คลิกเพื่อดูละเอียด)</h3><div class="dash-card dash-table-wrap"><table class="dash-year-table"><thead><tr><th>งาน</th><th>วันที่แรก</th><th>ลงทะเบียน</th><th aria-label="สัดส่วนผู้ลงทะเบียน"></th><th>ติดต่อได้</th><th>แจก</th><th>ต้นทุน/lead</th></tr></thead><tbody>${tableRows}</tbody></table></div></section>
        <div><section><h3>แบรนด์ที่สนใจ รวมทุกงาน <span class="dash-tag">Top 5</span></h3><div class="dash-card">${brands}<p class="dash-note">นับคน (เลือกได้หลายแบรนด์) · จาก ${dashboardFormatInteger(stats.leads)} คน</p></div></section><section><h3>ลงทะเบียนรายเดือน</h3><div class="dash-card">${monthlyChart(stats.monthly)}</div></section></div>
      </div>
    </div>`;
  }

  function dashboardRenderPrizes(stats) {
    if (!stats.prizes.length) return '<div class="dash-card dash-empty-inline">ยังไม่มีของรางวัล</div>';
    return `<div class="dash-card">${stats.prizes.map(prize => barRow(
      prize.label,
      prize.used,
      prize.quantity,
      `${prize.low ? '⚠ ' : ''}เหลือ ${dashboardFormatInteger(prize.remaining)}/${dashboardFormatInteger(prize.quantity)}`,
      { warn: prize.low }
    )).join('')}<p class="dash-note">แถบ = แจกแล้ว · ใกล้หมด = เหลือ ≤10% หรือ ≤5 ชิ้น</p></div>`;
  }

  function dashboardRenderBrands(stats, comparison, currentName, otherName) {
    if (comparison) {
      const max = Math.max(0, ...comparison.brands.flatMap(row => [dashboardViewNumber(row.a), dashboardViewNumber(row.b)]));
      const rows = comparison.brands.length
        ? comparison.brands.map(row => pairedBarRow(
          row.name,
          row.a,
          row.b,
          max,
          `${row.a === null ? '—' : dashboardFormatInteger(row.a)} / ${row.b === null ? '—' : dashboardFormatInteger(row.b)}`
        )).join('')
        : '<div class="dash-empty-inline">ไม่มีชื่อแบรนด์ที่เปรียบเทียบได้</div>';
      return `<section><h3>แบรนด์ที่สนใจ (คน)</h3><div class="dash-card">${rows}<p class="dash-note"><span class="dash-legend-current">■</span> ${dashboardViewEsc(currentName)} <span class="dash-legend-other">■</span> ${dashboardViewEsc(otherName)} · แบรนด์ที่มีแค่งานเดียวแสดง “—”</p></div></section>`;
    }
    if (!stats.brands) return '';
    const max = Math.max(0, ...stats.brands.rows.map(row => row.count));
    const rows = stats.brands.rows.length
      ? stats.brands.rows.map(row => barRow(
        row.name,
        row.count,
        max,
        `${dashboardFormatInteger(row.count)} คน (${dashboardFormatDecimal(row.pct)}%)`
      )).join('')
      : '<div class="dash-empty-inline">ยังไม่มีคำตอบ</div>';
    return `<section><h3>แบรนด์ที่สนใจ</h3><div class="dash-card">${rows}<p class="dash-note">สนใจอย่างน้อย 1 แบรนด์ ${dashboardFormatDecimal(stats.brands.anyPct)}% · เฉลี่ย ${dashboardFormatDecimal(stats.brands.avgPerPerson)} แบรนด์/คน</p><p class="dash-note">% จากผู้ลงทะเบียน ${dashboardFormatInteger(stats.brands.base)} คน · เลือกได้หลายข้อ รวมเกิน 100%</p></div></section>`;
  }

  function dashboardRenderChoices(stats, eventId, comparison, currentName, otherName) {
    if (comparison) {
      const cards = comparison.choices.map(choice => {
        const max = Math.max(0, ...choice.rows.flatMap(row => [row.a, row.b]));
        const rows = choice.rows.map(row => pairedBarRow(
          row.option,
          row.a,
          row.b,
          max,
          `${dashboardFormatInteger(row.a)} / ${dashboardFormatInteger(row.b)}`
        )).join('');
        return `<div class="dash-card dash-choice-card"><div class="dash-choice-title">${dashboardViewEsc(choice.label)}</div>${rows}</div>`;
      }).join('');
      return `<section><h3>สรุปคำตอบที่ชื่อ field ตรงกัน</h3>${cards || '<div class="dash-card dash-empty-inline">ไม่มีชื่อ field ที่ตรงกัน</div>'}<p class="dash-note"><span class="dash-legend-current">■</span> ${dashboardViewEsc(currentName)} <span class="dash-legend-other">■</span> ${dashboardViewEsc(otherName)}</p></section>`;
    }
    if (!stats.choices.length) return '';
    const hidden = dashboardHiddenFields(eventId);
    const chips = stats.choices.map(choice => {
      const isHidden = hidden.has(String(choice.key));
      return `<button type="button" class="dash-chip${isHidden ? '' : ' active'}" data-dash-action="choice" data-field-key="${dashboardViewEsc(choice.key)}" aria-pressed="${isHidden ? 'false' : 'true'}">${isHidden ? '＋' : '✓'} ${dashboardViewEsc(choice.label)}</button>`;
    }).join('');
    const cards = stats.choices.filter(choice => !hidden.has(String(choice.key))).map(choice => {
      const max = Math.max(0, ...choice.rows.map(row => row.count));
      const rows = choice.rows.map(row => barRow(
        row.option,
        row.count,
        max,
        `${dashboardFormatInteger(row.count)} คน · ${dashboardFormatDecimal(row.pct)}%`
      )).join('');
      const typeNote = choice.multi ? 'เลือกได้หลายข้อ' : 'เลือกข้อเดียว';
      return `<div class="dash-card dash-choice-card"><div class="dash-choice-title">${dashboardViewEsc(choice.label)} <span>${typeNote}</span></div>${rows}<p class="dash-note">ตอบ ${dashboardFormatInteger(choice.answered)} คน · ไม่ตอบ ${dashboardFormatInteger(choice.unanswered)}${choice.multi ? ' · รวมเปอร์เซ็นต์อาจเกิน 100%' : ''}</p></div>`;
    }).join('');
    return `<section><h3>สรุปคำตอบ</h3><div class="dash-chips" aria-label="เลือกหัวข้อที่แสดง">${chips}</div>${cards || '<div class="dash-card dash-empty-inline">ซ่อนทุกหัวข้อแล้ว</div>'}</section>`;
  }

  function dashboardRenderHourly(stats, otherStats = null) {
    const days = stats.hourly.days;
    if (dashboardState.day !== 'total' && !days.includes(dashboardState.day)) {
      dashboardState.day = days[0] || 'total';
    }
    const counts = dashboardState.day === 'total'
      ? stats.hourly.total
      : (stats.hourly.byDay[dashboardState.day] || stats.hourly.total);
    let overlay = null;
    if (otherStats) {
      if (dashboardState.day === 'total') {
        overlay = otherStats.hourly.total;
      } else {
        const dayIndex = days.indexOf(dashboardState.day);
        const otherDay = otherStats.hourly.days[dayIndex];
        overlay = otherDay ? otherStats.hourly.byDay[otherDay] : Array(24).fill(0);
      }
    }
    const tabs = days.map((day, index) => (
      `<button type="button" class="dash-day-tab${dashboardState.day === day ? ' active' : ''}" data-dash-action="day" data-day="${day}">วันที่ ${index + 1} (${dashboardViewEsc(dashboardFormatDay(day))})</button>`
    )).join('');
    return `<section class="dash-hourly"><h3>ลงทะเบียนรายชั่วโมง</h3><div class="dash-card"><div class="dash-day-tabs">${tabs}<button type="button" class="dash-day-tab${dashboardState.day === 'total' ? ' active' : ''}" data-dash-action="day" data-day="total">รวมทุกวัน</button></div>${hourlyChart(counts, overlay)}${otherStats ? '<p class="dash-note"><span class="dash-legend-other">- - -</span> เส้นประ = งานที่เปรียบเทียบ</p>' : ''}</div></section>`;
  }

  function dashboardRenderMatchedPrizes(comparison, currentName, otherName) {
    if (!comparison) return '';
    const max = Math.max(0, ...comparison.prizesByLabel.flatMap(row => [row.a, row.b]));
    const rows = comparison.prizesByLabel.length
      ? comparison.prizesByLabel.map(row => pairedBarRow(
        row.label,
        row.a,
        row.b,
        max,
        `${dashboardFormatInteger(row.a)} / ${dashboardFormatInteger(row.b)}`
      )).join('')
      : '<div class="dash-empty-inline">ไม่มีชื่อของแจกที่ตรงกัน</div>';
    return `<section><h3>ของแจกชื่อเดียวกัน — ยอดแจก</h3><div class="dash-card">${rows}<p class="dash-note"><span class="dash-legend-current">■</span> ${dashboardViewEsc(currentName)} <span class="dash-legend-other">■</span> ${dashboardViewEsc(otherName)}</p></div></section>`;
  }

  function dashboardRenderCompareKpis(stats, otherStats, comparison, otherName) {
    const rows = new Map(comparison.kpis.map(row => [row.key, row]));
    const completeA = comparison.costComplete.a;
    const completeB = comparison.costComplete.b;
    const definitions = [
      ['leads', 'ลงทะเบียน', value => dashboardFormatInteger(value)],
      ['contactable', 'ติดต่อต่อได้ (PDPA)', value => value === null ? 'ไม่ได้เปิด PDPA' : dashboardFormatInteger(value)],
      ['newCount', 'คนใหม่', value => value === null ? 'นับไม่ได้' : dashboardFormatInteger(value)],
      ['returningCount', 'เคยมางานเราแล้ว', value => value === null ? 'นับไม่ได้' : dashboardFormatInteger(value)],
      ['given', 'ได้ของ (ชิ้น)', value => dashboardFormatInteger(value)],
      ['soldOut', 'ลงทะเบียนแต่ของหมด', value => dashboardFormatInteger(value)],
      ['lowCount', 'รายการใกล้หมด', value => dashboardFormatInteger(value)],
      ['perLead', 'ต้นทุนต่อ lead', value => dashboardFormatMoney(value)],
      ['perContactable', 'ต้นทุนต่อ lead ที่ติดต่อได้', value => value === null ? 'ไม่ได้เปิด PDPA' : dashboardFormatMoney(value)],
    ];
    return definitions.map(([key, label, format]) => {
      const row = rows.get(key);
      const isCost = key === 'perLead' || key === 'perContactable';
      const value = `${isCost && !completeA ? '⚠ ' : ''}${format(row.a)}`;
      return kpiTile(label, value, compareKpiSub(otherName, format(row.b), row.deltaPct, isCost && !completeB));
    }).join('');
  }

  function dashboardRenderCost(stats) {
    const coverage = stats.cost.coverage;
    const coverageText = coverage.given > 0
      ? `มีราคาครบ ${coverage.known}/${coverage.given} รายการที่แจก`
      : 'ยังไม่มีรายการที่แจก';
    const warning = stats.cost.missing.length
      ? `<div class="dash-cost-warning">⚠ อาจต่ำกว่าจริง · ${dashboardViewEsc(stats.cost.missing.join(', '))} ยังไม่มีราคา</div>`
      : '';
    return `<section><h3>ต้นทุนของแจก</h3><div class="dash-card"><div class="dash-cost-line"><strong>ต้นทุนรวม ${dashboardFormatMoney(stats.cost.total)}</strong><span>${dashboardViewEsc(coverageText)}</span></div>${warning}</div></section>`;
  }

  function dashboardRender() {
    const root = dashboardEventRoot();
    if (!root || !dashboardState.data) return;
    const data = dashboardState.data;
    const event = data.event;
    const stats = data.stats;
    const otherData = dashboardState.compareData;
    const comparison = otherData ? compareStats(stats, otherData.stats) : null;
    const year = dashboardEventYear(event);
    const hiddenLow = stats.prizes.filter(prize => prize.low);
    const alert = hiddenLow.length
      ? `<div class="dash-low-alert">${hiddenLow.map(prize => `⚠ ${dashboardViewEsc(prize.label)} เหลือ ${dashboardFormatInteger(prize.remaining)} ชิ้น`).join(' · ')}</div>`
      : '';
    const eventOptions = dashboardState.events.map(item => (
      `<option value="${dashboardViewEsc(item.id)}"${item.id === dashboardState.eventId ? ' selected' : ''}>${dashboardViewEsc(item.name)}</option>`
    )).join('');
    const compareOptions = dashboardState.events.filter(item => item.id !== dashboardState.eventId).map(item => (
      `<option value="${dashboardViewEsc(item.id)}"${item.id === dashboardState.compareId ? ' selected' : ''}>${dashboardViewEsc(item.name)}</option>`
    )).join('');
    let compareControls = '<button type="button" class="btn btn-outline btn-sm" data-dash-action="compare-open">⇄ เปรียบเทียบกับ…</button>';
    if (dashboardState.comparePicking || otherData) {
      compareControls = `<div class="dash-compare-picker"><span>${otherData ? 'เทียบกับ' : 'เลือกงานเทียบ'}</span><select id="dashboard-compare-select"><option value=""${otherData ? '' : ' selected'} disabled>เลือก Event…</option>${compareOptions}</select><button type="button" class="btn btn-outline btn-sm" data-dash-action="compare-cancel">✕ เลิกเทียบ</button></div>`;
    }
    const contactable = stats.pdpaOff ? 'ไม่ได้เปิด PDPA' : dashboardFormatInteger(stats.contactable);
    const newReturning = stats.newCount === null
      ? 'นับไม่ได้'
      : `${dashboardFormatInteger(stats.newCount)} / ${dashboardFormatInteger(stats.returningCount)}`;
    const newReturningSub = stats.newCount === null ? 'ไม่มีเบอร์/อีเมล' : '';
    const contactableCost = stats.pdpaOff ? 'ไม่ได้เปิด PDPA' : dashboardFormatMoney(stats.cost.perContactable);
    const kpis = comparison
      ? dashboardRenderCompareKpis(stats, otherData.stats, comparison, otherData.event.name)
      : [
        kpiTile('ลงทะเบียน', dashboardFormatInteger(stats.leads)),
        kpiTile('ได้ของ (ชิ้น)', dashboardFormatInteger(stats.given)),
        kpiTile('ติดต่อต่อได้ (PDPA)', contactable),
        kpiTile('คนใหม่ / เคยมางานเราแล้ว', newReturning, newReturningSub),
        kpiTile('ลงทะเบียนแต่ของหมด', dashboardFormatInteger(stats.soldOut)),
        kpiTile('รายการใกล้หมด', dashboardFormatInteger(stats.lowCount)),
        kpiTile('ต้นทุนต่อ lead', dashboardFormatMoney(stats.cost.perLead)),
        kpiTile('ต้นทุนต่อ lead ที่ติดต่อได้', contactableCost),
      ].join('');
    const extraClass = dashboardState.moreOpen ? ' open' : '';

    root.innerHTML = `<div class="dash-shell">
      <div class="dash-crumb"><button type="button" class="dash-crumb-link" data-dash-action="year" data-year="${dashboardViewEsc(year)}">ภาพรวมปี ${dashboardViewEsc(year)}</button> <span>›</span> ${dashboardViewEsc(event.name)}</div>
      <div class="dash-toolbar">
        <div class="dash-event-tools"><label><span class="sr-only">เลือก Event</span><select id="dashboard-event-select">${eventOptions}</select></label><div class="dash-compare-controls">${compareControls}</div></div>
        <div class="dash-live">${dashboardStatusHtml()}<button type="button" class="btn btn-outline btn-sm" data-dash-action="refresh">↻ รีเฟรช</button></div>
      </div>
      ${alert}
      <div class="dash-kpis">${kpis}</div>
      <div class="dash-primary-grid">
        <section><h3>ของแจก — เหลือน้อยก่อน</h3>${dashboardRenderPrizes(stats)}</section>
        ${dashboardRenderHourly(stats, otherData && otherData.stats)}
      </div>
      <button type="button" class="btn btn-outline dash-more-toggle" data-dash-action="more" aria-expanded="${dashboardState.moreOpen}">${dashboardState.moreOpen ? 'ซ่อนรายละเอียด' : 'ดูเพิ่ม'}</button>
      <div class="dash-more${extraClass}">
        <div class="dash-detail-grid">
          <div>${dashboardRenderBrands(stats, comparison, event.name, otherData && otherData.event.name)}${dashboardRenderMatchedPrizes(comparison, event.name, otherData && otherData.event.name)}${dashboardRenderCost(stats)}</div>
          <div>${dashboardRenderChoices(stats, event.id, comparison, event.name, otherData && otherData.event.name)}</div>
        </div>
        <div class="dash-export-row"><button type="button" class="btn btn-primary" data-dash-action="export-event">Export รายงานงานนี้ (.xlsx)</button></div>
      </div>
    </div>`;
  }

  // Earlier events' contacts don't change during an event, so fetch them once per event
  // instead of on every 30 s refresh.
  const dashboardPriorKeysCache = new Map();

  async function dashboardFetchPriorContactKeys(event) {
    if (dashboardPriorKeysCache.has(event.id)) return dashboardPriorKeysCache.get(event.id);
    const keys = await dashboardLoadPriorContactKeys(event);
    dashboardPriorKeysCache.set(event.id, keys);
    return keys;
  }

  async function dashboardLoadPriorContactKeys(event) {
    const eventTime = new Date(event.created_at).getTime();
    const priorIds = dashboardState.events
      .filter(candidate => new Date(candidate.created_at).getTime() < eventTime)
      .map(candidate => candidate.id);
    const keys = new Set();
    if (!priorIds.length) return keys;

    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('registrations')
        .select('event_id, phone, email, created_at')
        .in('event_id', priorIds)
        .order('created_at')
        .order('id')
        .range(from, from + 999);
      if (error) throw error;
      (data || []).forEach(row => contactKeys(row).forEach(key => keys.add(key)));
      if (!data || data.length < 1000) return keys;
    }
  }

  async function dashboardFetchRawEventData(event) {
    const registrationsPromise = fetchAllRegistrations(event.id);
    const prizesPromise = supabase.from('prizes')
      .select('id, label, quantity, used, remaining')
      .eq('event_id', event.id);
    const costsPromise = supabase.from('prize_costs')
      .select('prize_id, unit_cost, vendor_sponsored')
      .eq('event_id', event.id);
    const [registrations, prizesResult, costsResult] = await Promise.all([
      registrationsPromise,
      prizesPromise,
      costsPromise,
    ]);
    if (registrations === null) throw new Error('Dashboard registrations request failed');
    if (prizesResult.error) throw prizesResult.error;
    if (costsResult.error) throw costsResult.error;

    return {
      event,
      registrations,
      prizes: prizesResult.data || [],
      costs: costsResult.data || [],
    };
  }

  async function dashboardFetchEventData(event) {
    const [raw, priorContactKeys] = await Promise.all([
      dashboardFetchRawEventData(event),
      dashboardFetchPriorContactKeys(event),
    ]);
    return {
      ...raw,
      stats: eventStats({
        event,
        registrations: raw.registrations,
        prizes: raw.prizes,
        costs: raw.costs,
        priorContactKeys,
      }),
    };
  }

  async function dashboardLoadYear(year, force = false) {
    const selectedYear = Number(year);
    dashboardState.year = selectedYear;
    dashboardSetVisibleView('year');
    if (!force && dashboardState.yearCache.has(selectedYear)) {
      dashboardState.yearData = dashboardState.yearCache.get(selectedYear);
      dashboardRenderYear();
      return;
    }
    if (dashboardState.yearData && dashboardState.yearData.year !== selectedYear) {
      dashboardState.yearData = null;
    }
    if (dashboardState.loading) return;
    const requestId = ++dashboardState.requestId;
    dashboardState.loading = true;
    showLoading(true);
    if (!dashboardState.yearData || dashboardState.yearData.year !== selectedYear) {
      dashboardRenderEmpty('กำลังโหลดภาพรวมปี...');
    }

    try {
      const selectedEvents = eventsInYear(dashboardState.events, selectedYear);
      const eventData = await Promise.all(selectedEvents.map(dashboardFetchRawEventData));
      if (requestId !== dashboardState.requestId || dashboardState.year !== selectedYear) return;
      const registrationsByEvent = {};
      const prizesByEvent = {};
      const costsByEvent = {};
      eventData.forEach(item => {
        registrationsByEvent[item.event.id] = item.registrations;
        prizesByEvent[item.event.id] = item.prizes;
        costsByEvent[item.event.id] = item.costs;
      });
      const data = {
        year: selectedYear,
        events: selectedEvents,
        registrationsByEvent,
        prizesByEvent,
        costsByEvent,
        stats: yearStats({
          events: selectedEvents,
          registrationsByEvent,
          prizesByEvent,
          costsByEvent,
        }),
      };
      dashboardState.yearData = data;
      dashboardState.yearCache.set(selectedYear, data);
      dashboardState.connected = true;
      dashboardState.updatedAt = new Date();
      dashboardRenderYear();
    } catch (error) {
      if (requestId !== dashboardState.requestId) return;
      console.error('Dashboard year refresh failed:', error);
      dashboardState.connected = false;
      dashboardUpdateStatus();
      if (!dashboardState.yearData) dashboardRenderEmpty('ขาดการเชื่อมต่อ — ลองรีเฟรชอีกครั้ง');
      toast('โหลดภาพรวมปีไม่สำเร็จ', 'err');
    } finally {
      if (requestId !== dashboardState.requestId) return;
      dashboardState.loading = false;
      showLoading(false);
    }
  }

  async function dashboardRefresh(showBusy = false) {
    if (dashboardState.loading || !dashboardState.eventId) return;
    const event = dashboardState.events.find(candidate => candidate.id === dashboardState.eventId);
    if (!event) return;
    const requestId = ++dashboardState.requestId;
    dashboardState.loading = true;
    if (showBusy || !dashboardState.data) showLoading(true);

    try {
      const compareEvent = dashboardState.compareId
        ? dashboardState.events.find(candidate => candidate.id === dashboardState.compareId)
        : null;
      const [data, compareData] = await Promise.all([
        dashboardFetchEventData(event),
        compareEvent ? dashboardFetchEventData(compareEvent) : Promise.resolve(null),
      ]);
      if (requestId !== dashboardState.requestId || dashboardState.eventId !== event.id) return;
      dashboardState.data = data;
      dashboardState.compareData = compareData;
      dashboardState.connected = true;
      dashboardState.updatedAt = new Date();
      dashboardRender();
    } catch (error) {
      if (requestId !== dashboardState.requestId) return;
      console.error('Dashboard refresh failed:', error);
      dashboardState.connected = false;
      dashboardUpdateStatus();
      if (!dashboardState.data) dashboardRenderEmpty('ขาดการเชื่อมต่อ — ลองรีเฟรชอีกครั้ง');
      if (showBusy) toast('โหลด Dashboard ไม่สำเร็จ', 'err');
    } finally {
      if (requestId !== dashboardState.requestId) return;
      dashboardState.loading = false;
      if (showBusy || !dashboardState.data) showLoading(false);
    }
  }

  async function dashboardLoadEvents() {
    const { data, error } = await supabase.from('events')
      .select('id,name,slug,created_at,config')
      .order('created_at', { ascending: false });
    if (error) throw error;
    dashboardState.events = data || [];
    if (!dashboardState.events.length) {
      dashboardState.eventId = null;
      dashboardSetVisibleView('event');
      dashboardRenderEmpty('ยังไม่มี Event');
      return;
    }

    if (!dashboardState.eventId || !dashboardState.events.some(event => event.id === dashboardState.eventId)) {
      const recent = await supabase.from('registrations')
        .select('event_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      if (recent.error) throw recent.error;
      const recentId = recent.data && recent.data[0] && recent.data[0].event_id;
      dashboardState.eventId = dashboardState.events.some(event => event.id === recentId)
        ? recentId
        : dashboardState.events[0].id;
    }
    const years = dashboardYears();
    dashboardState.year = dashboardState.year && years.includes(dashboardState.year)
      ? dashboardState.year
      : years[0];
    if (dashboardIsMobile()) {
      dashboardSetVisibleView('event');
      await dashboardRefresh(true);
    } else {
      await dashboardLoadYear(dashboardState.year, false);
    }
  }

  function dashboardHandleChange(event) {
    if (event.target.id === 'dashboard-event-select') {
      dashboardOpenEvent(event.target.value);
    } else if (event.target.id === 'dashboard-year-select') {
      dashboardState.requestId += 1;
      dashboardState.loading = false;
      showLoading(false);
      dashboardState.yearData = dashboardState.yearCache.get(Number(event.target.value)) || null;
      dashboardLoadYear(Number(event.target.value), false);
    } else if (event.target.id === 'dashboard-compare-select') {
      dashboardState.requestId += 1;
      dashboardState.loading = false;
      showLoading(false);
      dashboardState.compareId = event.target.value;
      dashboardState.compareData = null;
      dashboardState.comparePicking = true;
      dashboardRefresh(true);
    }
  }

  function dashboardOpenEvent(eventId) {
    if (!dashboardState.events.some(event => event.id === eventId)) return;
    dashboardState.requestId += 1;
    dashboardState.loading = false;
    showLoading(false);
    dashboardState.eventId = eventId;
    dashboardState.data = null;
    dashboardState.day = null;
    dashboardState.moreOpen = false;
    dashboardState.compareId = null;
    dashboardState.compareData = null;
    dashboardState.comparePicking = false;
    dashboardSetVisibleView('event');
    dashboardRenderEmpty('กำลังโหลด Dashboard...');
    dashboardRefresh(true);
  }

  function dashboardExportWorkbook(sheets, baseName) {
    // Sheets are closed over from dashboardState data already fetched for the view.
    if (typeof XLSX === 'undefined') {
      toast('ยังไม่มี SheetJS โหลด', 'err');
      return;
    }
    const workbook = XLSX.utils.book_new();
    sheets.forEach(sheet => {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
    });
    XLSX.writeFile(workbook, dashboardReportWorkbook.reportFilename(baseName, new Date().toISOString()));
  }

  function dashboardExportEvent() {
    const data = dashboardState.data;
    if (!data || !data.event) return;
    const event = data.event;
    const stats = data.stats;
    const formFields = Array.isArray(event.config && event.config.formFields) ? event.config.formFields : [];
    const registrationRows = dashboardReportRows.buildExportRows(data.registrations, event.name, formFields);
    const compare = dashboardState.compareData ? dashboardReportStats.compareStats(stats, dashboardState.compareData.stats) : null;
    dashboardExportWorkbook(dashboardReportWorkbook.eventReportSheets(stats, registrationRows, compare), event.name);
  }

  function dashboardExportYear() {
    const data = dashboardState.yearData;
    if (!data) return;
    const rows = [];
    Object.entries(data.registrationsByEvent || {}).forEach(([eventId, registrations]) => {
      const event = dashboardState.events.find(candidate => String(candidate.id) === String(eventId));
      if (!event) return;
      const formFields = Array.isArray(event.config && event.config.formFields) ? event.config.formFields : [];
      rows.push(...dashboardReportRows.buildExportRows(registrations, event.name, formFields));
    });
    dashboardExportWorkbook(dashboardReportWorkbook.yearReportSheets({ ...data.stats, year: data.year }, rows), `ภาพรวมปี-${data.year}`);
  }

  function dashboardHandleClick(event) {
    const target = event.target.closest('[data-dash-action]');
    if (!target) return;
    const action = target.dataset.dashAction;
    if (action === 'export-event') {
      dashboardExportEvent();
    } else if (action === 'export-year') {
      dashboardExportYear();
    } else if (action === 'refresh') {
      dashboardRefresh(true);
    } else if (action === 'refresh-year') {
      dashboardState.requestId += 1;
      dashboardState.loading = false;
      showLoading(false);
      dashboardLoadYear(dashboardState.year, true);
    } else if (action === 'event') {
      dashboardOpenEvent(target.dataset.eventId);
    } else if (action === 'year') {
      dashboardState.requestId += 1;
      dashboardState.loading = false;
      showLoading(false);
      dashboardLoadYear(Number(target.dataset.year), false);
    } else if (action === 'compare-open') {
      dashboardState.comparePicking = true;
      dashboardRender();
    } else if (action === 'compare-cancel') {
      dashboardState.compareId = null;
      dashboardState.compareData = null;
      dashboardState.comparePicking = false;
      dashboardRender();
    } else if (action === 'day') {
      dashboardState.day = target.dataset.day;
      dashboardRender();
    } else if (action === 'more') {
      dashboardState.moreOpen = !dashboardState.moreOpen;
      dashboardRender();
    } else if (action === 'choice' && dashboardState.data) {
      const hidden = dashboardHiddenFields(dashboardState.eventId);
      const key = String(target.dataset.fieldKey || '');
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      dashboardSaveHiddenFields(dashboardState.eventId, hidden);
      dashboardRender();
    }
  }

  async function activate() {
    dashboardState.active = true;
    if (typeof document !== 'undefined') {
      document.getElementById('app-layout')?.classList.add('dashboard-active');
    }
    if (!dashboardState.events.length) {
      try {
        await dashboardLoadEvents();
      } catch (error) {
        console.error('Dashboard event list failed:', error);
        dashboardState.connected = false;
        dashboardRenderEmpty('ขาดการเชื่อมต่อ — ลองเปิด Dashboard ใหม่');
        showLoading(false);
      }
    } else {
      if (dashboardState.view === 'year') dashboardLoadYear(dashboardState.year, false);
      else dashboardRefresh(false);
    }
  }

  function deactivate() {
    dashboardState.active = false;
    if (typeof document !== 'undefined') {
      document.getElementById('app-layout')?.classList.remove('dashboard-active');
    }
  }

  function init() {
    if (dashboardState.initialized || typeof document === 'undefined') return;
    const roots = [dashboardYearRoot(), dashboardEventRoot()].filter(Boolean);
    if (!roots.length) return;
    dashboardState.initialized = true;
    roots.forEach(root => {
      root.addEventListener('change', dashboardHandleChange);
      root.addEventListener('click', dashboardHandleClick);
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (dashboardState.view === 'event' && dashboardIsMobile() && (dashboardState.compareData || dashboardState.comparePicking)) {
          dashboardState.compareId = null;
          dashboardState.compareData = null;
          dashboardState.comparePicking = false;
          dashboardRender();
        }
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (dashboardState.active && dashboardState.view === 'event' && document.visibilityState === 'visible') dashboardRefresh(false);
    });
    dashboardState.timer = setInterval(() => {
      if (dashboardState.active && dashboardState.view === 'event' && document.visibilityState === 'visible') dashboardRefresh(false);
    }, 30000);
    if (document.getElementById('panel-dashboard')?.classList.contains('active')) activate();
  }

  return { init, activate, deactivate, refresh: dashboardRefresh };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    kpiTile,
    barRow,
    hourlyChart,
    monthlyChart,
    pairedBarRow,
    compareKpiSub,
  };
}
