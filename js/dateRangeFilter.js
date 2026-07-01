function filterByDateRange(rows, startISO, endISO) {
  const start = startISO ? new Date(startISO).getTime() : -Infinity;
  const end   = endISO   ? new Date(endISO).getTime()   : Infinity;
  return rows.filter(r => {
    const t = new Date(r.created_at).getTime();
    return t >= start && t <= end;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { filterByDateRange };
}
