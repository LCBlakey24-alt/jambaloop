import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clockExpired, setClockPaused } from '../room-clock.js';
import { parseRoomCode } from '../public/room-session.js';

test('pause time never consumes the room clock', () => {
  const room = { opened: 1000, ends: 16000, clockVersion: 0 };
  setClockPaused(room, true, 4000);
  assert.equal(clockExpired(room, 58000), false);
  setClockPaused(room, false, 60000);
  assert.equal(room.opened, 57000);
  assert.equal(room.ends, 72000);
  assert.equal(room.clockVersion, 2);
  assert.equal(clockExpired(room, 71999), false);
  assert.equal(clockExpired(room, 72000), true);
});

test('a pasted invite resolves to a six-digit room code', () => {
  assert.equal(parseRoomCode(' 123-456 '), '123456');
  assert.equal(parseRoomCode('123 456'), '123456');
  assert.equal(parseRoomCode('https://quiz.example/?join=123456'), '123456');
  for (const invalid of ['hello 123456', 'https://quiz.example/123456', 'https://quiz.example/?join=1234567', undefined]) {
    assert.equal(parseRoomCode(invalid), '');
  }
});
