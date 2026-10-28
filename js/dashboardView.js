function dashboardViewEsc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

var DashboardView = (function dashboardViewModule() {
  const dashboardState = {
    active: false,
    initialized: false,
    loading: false,
    requestId: 0,
    events: [],
    eventId: null,
    data: null,
    day: null,
    moreOpen: false,
    connected: true,
    updatedAt: null,
    timer: null,
  };

  function dashboardRoot() {
    return typeof document === 'undefined' ? null : document.getElementById('dashboard-event-view');
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
    const current = document.getElementById('dashboard-status');
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

  function dashboardRenderBrands(stats) {
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

  function dashboardRenderChoices(stats, eventId) {
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

  function dashboardRenderHourly(stats) {
    const days = stats.hourly.days;
    if (dashboardState.day !== 'total' && !days.includes(dashboardState.day)) {
      dashboardState.day = days[0] || 'total';
    }
    const counts = dashboardState.day === 'total'
      ? stats.hourly.total
      : (stats.hourly.byDay[dashboardState.day] || stats.hourly.total);
    const tabs = days.map((day, index) => (
      `<button type="button" class="dash-day-tab${dashboardState.day === day ? ' active' : ''}" data-dash-action="day" data-day="${day}">วันที่ ${index + 1} (${dashboardViewEsc(dashboardFormatDay(day))})</button>`
    )).join('');
    return `<section class="dash-hourly"><h3>ลงทะเบียนรายชั่วโมง</h3><div class="dash-card"><div class="dash-day-tabs">${tabs}<button type="button" class="dash-day-tab${dashboardState.day === 'total' ? ' active' : ''}" data-dash-action="day" data-day="total">รวมทุกวัน</button></div>${hourlyChart(counts, null)}</div></section>`;
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
    const root = dashboardRoot();
    if (!root || !dashboardState.data) return;
    const data = dashboardState.data;
    const event = data.event;
    const stats = data.stats;
    const year = dashboardEventYear(event);
    const hiddenLow = stats.prizes.filter(prize => prize.low);
    const alert = hiddenLow.length
      ? `<div class="dash-low-alert">${hiddenLow.map(prize => `⚠ ${dashboardViewEsc(prize.label)} เหลือ ${dashboardFormatInteger(prize.remaining)} ชิ้น`).join(' · ')}</div>`
      : '';
    const eventOptions = dashboardState.events.map(item => (
      `<option value="${dashboardViewEsc(item.id)}"${item.id === dashboardState.eventId ? ' selected' : ''}>${dashboardViewEsc(item.name)}</option>`
    )).join('');
    const contactable = stats.pdpaOff ? 'ไม่ได้เปิด PDPA' : dashboardFormatInteger(stats.contactable);
    const newReturning = stats.newCount === null
      ? 'นับไม่ได้'
      : `${dashboardFormatInteger(stats.newCount)} / ${dashboardFormatInteger(stats.returningCount)}`;
    const newReturningSub = stats.newCount === null ? 'ไม่มีเบอร์/อีเมล' : 'คนใหม่ / เคยมางานเราแล้ว';
    const contactableCost = stats.pdpaOff ? 'ไม่ได้เปิด PDPA' : dashboardFormatMoney(stats.cost.perContactable);
    const kpis = [
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
      <div class="dash-crumb">ภาพรวมปี ${dashboardViewEsc(year)} <span>›</span> ${dashboardViewEsc(event.name)}</div>
      <div class="dash-toolbar">
        <label><span class="sr-only">เลือก Event</span><select id="dashboard-event-select">${eventOptions}</select></label>
        <div class="dash-live">${dashboardStatusHtml()}<button type="button" class="btn btn-outline btn-sm" data-dash-action="refresh">↻ รีเฟรช</button></div>
      </div>
      ${alert}
      <div class="dash-kpis">${kpis}</div>
      <div class="dash-primary-grid">
        <section><h3>ของแจก — เหลือน้อยก่อน</h3>${dashboardRenderPrizes(stats)}</section>
        ${dashboardRenderHourly(stats)}
      </div>
      <button type="button" class="btn btn-outline dash-more-toggle" data-dash-action="more" aria-expanded="${dashboardState.moreOpen}">${dashboardState.moreOpen ? 'ซ่อนรายละเอียด' : 'ดูเพิ่ม'}</button>
      <div class="dash-more${extraClass}">
        <div class="dash-detail-grid">
          <div>${dashboardRenderBrands(stats)}${dashboardRenderCost(stats)}</div>
          <div>${dashboardRenderChoices(stats, event.id)}</div>
        </div>
        <div class="dash-export-row"><button type="button" class="btn btn-primary" disabled title="เพิ่มใน Task รายงาน">Export รายงานงานนี้ (.xlsx)</button></div>
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

  async function dashboardFetchEventData(event) {
    const registrationsPromise = fetchAllRegistrations(event.id);
    const prizesPromise = supabase.from('prizes')
      .select('id, label, quantity, used, remaining')
      .eq('event_id', event.id);
    const costsPromise = supabase.from('prize_costs')
      .select('prize_id, unit_cost, vendor_sponsored')
      .eq('event_id', event.id);
    const priorPromise = dashboardFetchPriorContactKeys(event);
    const [registrations, prizesResult, costsResult, priorContactKeys] = await Promise.all([
      registrationsPromise,
      prizesPromise,
      costsPromise,
      priorPromise,
    ]);
    if (registrations === null) throw new Error('Dashboard registrations request failed');
    if (prizesResult.error) throw prizesResult.error;
    if (costsResult.error) throw costsResult.error;

    return {
      event,
      registrations,
      prizes: prizesResult.data || [],
      costs: costsResult.data || [],
      stats: eventStats({
        event,
        registrations,
        prizes: prizesResult.data || [],
        costs: costsResult.data || [],
        priorContactKeys,
      }),
    };
  }

  async function dashboardRefresh(showBusy = false) {
    if (dashboardState.loading || !dashboardState.eventId) return;
    const event = dashboardState.events.find(candidate => candidate.id === dashboardState.eventId);
    if (!event) return;
    const requestId = ++dashboardState.requestId;
    dashboardState.loading = true;
    if (showBusy || !dashboardState.data) showLoading(true);

    try {
      const data = await dashboardFetchEventData(event);
      if (requestId !== dashboardState.requestId || dashboardState.eventId !== event.id) return;
      dashboardState.data = data;
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
    await dashboardRefresh(true);
  }

  function dashboardHandleChange(event) {
    if (event.target.id !== 'dashboard-event-select') return;
    dashboardState.requestId += 1;
    dashboardState.loading = false;
    dashboardState.eventId = event.target.value;
    dashboardState.data = null;
    dashboardState.day = null;
    dashboardState.moreOpen = false;
    dashboardRenderEmpty('กำลังโหลด Dashboard...');
    dashboardRefresh(true);
  }

  function dashboardHandleClick(event) {
    const target = event.target.closest('[data-dash-action]');
    if (!target) return;
    const action = target.dataset.dashAction;
    if (action === 'refresh') {
      dashboardRefresh(true);
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
      dashboardRefresh(false);
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
    const root = dashboardRoot();
    if (!root) return;
    dashboardState.initialized = true;
    root.addEventListener('change', dashboardHandleChange);
    root.addEventListener('click', dashboardHandleClick);
    document.addEventListener('visibilitychange', () => {
      if (dashboardState.active && document.visibilityState === 'visible') dashboardRefresh(false);
    });
    dashboardState.timer = setInterval(() => {
      if (dashboardState.active && document.visibilityState === 'visible') dashboardRefresh(false);
    }, 30000);
    if (document.getElementById('panel-dashboard')?.classList.contains('active')) activate();
  }

  return { init, activate, deactivate, refresh: dashboardRefresh };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { kpiTile, barRow, hourlyChart };
}
