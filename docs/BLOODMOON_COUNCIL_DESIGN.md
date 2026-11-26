# Bloodmoon Council — original vampire social deduction game

**Status (26 November 2026):** implemented as `bloodmoon` on the draft branch `feature/bloodmoon` at the owner's request. NOT merged, NOT deployed, NOT playtested with a real group. See "What was built" at the end; where it differs from the proposal below, the code is the record.  
**Working title:** Bloodmoon Council (commercial name clearance not yet completed).  
**Tracking:** [GitHub #43](https://github.com/LCBlakey24-alt/jambaloop/issues/43).

## One-sentence hook

A peaceful village is hiding secret vampires. By night the vampires choose a victim while the Oracle searches for clues and the Warden protects a villager; by day everyone debates and votes to banish someone before the vampires take over.

## How it differs from the existing games

- **Spot the Bluff:** one secret player has no prompt, then everyone answers and guesses in repeated *independent* rounds.
- **Secret Suspects** ([#42](https://github.com/LCBlakey24-alt/jambaloop/issues/42)): everyone submits genuine personal stories and guesses their owners; individuals score for accurate guesses or keeping their story hidden.
- **Bloodmoon Council:** an *ongoing*, asymmetric, hidden-team game with night actions, persistent player identities, elimination, discussion, deduction and a shared team victory. Its premise is vampire fiction, not an unchanged Spot the Bluff skin.
- **Signal Jam** ([#30](https://github.com/LCBlakey24-alt/jambaloop/issues/30)): compare proposed social-deduction mechanics before implementing; avoid a duplicate game tile. Vampire Night/Quick Council may become formats of this same game, not separate tiles.

## MVP roles and balance (provisional)

| Role | Suggested number | Knowledge and action |
| --- | --- | --- |
| Vampire | 1 with 5–7 players; 2 with 8–12 players | Knows fellow vampires. At night each living vampire nominates a living non-vampire to bite. |
| Oracle | 1 | At night selects a living person; privately learns whether that person is a vampire. |
| Warden | 1 | At night protects a living person from the vampire attack. |
| Villager | Remaining players | No night action. Discusses, deduces and votes in daytime. |

**Recommended starting audience:** 6–12; minimum 5 only after balance testing. The role split above is a proposal, not a validated competitive balance. Minors/families get non-graphic storytelling and artwork. No real-world harm, dares or coercive role-play.

## Core phases

1. **Setup:** A neutral TV host creates a room. Phones join and tap Ready. Server securely allocates roles when a game starts. Each phone shows **only its own** secret role; the TV and host never receive allocations.
2. **Night:** TV shows a generic moonlit village/night countdown; no role indicators. Eligible phones get their private action: vampires nominate, Oracle inspects, Warden protects. Each role locks its action; non-acting players see a neutral waiting message. Server resolves after all eligible players act or the timer expires. A tied vampire target vote defaults to *no bite* for the MVP; make the policy visible in written rules.
3. **Dawn:** TV announces who was removed, or that everyone survived. Reveal only information consistent with the selected game setup. The Oracle's result remains private.
4. **Day:** A different player can volunteer as the *reader* (or TV narration can read the announcement), but the reader has no privileged data. Survivors discuss for a configurable 60/90/120 seconds or untimed; then independently choose a living suspect or abstain. Votes lock; the public reveal shows the count. For a top-vote tie, nobody is banished (MVP rule), preventing arbitrary elimination. Do not disclose votes early.
5. **Resolution:** Reveal the banished player's allegiance if the lobby selected public role reveals. Check victory conditions. Otherwise start another night. Excluded players spectate without voting/role spoilers; consider a better spectator activity in a later tested iteration.
6. **Game end:** Villagers win when no vampires remain. Vampires win when living vampires equal or outnumber living non-vampires. TV announces the winning *side*, discloses roles only at the actual ending and offers Play Again with a fresh allocation.

The server owns deadlines and phase changes. Specify vote/tie/absence outcomes and one-time resolution before coding. No host/captain shortcut should leak hidden roles or trigger an extra night result.

## TV and phone screen contracts

| Phase | TV/neutral host | Ordinary villager phone | Special-role phone |
| --- | --- | --- | --- |
| Role deal | Players ready; generic next step | Own role, then wait | Own role and only any permitted teammate info |
| Night | Moon, countdown, completion totals without role breakdown | Neutral waiting state | Authorized private role action and locked feedback |
| Day discussion | Living roster and discussion timer | Living roster, discuss | Same public discussion view |
| Day voting | Total anonymous votes, no personal allocations | Private candidate ballot, abstain | Same ballot (only if alive) |
| Reveal | Public vote tally and appropriate eliminated role | Readable outcome | Same public outcome, no other private intel |
| End | Victory side and optional final identities | Outcome/spectator status | Outcome and role recap |

Private information never appears in untrusted HTML, room host state, spectator state, logs, QR invite, preview, sound generation service, SSE stream, analytics or browser-side hidden DOM. Avoid telling the host that a night action was submitted by a particular secret role.

## Accessibility and game quality

- Fully text-readable role information and colour-independent icons; legible with the default Jambaloop deep navy brand and a muted crimson/mauve accent.
- Mobile-first role card and tap targets; preserve progress under network reconnect, no repeat/vote duplication, no hidden 200px controls.
- No moderator required to know roles. TV narrator describes what happens; British narration should use generic phase scripts only, never dynamically send secrets to ElevenLabs.
- Optional written How to Play intro with short 3-step premise, expandable full rules and a skippable practice/demo. Real disclosure of roles only on joining an actual room.
- Quick mode (shorter phases) and Standard mode can use the **same game tile**; durations are provisional, don't promise exact playtime before measured playtests.
- Fairness for early-eliminated players must be evaluated; consider spectators getting non-scoring predictions or a short first game, but ensure they cannot reveal hidden information.

## Required tests before any release

- Deterministic 5/6/8/12-player role count and full simulation, including Oracle/Warden interaction.
- Strict actions by role/phase/life state; one action per player per night; duplicate/late submission rejection; timeouts and disconnect handling; day vote ties and abstentions.
- Night and day victory tests, protection edge cases, eliminated player permissions, returning players, and room exit/close.
- Adversarial tests that host, wrong player, spectator and late entrant can never obtain private role mappings or night actions; verify all REST/NDJSON serializers.
- Phone 390×844, 844×390 and 320px; TV 1280×720 and 1920×1080; keyboard, focus, reduced motion and screen reader labels.
- Full true multiplayer integration test with 6–10 devices/participants, including partial actions, one player disconnecting mid-night, and all remaining players restarting the app.
- Do not claim persistence after a Render restart; address [#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41) before promising that.

## Build phases for Claude Code

1. **Rules design only:** finalise machine-readable phase diagram, role privacy matrix, full win/tie tests and original assets/narration copy. Review design before adding a tile.
2. **Game engine:** add an isolated module, API and safe state serializer; keep existing game IDs unchanged; write the negative/security tests first.
3. **Interfaces:** role/target/vote/locked/reveal phone screens, TV-only neutral phase stage, setup and written tutorial, playlist/rematch integration.
4. **Verification:** all existing Node/content/browser CI, private-state adversarial tests and real mixed-device playtest; then a reviewed merge to `main` if safe to publish.

**Do not put this planned game in `public/game-config.js` until it is functional, tested, and deliberately selected for implementation.** No third-party game title, scripts, deck, branded art or show identity should be copied.

## What was built (26 November 2026)

- **Name and ID:** "Bloodmoon", mode ID `bloodmoon`. 5 to 16 players; later joiners watch.
- **Roles:** 1 vampire for 5 to 7 players, 2 for 8 to 12, 3 for 13 to 16; one Oracle, one Warden, the rest Villagers. Provisional balance.
- **Phases:** role deal (45s or everyone ready) → night (45s or everyone has chosen) → dawn → day discussion (150s, host or captain can open the vote early) → vote (45s or all in) → verdict → next night or the end.
- **Night:** every living player taps a choice so no phone stands out. Villagers record a private hunch that has no effect. Vampires must agree on one target (they see each other's pick and may change it); a split bites nobody. The Warden cannot guard the same player two nights running and may guard themselves.
- **Reveals:** a player's role is public once they are bitten or banished, and all roles at the end. The dawn message does not say whether the Warden blocked a bite.
- **Vote:** counts only, no voter names. A tie or no votes banishes nobody.
- **Scoring:** 300 points to each member of the winning side, plus 100 if still in at the end.
- **Privacy:** roles, night picks, Oracle findings and ballots are sent only to their owner (`publicBloodmoon`). The TV host state has no role data until a role is public. Night screens share one heading and a closed, neutral role card so a glance at a neighbour's phone gives nothing away.
- **Narration:** fixed pre-recorded Max and Poppy lines for public beats only; no player names, roles or runtime generation.
- **Tests:** `test/bloodmoon.test.js` (rules, privacy, HTTP) and `scripts/bloodmoon-browser.mjs` (six players, TV and two phones).
- **Not done:** real-group playtest, 320px and landscape phone review, a spectator activity for players who are out, public-role-reveal setting, quick mode.
