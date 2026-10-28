function costStatus(cost) {
  if (cost && cost.vendor_sponsored) return 'vendor';
  if (cost && cost.unit_cost !== null && cost.unit_cost !== undefined) return 'known';
  return 'unknown';
}

function unitCostOf(cost) {
  const status = costStatus(cost);
  if (status === 'vendor') return 0;
  if (status === 'known') return Number(cost.unit_cost);
  return null;
}

function parseCostInput(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;

  const parsed = Number(normalized.replaceAll(',', ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

function prizeCostRows(eventId, prizes) {
  return prizes.map(prize => {
    const vendorSponsored = Boolean(prize.vendorSponsored);
    return {
      prize_id: prize.id,
      event_id: eventId,
      unit_cost: vendorSponsored ? null : (prize.unitCost ?? null),
      vendor_sponsored: vendorSponsored,
    };
  });
}

function stripPrivatePrizeFields(prizes) {
  return prizes.map(prize => {
    const { unitCost, vendorSponsored, ...publicPrize } = prize;
    return publicPrize;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    costStatus,
    unitCostOf,
    parseCostInput,
    prizeCostRows,
    stripPrivatePrizeFields,
  };
}
