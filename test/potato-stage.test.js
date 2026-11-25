import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { potatoCircleView, potatoSpot, seatPositions } from '../public/potato-stage.js';

const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const avatar = seat => `<span class="player-avatar">${escape(seat.name[0])}</span>`;

test('seats ring the TV clockwise from the top and never overlap', () => {
  for (const count of [2, 6, 12, 20]) {
    const seats = seatPositions(count);
    assert.equal(seats.length, count);
    assert.ok(Math.abs(seats[0].x - 50) < 1e-9 && seats[0].y < 15, 'first seat at the top');
    for (const seat of seats) assert.ok(seat.x >= 5 && seat.x <= 95 && seat.y >= 9 && seat.y <= 91);
    // Neighbouring seat centres stay apart on a 16:9 ring.
    for (let i = 0; i < count; i++) {
      const a = seats[i], b = seats[(i + 1) % count];
      assert.ok(Math.hypot((a.x - b.x) * 16 / 9, a.y - b.y) > 12, `${count} seats spaced`);
    }
    // The potato rests between its holder and the middle.
    for (const seat of seats) {
      const spot = potatoSpot(seat);
      assert.ok(Math.hypot(spot.x - 50, spot.y - 50) < Math.hypot(seat.x - 50, seat.y - 50));
    }
  }
});

test('the circle seats everyone, marks the holder and shows no question', () => {
  const seats = [{ id: 'a', name: 'Ada' }, { id: 'b', name: '<Bo>', connected: false }, { id: 'c', name: 'Cy' }];
  const html = potatoCircleView({ holder: seats[2], seats, passes: 1, question: { prompt: 'SECRET' } }, escape, avatar);
  assert.equal(html.match(/class="potato-seat[ "]/g).length, 3);
  assert.match(html, /potato-seat is-holder[^>]*>[\s\S]*?Cy/);
  assert.match(html, /is-away/);
  assert.match(html, /data-potato-holder="c"/);
  assert.match(html, /&#60;Bo&#62;/, 'names are escaped');
  assert.doesNotMatch(html, /SECRET/, 'only the holder\'s phone sees the question');
  assert.match(html, /1 successful pass</);
});

test('the server sends stable seats; the jump and tick respect reduced motion and opt-in sound', () => {
  const party = readFileSync(new URL('../party-games.js', import.meta.url), 'utf8');
  assert.match(party, /seats: \[\.\.\.players\.entries\(\)\]\.map/);
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /animatePotato\(host\?app:null, s\.code\+'\/'\+s\.game, matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\)/);
  assert.match(app, /if \(session\?\.host && soundEnabled && !state\.pausedAt && remaining > 0\)/);
  const css = readFileSync(new URL('../public/potato-stage.css', import.meta.url), 'utf8');
  const motion = css.slice(css.indexOf('prefers-reduced-motion:no-preference'));
  assert.match(motion, /potato-beat/);
  assert.doesNotMatch(css.slice(0, css.indexOf('prefers-reduced-motion:no-preference')), /animation:/);
});
