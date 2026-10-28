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
  // ≤20% of the starting stock, at least 1 — small stocks (3, 5 pieces) only warn on the last piece
  return quantity > 0 && remaining <= Math.max(1, Math.floor(quantity * 0.2));
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
    // No priced prize at all → no figure, not a misleading ฿0
    perLead: leadCount > 0 && known > 0 ? total / leadCount : null,
    perContactable: known > 0 && contactableCount !== null && contactableCount > 0
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

  const brandNamesLongestFirst = [...rowByName.keys()].sort((a, b) => b.length - a.length);
  let otherCount = 0;
  let interested = 0;
  (registrations || []).forEach(registration => {
    // Brands are stored joined with ', ', but brand names may contain ', ' themselves
    // (e.g. "X ( A, B )"), so match configured names inside the string instead of splitting.
    let rest = `, ${String(registration.brands || '').trim()}, `;
    const knownForPerson = new Set();
    brandNamesLongestFirst.forEach(name => {
      const token = `, ${name}, `;
      if (!rest.includes(token)) return;
      knownForPerson.add(name);
      rest = rest.split(token).join(', ');
    });
    const hasOther = rest.split(', ').some(value => value.trim());
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

function dashboardFirstDate(event) {
  const preferred = event && (event.firstDate || event.firstRegistrationDate);
  if (preferred) return String(preferred);
  if (!event || !event.created_at) return '';
  const timestamp = new Date(event.created_at);
  return Number.isFinite(timestamp.getTime()) ? bangkokParts(event.created_at).date : '';
}

function eventsInYear(events, year) {
  const wantedYear = Number(year);
  return (events || []).filter(event => {
    const timestamp = new Date(event && event.created_at);
    return Number.isFinite(timestamp.getTime())
      && bangkokParts(event.created_at).year === wantedYear;
  }).sort((a, b) => {
    const dateCompare = dashboardFirstDate(b).localeCompare(dashboardFirstDate(a));
    return dateCompare || String(a.name || '').localeCompare(String(b.name || ''), 'th');
  });
}

function dashboardEventCollectionValue(collection, eventId) {
  if (collection instanceof Map) return collection.get(eventId) || [];
  return collection && collection[eventId] ? collection[eventId] : [];
}

function dashboardFirstRegistrationDate(registrations) {
  return (registrations || []).reduce((first, registration) => {
    const timestamp = new Date(registration && registration.created_at);
    if (!Number.isFinite(timestamp.getTime())) return first;
    const date = bangkokParts(registration.created_at).date;
    return !first || date < first ? date : first;
  }, '');
}

function dashboardUniqueContactCount(registrations) {
  const parents = [];
  const keyOwners = new Map();

  function find(index) {
    let root = index;
    while (parents[root] !== root) root = parents[root];
    while (parents[index] !== index) {
      const next = parents[index];
      parents[index] = root;
      index = next;
    }
    return root;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parents[rootB] = rootA;
  }

  (registrations || []).forEach(registration => {
    const keys = contactKeys(registration);
    if (!keys.length) return;
    const index = parents.length;
    parents.push(index);
    keys.forEach(key => {
      if (keyOwners.has(key)) union(index, keyOwners.get(key));
      else keyOwners.set(key, index);
    });
  });

  return new Set(parents.map((_, index) => find(index))).size;
}

function dashboardCostIsComplete(cost) {
  const coverage = cost && cost.coverage;
  return !coverage || dashboardNumber(coverage.known) === dashboardNumber(coverage.given);
}

function yearStats({ events, registrationsByEvent, prizesByEvent, costsByEvent }) {
  const allRegistrations = [];
  const brandCounts = new Map();
  const monthly = Array(12).fill(0);
  let leads = 0;
  let contactable = 0;
  let totalCost = 0;
  let complete = true;

  const table = (events || []).map(event => {
    const registrations = dashboardEventCollectionValue(registrationsByEvent, event.id);
    const prizes = dashboardEventCollectionValue(prizesByEvent, event.id);
    const costs = dashboardEventCollectionValue(costsByEvent, event.id);
    const stats = eventStats({
      event,
      registrations,
      prizes,
      costs,
      priorContactKeys: new Set(),
    });
    const costComplete = dashboardCostIsComplete(stats.cost);

    leads += stats.leads;
    if (stats.contactable !== null) contactable += stats.contactable;
    totalCost += stats.cost.total;
    complete = complete && costComplete;
    allRegistrations.push(...registrations);
    registrations.forEach(registration => {
      const timestamp = new Date(registration && registration.created_at);
      if (!Number.isFinite(timestamp.getTime())) return;
      monthly[bangkokParts(registration.created_at).month - 1] += 1;
    });
    if (stats.brands) {
      stats.brands.rows.forEach(row => {
        const name = String(row.name || '').trim();
        if (name) brandCounts.set(name, (brandCounts.get(name) || 0) + dashboardNumber(row.count));
      });
    }

    return {
      eventId: event.id,
      name: event.name,
      firstDate: dashboardFirstRegistrationDate(registrations),
      leads: stats.leads,
      contactable: stats.contactable,
      given: stats.given,
      perLead: stats.cost.perLead,
      costComplete,
    };
  }).sort((a, b) => {
    const dateA = a.firstDate || '0000-01-01';
    const dateB = b.firstDate || '0000-01-01';
    return dateB.localeCompare(dateA) || String(a.name || '').localeCompare(String(b.name || ''), 'th');
  });

  const brandsTop5 = [...brandCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'))
    .slice(0, 5);

  return {
    leads,
    uniqueContacts: dashboardUniqueContactCount(allRegistrations),
    contactable,
    eventCount: table.length,
    cost: {
      total: totalCost,
      perLead: leads > 0 && (totalCost > 0 || complete) ? totalCost / leads : null,
      complete,
    },
    table,
    brandsTop5,
    monthly,
  };
}

function dashboardTrimmedCounts(rows, labelKey, valueKey) {
  const counts = new Map();
  (rows || []).forEach(row => {
    const label = String(row && row[labelKey] || '').trim();
    if (!label) return;
    counts.set(label, (counts.get(label) || 0) + dashboardNumber(row[valueKey]));
  });
  return counts;
}

function dashboardChoiceCounts(choices) {
  const fields = new Map();
  (choices || []).forEach(choice => {
    const label = String(choice && choice.label || '').trim();
    if (!label) return;
    if (!fields.has(label)) fields.set(label, new Map());
    const options = fields.get(label);
    (choice.rows || []).forEach(row => {
      const option = String(row && row.option || '').trim();
      if (option) options.set(option, (options.get(option) || 0) + dashboardNumber(row.count));
    });
  });
  return fields;
}

function dashboardHourlyTotal(stats) {
  const total = stats && stats.hourly && stats.hourly.total;
  return Array.from({ length: 24 }, (_, hour) => dashboardNumber(Array.isArray(total) ? total[hour] : 0));
}

function compareStats(a, b) {
  const left = a || {};
  const right = b || {};
  const kpiValues = [
    ['leads', left.leads, right.leads],
    ['contactable', left.contactable, right.contactable],
    ['newCount', left.newCount, right.newCount],
    ['returningCount', left.returningCount, right.returningCount],
    ['given', left.given, right.given],
    ['soldOut', left.soldOut, right.soldOut],
    ['lowCount', left.lowCount, right.lowCount],
    ['perLead', left.cost && left.cost.perLead, right.cost && right.cost.perLead],
    ['perContactable', left.cost && left.cost.perContactable, right.cost && right.cost.perContactable],
  ];
  const kpis = kpiValues.map(([key, valueA, valueB]) => {
    const numericA = Number(valueA);
    const numericB = Number(valueB);
    return {
      key,
      a: valueA === undefined ? null : valueA,
      b: valueB === undefined ? null : valueB,
      deltaPct: valueA === null || valueA === undefined || valueB === null || valueB === undefined
        || !Number.isFinite(numericA) || !Number.isFinite(numericB) || numericB === 0
        ? null
        : ((numericA - numericB) / numericB) * 100,
    };
  });

  const brandsA = dashboardTrimmedCounts(left.brands && left.brands.rows, 'name', 'count');
  const brandsB = dashboardTrimmedCounts(right.brands && right.brands.rows, 'name', 'count');
  const brandNames = [...new Set([...brandsA.keys(), ...brandsB.keys()])];
  const brands = brandNames.map(name => ({
    name,
    a: brandsA.has(name) ? brandsA.get(name) : null,
    b: brandsB.has(name) ? brandsB.get(name) : null,
  })).sort((rowA, rowB) => (
    Math.max(dashboardNumber(rowB.a), dashboardNumber(rowB.b))
      - Math.max(dashboardNumber(rowA.a), dashboardNumber(rowA.b))
      || rowA.name.localeCompare(rowB.name, 'th')
  ));

  const prizesA = dashboardTrimmedCounts(left.prizes, 'label', 'used');
  const prizesB = dashboardTrimmedCounts(right.prizes, 'label', 'used');
  const prizesByLabel = [...prizesA.keys()]
    .filter(label => prizesB.has(label))
    .map(label => ({ label, a: prizesA.get(label), b: prizesB.get(label) }));

  const choicesA = dashboardChoiceCounts(left.choices);
  const choicesB = dashboardChoiceCounts(right.choices);
  const choices = [...choicesA.keys()].filter(label => choicesB.has(label)).map(label => {
    const optionsA = choicesA.get(label);
    const optionsB = choicesB.get(label);
    const optionNames = [...new Set([...optionsA.keys(), ...optionsB.keys()])];
    return {
      label,
      rows: optionNames.map(option => ({
        option,
        a: optionsA.get(option) || 0,
        b: optionsB.get(option) || 0,
      })),
    };
  });

  return {
    kpis,
    brands,
    prizesByLabel,
    choices,
    hourly: { a: dashboardHourlyTotal(left), b: dashboardHourlyTotal(right) },
    costComplete: {
      a: dashboardCostIsComplete(left.cost),
      b: dashboardCostIsComplete(right.cost),
    },
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
    eventsInYear,
    yearStats,
    compareStats,
  };
}
