// Registration data in the shape draw_prize(p_registration jsonb) expects
function buildRegistrationPayload(userData) {
  return {
    first_name: userData.firstName || '',
    last_name: userData.lastName || '',
    email: userData.email || '',
    phone: userData.phone || '',
    company: userData.company || '',
    position: userData.position || '',
    brands: userData.brands || '',
    pdpa_consent: userData.pdpaConsent === 'true' ? 'YES' : userData.pdpaConsent === 'false' ? 'NO' : 'N/A',
    custom_fields: userData.customFields ? JSON.parse(userData.customFields) : null,
  };
}

// Segments to animate the spin on. The server may award a prize the wheel on
// screen didn't show (admin added it after load) — then rebuild from the full
// prize list so the slice exists. Returns null if the prize is unknown.
function segmentsForSpin(shownSegments, allPrizes, wonId) {
  if (shownSegments.some(s => s.id === wonId)) return shownSegments;
  if (!allPrizes.some(p => p.id === wonId)) return null;
  const shownIds = new Set(shownSegments.map(s => s.id));
  return allPrizes.filter(p => shownIds.has(p.id) || p.id === wonId);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildRegistrationPayload, segmentsForSpin };
}
