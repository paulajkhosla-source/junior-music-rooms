import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { GENERIC_ERROR, userMessage } from './action-result';
import { singleFlight } from './single-flight';

test('a double tap on Release selected sends one request until the first settles', async () => {
  const run = singleFlight(); let calls = 0; let finish!: () => void;
  const task = () => { calls++; return new Promise<void>(resolve => { finish = resolve; }); };
  assert.equal(run(task), true);
  assert.equal(run(task), false);
  assert.equal(calls, 1);
  finish(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(run(task), true);
  assert.equal(calls, 2);
});

test('a failed request frees the guard for a retry', async () => {
  const run = singleFlight();
  run(() => Promise.reject(new Error('network')));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(run(() => Promise.resolve()), true);
});

test('booking messages reach the teacher; internal errors do not', () => {
  const raised = Object.assign(new Error('A selected slot is no longer yours'), { code: 'P0001' });
  assert.equal(userMessage(raised), 'A selected slot is no longer yours');
  assert.equal(userMessage(new Error('Invalid range')), 'Invalid range');
  assert.equal(userMessage(Object.assign(new Error('password authentication failed'), { code: '28P01' })), GENERIC_ERROR);
  assert.equal(userMessage(new TypeError('x is undefined')), GENERIC_ERROR);
  assert.equal(userMessage('nope'), GENERIC_ERROR);
});
