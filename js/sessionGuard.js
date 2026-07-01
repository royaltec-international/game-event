function hasValidSession(session) {
  return !!(session && session.user && session.user.id);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hasValidSession };
}
