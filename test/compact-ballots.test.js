// Voting on a phone with eight players used to take nearly two screens: every entry was a tall card with
// its own full-width "Vote for entry 3" button. Each entry is now one row with a short Vote button.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { partyView } from '../public/party-views.js';
import { bluffView } from '../public/bluff-view.js';

const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const helpers = { host: false, canControl: false, escape, reply: '', icons: () => '' };

test('vote buttons say "Vote" and keep the full label for screen readers', () => {
  const party = partyView({ mode: 'punchline', phase: 'party-vote', index: 0, total: 3, playStyle: 'individual', teams: [],
    party: { tracks: [], prompt: 'Clouds', voted: false, shortlisted: 0, submissions: 0, responseTarget: 3,
      ballot: [{ id: 'a', text: 'Mine', yours: true, votes: 0 }, { id: 'b', text: 'Soup', yours: false, votes: 0 }] } }, helpers);
  assert.match(party, /data-action="bluff-vote" data-id="b" aria-label="Vote for entry 2">Vote<\/button>/);
  const bluff = bluffView({ phase: 'party-vote', index: 0, total: 3, player: { id: 'a' },
    party: { voted: false, prompt: 'Space', replies: [{ id: 'a', name: 'Ada', text: 'Mine' }, { id: 'b', name: 'Bo', text: 'Stars' }] } }, helpers);
  assert.match(bluff, /data-action="bluff-vote" data-id="b" aria-label="Vote for Bo">Vote<\/button>/);
});

test('on a phone each ballot entry is one row, and the "scroll to see" note only shows for a long list', () => {
  const css = readFileSync(new URL('../public/phone-simple.css', import.meta.url), 'utf8');
  assert.match(css, /\[data-phase="party-vote"\] :is\(\.party-vote-list, \.bluff-show-cards\) \.party-vote-card \{\n\s+display: grid; grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.party-vote-card > :is\(\.party-vote-button, small:not\(:first-child\)\) \{\n\s+grid-column: 2; grid-row: 1 \/ span 2;/);
  assert.match(css, /\.mobile-deck \.game\.player-only \.party-ballot-note \{ display: none; \}/);
  assert.match(css, /:has\(\.party-vote-list > :nth-child\(10\)\) \.party-ballot-note \{ display: block; \}/);
});
