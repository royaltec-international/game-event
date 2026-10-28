const dashboardFieldAnswers = typeof require === 'function'
  ? require('./fieldAnswers.js')
  : globalThis;
const dashboardPrizeCost = typeof require === 'function'
  ? require('./prizeCost.js')
  : globalThis;
const DASHBOARD_BASE_FIELD_KEYS = new Set([
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'position',
]);

function dashboardNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dashboardPct(count, base) {
  return base > 0 ? (count / base) * 100 : 0;
}

function dashboardOtherMarker() {
  return typeof OTHER !== 'undefined' ? OTHER : dashboardFieldAnswers.OTHER;
}

function bangkokParts(iso) {
  const bangkok = new Date(new Date(iso).getTime() + (7 * 60 * 60 * 1000));
  const year = bangkok.getUTCFullYear();
  const month = bangkok.getUTCMonth() + 1;
  const day = bangkok.getUTCDate();

  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    hour: bangkok.getUTCHours(),
    month,
    year,
  };
}

function contactKeys(registration) {
  const row = registration || {};
  const phone = String(row.phone || '').replace(/\D/g, '');
  const email = String(row.email || '').trim().toLowerCase();
  const keys = [];

  if (phone.length >= 9) keys.push(`p:${phone}`);
  if (email.includes('@')) keys.push(`e:${email}`);
  return keys;
}

function isLowStock(prize) {
  const quantity = dashboardNumber(prize && prize.quantity);
  const remaining = dashboardNumber(prize && prize.remaining);
  return quantity > 0 && (remaining <= quantity * 0.1 || remaining <= 5);
}

function dashboardCostFor(costsById, prizeId) {
  if (costsById instanceof Map) return costsById.get(prizeId);
  return costsById ? costsById[prizeId] : undefined;
}

function prizeRows(prizes, costsById) {
  return (prizes || []).map(prize => {
    const costConfig = dashboardCostFor(costsById, prize.id);
    const status = dashboardPrizeCost.costStatus(costConfig);
    const unitCost = dashboardPrizeCost.unitCostOf(costConfig);
    const quantity = dashboardNumber(prize.quantity);
    const used = dashboardNumber(prize.used);
    // `remaining` is a generated column; fall back when a query didn't select it
    const remaining = prize.remaining === undefined || prize.remaining === null
      ? Math.max(0, quantity - used)
      : dashboardNumber(prize.remaining);

    return {
      id: prize.id,
      label: prize.label,
      quantity,
      used,
      remaining,
      low: isLowStock({ quantity, remaining }),
      costStatus: status,
      unitCost,
      cost: unitCost === null ? null : used * unitCost,
    };
  }).sort((a, b) => a.remaining - b.remaining || String(a.label).localeCompare(String(b.label), 'th'));
}

function costSummary(rows, leads, contactable) {
  let total = 0;
  let known = 0;
  let given = 0;
  const missing = [];

  (rows || []).forEach(row => {
    const used = dashboardNumber(row.used);
    if (used <= 0) return;

    // Coverage counts prize lines ("ครบ 4/5 รายการ"), not units
    given += 1;
    if (row.costStatus === 'unknown') {
      missing.push(row.label);
      return;
    }

    known += 1;
    total += dashboardNumber(row.cost);
  });

  const leadCount = dashboardNumber(leads);
  const contactableCount = contactable === null ? null : dashboardNumber(contactable);
  return {
    total,
    perLead: leadCount > 0 ? total / leadCount : null,
    perContactable: contactableCount !== null && contactableCount > 0
      ? total / contactableCount
      : null,
    coverage: { known, given },
    missing,
  };
}

function brandSummary(registrations, brandItems) {
  const rows = [];
  const rowByName = new Map();

  (brandItems || []).forEach(item => {
    const name = String(item).trim();
    if (!name || rowByName.has(name)) return;
    const row = { name, count: 0, pct: 0 };
    rowByName.set(name, row);
    rows.push(row);
  });

  let otherCount = 0;
  let interested = 0;
  (registrations || []).forEach(registration => {
    const selected = String(registration.brands || '')
      .split(', ')
      .map(value => value.trim())
      .filter(Boolean);
    const knownForPerson = new Set();
    let hasOther = false;

    selected.forEach(name => {
      if (rowByName.has(name)) knownForPerson.add(name);
      else hasOther = true;
    });
    knownForPerson.forEach(name => {
      rowByName.get(name).count += 1;
    });
    if (hasOther) otherCount += 1;
    if (knownForPerson.size > 0 || hasOther) interested += 1;
  });

  if (otherCount > 0) {
    rows.push({ name: dashboardOtherMarker(), count: otherCount, pct: 0 });
  }

  const base = (registrations || []).length;
  rows.forEach(row => {
    row.pct = dashboardPct(row.count, base);
  });
  rows.sort((a, b) => b.count - a.count);

  const selections = rows.reduce((sum, row) => sum + row.count, 0);
  return {
    rows,
    anyPct: dashboardPct(interested, base),
    avgPerPerson: base > 0 ? selections / base : 0,
    base,
  };
}

