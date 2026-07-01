const RETRY_QUEUE_KEY = 'pendingRegistrations';

function queueFailedRegistration(storage, payload) {
  const list = readRetryQueue(storage);
  list.push(payload);
  storage.setItem(RETRY_QUEUE_KEY, JSON.stringify(list));
}

function readRetryQueue(storage) {
  const raw = storage.getItem(RETRY_QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function clearRetryQueue(storage) {
  storage.removeItem(RETRY_QUEUE_KEY);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { queueFailedRegistration, readRetryQueue, clearRetryQueue, RETRY_QUEUE_KEY };
}
