// Label of the "follow us" button on the result page. Admin-editable
// (config.followButtonText); falls back to the original label when empty.
const DEFAULT_FOLLOW_BUTTON_LABEL = 'ติดตามเราบน Facebook';

function followButtonLabel(text) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  return trimmed || DEFAULT_FOLLOW_BUTTON_LABEL;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { followButtonLabel, DEFAULT_FOLLOW_BUTTON_LABEL };
}
