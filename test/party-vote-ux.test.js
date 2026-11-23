import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { partyView } from '../public/party-views.js';
import { bluffView } from '../public/bluff-view.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));
const helpers = { host: false, canControl: false, escape, reply: '', icons: () => '' };
const ballot = [
  { id: 'a', text: 'A singing sofa', name: 'Player A', yours: true, votes: 0 },
  { id: 'b', text: 'Dancing teaspoons', name: 'Player B', yours: false, votes: 0 }
];
function social(voted=false) {
  return { mode: 'cards', phase: 'party-vote', index: 0, total: 3,
    playStyle: 'individual', teams: [], party: { tracks: [], prompt: 'An unusual thing',
      voted, ballot, shortlisted: 0, submissions: 1, responseTarget: 2 } };
}

test('social ballot makes only other entries votable and shows clear locked feedback', () => {
  const active = partyView(social(), helpers);
  assert.match(active, /role="list" aria-label="Choose an entry to vote for"/);
  assert.match(active, /class="bluff-card party-vote-card" role="listitem"/);
  assert.match(active, /class="button primary small party-vote-button"/);
  assert.match(active, /data-id="b"/);
  assert.doesNotMatch(active, /data-id="a"/);
  const locked = partyView(social(true), helpers);
  assert.doesNotMatch(locked, /data-action="bluff-vote"/);
  assert.match(locked, /class="party-vote-confirmation" role="status"/);
  assert.match(locked, /Vote locked in/);
});

test('bluff voting retains own-reply protection and a distinct confirmation', () => {
  const s = { phase: 'party-vote', index: 0, total: 3, player: { id: 'a' },
    party: { voted: false, prompt: 'Where would you go?', replies: [
      { id: 'a', name: 'Player A', text: 'Home' },
      { id: 'b', name: 'Player B', text: 'The moon' }
    ] } };
  const active = bluffView(s, helpers);
  assert.match(active, /class="bluff-card party-vote-card/);
  assert.match(active, /data-action="bluff-vote" data-id="b"/);
  assert.doesNotMatch(active, /data-action="bluff-vote" data-id="a"/);
  const locked = bluffView({ ...s, party: { ...s.party, voted: true } }, helpers);
  assert.doesNotMatch(locked, /data-action="bluff-vote"/);
  assert.match(locked, /party-vote-confirmation" role="status"/);
});

test('party vote stylesheet is loaded and respects small phones and reduced motion', async () => {
  const [markup, css] = await Promise.all([
    readFile(new URL('../public/index.html', import.meta.url),'utf8'),
    readFile(new URL('../public/party-vote-ux.css', import.meta.url),'utf8')
  ]);
  assert.match(markup, /href="\/party-vote-ux\.css"/);
  assert.match(css, /min-height: 52px/);
  assert.match(css, /orientation: landscape/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});