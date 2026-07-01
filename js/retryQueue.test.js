const test = require('node:test');
const assert = require('node:assert/strict');
const { queueFailedRegistration, readRetryQueue, clearRetryQueue, RETRY_QUEUE_KEY } = require('./retryQueue.js');

function makeFakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

test('reading an empty queue returns []', () => {
  const storage = makeFakeStorage();
  assert.deepEqual(readRetryQueue(storage), []);
});

test('queueing a payload makes it show up in readRetryQueue', () => {
  const storage = makeFakeStorage();
  queueFailedRegistration(storage, { firstName: 'Test' });
  assert.deepEqual(readRetryQueue(storage), [{ firstName: 'Test' }]);
});

test('queueing appends, does not overwrite', () => {
  const storage = makeFakeStorage();
  queueFailedRegistration(storage, { firstName: 'A' });
  queueFailedRegistration(storage, { firstName: 'B' });
  assert.deepEqual(readRetryQueue(storage), [{ firstName: 'A' }, { firstName: 'B' }]);
});

test('clearRetryQueue empties the queue', () => {
  const storage = makeFakeStorage();
  queueFailedRegistration(storage, { firstName: 'A' });
  clearRetryQueue(storage);
  assert.deepEqual(readRetryQueue(storage), []);
});

test('RETRY_QUEUE_KEY is a stable, non-empty string', () => {
  assert.equal(typeof RETRY_QUEUE_KEY, 'string');
  assert.ok(RETRY_QUEUE_KEY.length > 0);
});
