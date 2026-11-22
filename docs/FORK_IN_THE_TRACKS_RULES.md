# How to play: Fork in the Tracks — Jambaloop original edition

**Current implementation:** draft feature PR #9; base contains prior unmerged Board Race / Teams PR #8. This is **not yet deployed** to the family Render site.

## Goal

Two teams each try to convince one **neutral judge** that their own track should be spared from the runaway trolley. Rather than the entire room voting, the person operating the laptop or TV is the judge for the whole match.

The trolley always hits one track. The team whose track is **not** hit wins **one point** for that round.

## Setup

- **Two teams**, automatically and evenly allocated as family members join using QR codes or room codes. Two players minimum (one per team), plus the person operating the host/TV screen as judge.
- Team members see their private card options on their phones. The host judge sees the tracks, voting progress and the eventual decision buttons.
- Choose **3 (Quick), 5 (Standard), or 7 (Long)** rounds.
- No separate apps, accounts, AI usage or paid services required to play.

## Three placements, in order

| Phase | What Team A does | What Team B does | Where the card appears |
|---|---|---|---|
| **1 — Defend** | Vote on a *good* card | Vote on a *good* card | Each team's **own** track, slot 1 |
| **2 — Sabotage** | Vote on a *bad* card | Vote on a *bad* card | **Opponent's** track, slot 2 |
| **3 — Reinforce** | Vote on a second *good* card | Vote on a second *good* card | Each team's **own** track, slot 3 |

Each team sees a four-card hand every placement. Each team member privately picks one, and the team's most popular card is played. Ties use the first submitted vote. The host can end a stalled placement to keep the match moving if someone disconnects. The two teams make each choice **simultaneously**, rather than waiting through six separate turn screens.

## The sentence compatibility rule

All original cards are complete **noun phrases**, with their own necessary article or plural quantifier. They contain no trailing periods, stray opening conjunctions, relative clauses that need a different subject, or instructions such as “and then”. The screen inserts them into a fixed sentence:

> If the trolley takes Track A, it will hit **a rescue centre full of sleepy puppies**, **a printer that jams one page before finishing**, and **a friendly dragon running a village bakery**.

Replacing any of those three cards with another card of the correct type retains the sentence structure. The result is also funny because each team has to defend a track containing a deliberately unwanted item placed there by its rival.

The server stores three placements for each track and generates the same story on both TV and phones. Card banks contain dozens of original family-friendly cards and are refreshed as needed across longer games. They do **not** reproduce a commercial party-game card deck.

## The judge's choice

After both tracks have three cards, the TV/host gets two large buttons: **HIT TRACK A** and **HIT TRACK B**. Team members can see the complete tracks but cannot vote at this stage. The host picks which track the trolley hits—ideally the funniest, most ridiculous or best-argued choice.

The opposite track is spared, earning its team one point. This result is shown publicly. After 3, 5 or 7 rounds, the team with the most points is the winner; tied scores produce a draw. The host can start a rematch.

## Security, accessibility and testing

- Server validates the chosen game, round index, placement step, card index, team membership and judge identity.
- The host's judge token is **not** a player-team token. A player cannot submit the final verdict. The host cannot judge early while tracks are still being built.
- Each phone sees only **its own team's** four candidates, not the opponent's unrevealed choices.
- Intro is written out with a transcript; the existing narrator reads the updated trolley rules using browser speech until a recorded British announcer clip is available.
- Board, choices and judge actions are designed for one-screen 720p/1080p TV viewing, with internal mobile scrolling where necessary. Reduced-motion settings remain supported.
- CI exercises three placements, both destination tracks, judge permissions, 3/5/7 settings, grammatical content and longer matches.

**Future options (not in PR #9):** a nominated judge on a phone instead of the host, timed debates between the teams, custom themed card packs, a one-use card swap token and a double-point final junction.
