const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidPhone, phoneErrorMessage, phoneFormatOf } = require('./phoneFormat.js');

test('mobile format accepts 06/08/09 + 8 digits only', () => {
  assert.equal(isValidPhone('0812345678', 'mobile'), true);
  assert.equal(isValidPhone('091-234-5678', 'mobile'), true);
  assert.equal(isValidPhone('06 1234 5678', 'mobile'), true);
  assert.equal(isValidPhone('021234567', 'mobile'), false);
  assert.equal(isValidPhone('0212345678', 'mobile'), false);
  assert.equal(isValidPhone('081234567', 'mobile'), false);
});

test('any format accepts 0 + 9-10 digits (landline or mobile)', () => {
  assert.equal(isValidPhone('02-123-4567', 'any'), true);
  assert.equal(isValidPhone('0812345678', 'any'), true);
  assert.equal(isValidPhone('1234567890', 'any'), false);
  assert.equal(isValidPhone('02123456', 'any'), false);
});

test('missing or unknown format defaults to mobile', () => {
  assert.equal(phoneFormatOf({}), 'mobile');
  assert.equal(phoneFormatOf({ phoneFormat: 'weird' }), 'mobile');
  assert.equal(phoneFormatOf({ phoneFormat: 'any' }), 'any');
  assert.equal(isValidPhone('021234567'), false);
});

test('error message names the expected format', () => {
  assert.match(phoneErrorMessage('mobile'), /มือถือ/);
  assert.match(phoneErrorMessage('any'), /9-10 หลัก/);
});