function choiceSummary(registrations, field) {
  const options = [];
  const counts = new Map();

  (field.options || []).forEach(option => {
    const value = String(option);
    if (!value || value === dashboardOtherMarker() || counts.has(value)) return;
    options.push(value);
    counts.set(value, 0);
  });

  let answered = 0;
  let otherCount = 0;
  (registrations || []).forEach(registration => {
    const answer = dashboardFieldAnswers.resolveAnswer(registration.custom_fields, field);
    const values = (Array.isArray(answer) ? answer : [answer])
      .filter(value => value !== undefined && value !== null && String(value) !== '')
      .map(value => String(value));
    const uniqueValues = new Set(values);
    if (uniqueValues.size === 0) return;

    answered += 1;
    let hasOther = false;
    uniqueValues.forEach(value => {
      if (counts.has(value)) counts.set(value, counts.get(value) + 1);
      else hasOther = true;
    });
    if (hasOther) otherCount += 1;
  });

  const rows = options.map(option => ({
    option,
    count: counts.get(option),
    pct: dashboardPct(counts.get(option), answered),
  }));
  if (field.allowOther || otherCount > 0) {
    rows.push({
      option: dashboardOtherMarker(),
      count: otherCount,
      pct: dashboardPct(otherCount, answered),
    });
  }
  rows.sort((a, b) => b.count - a.count);

  return {
    type: field.type,
    rows,
    answered,
    unanswered: (registrations || []).length - answered,
    multi: field.type === 'checkbox',
  };
}

function hourly(registrations) {
  const byDay = {};
  const total = Array(24).fill(0);

  (registrations || []).forEach(registration => {
    const timestamp = new Date(registration.created_at);
    if (!Number.isFinite(timestamp.getTime())) return;

    const parts = bangkokParts(registration.created_at);
    if (!byDay[parts.date]) byDay[parts.date] = Array(24).fill(0);
    byDay[parts.date][parts.hour] += 1;
    total[parts.hour] += 1;
  });

  const days = Object.keys(byDay).sort();
  const peakCount = Math.max(...total);
  return {
    days,
    byDay,
    total,
    peak: peakCount > 0 ? { hour: total.indexOf(peakCount), count: peakCount } : null,
  };
}

function dashboardFieldEnabled(formFields, key) {
  const field = formFields.find(candidate => candidate.key === key);
  return !field || field.enabled !== false;
}

function eventStats({ event, registrations, prizes, costs, priorContactKeys }) {
  const config = (event && event.config) || {};
  const registrationRows = registrations || [];
  const formFields = Array.isArray(config.formFields) ? config.formFields : [];
  const costsById = new Map();

  if (Array.isArray(costs)) {
    costs.forEach(cost => costsById.set(cost.prize_id, cost));
  } else if (costs && typeof costs === 'object') {
    Object.entries(costs).forEach(([prizeId, cost]) => costsById.set(prizeId, cost));
  }

  const rows = prizeRows(prizes || [], costsById);
  const leads = registrationRows.length;
  const pdpaOff = registrationRows.length > 0
    ? registrationRows.every(row => row.pdpa_consent === 'N/A')
    : config.pdpa?.enabled === false;
  const contactable = pdpaOff
    ? null
    : registrationRows.filter(row => row.pdpa_consent === 'YES' || row.pdpa_consent === 'true').length;

  const canIdentifyContacts = dashboardFieldEnabled(formFields, 'phone')
    || dashboardFieldEnabled(formFields, 'email');
  let newCount = null;
  let returningCount = null;
  if (canIdentifyContacts) {
    const previousKeys = priorContactKeys instanceof Set ? priorContactKeys : new Set();
    returningCount = registrationRows.filter(registration => (
      contactKeys(registration).some(key => previousKeys.has(key))
    )).length;
    newCount = leads - returningCount;
  }

  const brands = config.brandsCheckbox?.enabled
    ? brandSummary(registrationRows, config.brandsCheckbox.items || [])
    : null;
  const choices = formFields
    .filter(field => (
      field.enabled !== false
      && !field.isBase
      && !DASHBOARD_BASE_FIELD_KEYS.has(field.key)
      && dashboardFieldAnswers.isChoiceType(field.type)
    ))
    .map(field => ({
      key: field.key,
      label: field.label,
      ...choiceSummary(registrationRows, field),
    }));

  return {
    leads,
    contactable,
    pdpaOff,
    newCount,
    returningCount,
    given: rows.reduce((sum, row) => sum + row.used, 0),
    soldOut: registrationRows.filter(row => row.prize_id === '').length,
    lowCount: rows.filter(row => row.low).length,
    prizes: rows,
    cost: costSummary(rows, leads, contactable),
    brands,
    choices,
    hourly: hourly(registrationRows),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    bangkokParts,
    contactKeys,
    isLowStock,
    prizeRows,
    costSummary,
    brandSummary,
    choiceSummary,
    hourly,
    eventStats,
  };
}
