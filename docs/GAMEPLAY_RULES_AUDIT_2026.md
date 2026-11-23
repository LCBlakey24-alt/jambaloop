# Jambaloop family games — game-by-game rules and longevity audit
**Prepared:** 22 November 2026  
**Scope:** All 12 actual mode IDs in `public/game-config.js`, the current server/game engines, and the unmerged feature branch comprising PR #8 (solo/teams and Board Race branch) plus PR #9 (new Fork in the Tracks). These are code-based observations, not claims that every future suggestion is built or deployed.

## Shared goals and constraints

- TV/laptop must remain in one viewport at 1280×720, 1366×768 and 1920×1080; landscape tablet at 1024×768. Phone controls must remain legible and selectable; use internal panels where necessary, not page scrolling on TV.
- Default to short **family-friendly** games, but offer deliberate **Quick / Standard / Long** presets where compatible. When extending games, add new meaningful decisions instead of merely doubling identical questions.
- Keep Individual or balanced 2–4 Teams in the nine scored games on PR #8; **Fork in the Tracks is always exactly two teams with the TV host as neutral judge.** Bluff and Hot Potato remain individual until their win conditions are rewritten.
- Server remains authoritative for scoring, turns, votes, role assignments and permissions. Never send private answer keys, missing-prompt cards, or undisclosed hands to other clients. Keep prompts/card phrases original rather than copying published party-game decks.
- Keep Free Render hosting: no new paid databases, video services, continuous AI API calls or expensive background tasks. One server process loses its room state if the Free instance sleeps or restarts.
- The currently deployed website is not automatically updated by this design branch.

## Priority A: game-specific findings and proposals

| Game | Verified current core mechanics | Gap that shortens / weakens the game | Proposed next improvement |
|---|---|---|---|
| **Fork in the Tracks** (`tracks`) | **PR #9:** Two balanced teams, three successive positive/negative/positive card placements, majority card selection by team members, and one human TV-host judge choosing a track to hit; other team receives one point. 3/5/7 rounds, original sentence-compatible cards. | Old version had two preset scenarios and a room-wide vote with no judge or track building. Still needs a live family playtest of whether the choice feels clear and whether 7 rounds is enough. | **Implement/test PR #9 first.** Later: thematic packs, judge rotating onto a connected phone (if the family wants it), debate timer, jokers and a final double-point verdict. |
| **Classic Quiz** (`classic`) | Mixed formats (choice/true-false/estimation/order), 5/10/15 questions, optional timed speed points, double-point schedules and configurable score checkpoints. | 15 questions is the maximum typical curated match; nothing gives a full-length family quiz an act break or a final strategic gamble. | Presets **10 / 20 / 30** question rounds, themed rounds of five, one endgame wager, and faster score reveal; check question-bank availability by category/format before exposing 30. |
| **Spin the Wheel** (`wheel`) | Host spins a wheel that selects category; category sectors used until all have cycled; then normal question scoring. | Without a deliberate final, it can feel like Classic Quiz with a random topic. | Add limited-use reroll tokens, a “double or nothing” sector, a halfway standings reset/milestone and a final spin. Offer 10/20 questions when banks support it. |
| **Board Race** (`board`) | 3D die tower and animated pieces, answer after each roll, cap of 12–60 turns, 16/24/32/40-space boards. **PR #8:** separate turquoise Question Trail (+4 spaces) and golden Power Lane (×2 on active team's special correct answers). Individual up to four pieces or 2–4 teams. | 3D board already makes rounds long; repeated ordinary questions may dilute the strategic fork. Need actual balance data on how often each fork wins. | Keep split board, then add branch-choice explanation, two more event tile types, camera/turn clarity, planned "long game" preset, and balance logs with no personal data. |
| **Dice Rally** (`dice`) | Two dice establish everyone’s answer multiplier: 2–6 ×1, 7–10 ×2, 11–12 ×3; timed answer points as applicable. | Rolling has little player agency once dice land. | One **reroll token per player/team**, a bonus streak for consecutive correct answers, a visible target score, and a final one-off multiplier roll. Test fairness with 4 teams. |
| **Knockout** (`knockout`) | Starts at three lives. Wrong/missed answers remove a life; in Teams mode, a team survives while any teammate has lives. | With a small family and short questions, eliminations can happen too soon; eliminated people can spend the remainder watching. | Start lives **3 / 5 / 7**, a limited once-per-game rescue question, spectator prediction during pauses, and best-of-three short matches. |
| **Team Showdown** (`showdown`) | 2–4 groups, average team scores. Optional private per-player questions so phones need not reveal prompts on the TV. | Can resemble normal team quiz with few dramatic moments. | Give each round a **team captain choice** (riskier question, multiplier or category), 3 match sets, and a final shared tiebreaker; protect private question content. |
| **Quiz Race** (`quizrace`) | Server-authoritative continuous movement; 70/120/190-unit lengths (~1–3 minutes nominal), 12-second private questions, correct answers give speed boost, mistakes/pass/timeout slow racers; separate racers, and PR #8 adds team winner standings. | A short dash may end before family members settle in, and little changes between track themes beyond background colours. | Offer **5–7 minute Grand Prix**, 2–3 lap sections, visible intermediate checkpoints, safer overtaking cues and team aggregate race option; maintain authoritative movement and no shortcut exploits. |
| **Punchline Party** (`punchline`) | Everyone writes up to 100 characters; six submissions randomly shortlisted; peers vote; 100 points per vote. Currently social games are fixed at **3 rounds**. | Random six-person shortlist can exclude a funny entry; three rounds may feel too brief. | **3 / 5 / 7 rounds**, distinct prompt packs, voting fairness for 7+ people (balanced candidate batches), a final “best punchline” award and optional follow-up prompt. |
| **Fill the Blank** (`cards`) | Each person receives six phrase cards, selects one to complete an unfinished sentence, then peers vote; currently **3 rounds**. | Short deck and short match encourage repeated similar combinations. | **3 / 5 / 7 rounds**, additional original cards, optional one-card discard/draw per round, more prompt variety and a special final card round. |
| **Spot the Bluff** (`bluff`) | One randomly selected player receives no prompt; others see the private question; everyone writes a short reply and votes who lacks the prompt; **one match** currently. | One round gives players almost no chance to experience both roles. The game does not yet have a long-match tally. | Best of **3 / 5 / 7 rotating secret bluffers**, transparent scoring (correct suspect + successful deception), countdown for discussion, and clear role privacy. |
| **Hot Potato** (`potato`) | One shared **120-second timer**; only current holder has the answer prompt, a correct answer passes the potato randomly, misses/skips leave them holding it. Ends with whoever holds it at expiry. | Only one two-minute loss is recorded; low replay value without a multi-round total. | Play 3 or 5 potatoes, accumulate **penalty points for being caught**, select 60/120/180 seconds per potato, and show a final “least-caught” winner. Ensure transfers and pauses survive reconnects. |

## Shared code improvements

**Setup & duration:** Centralise a `modeDurationPresets` map per game. Current `public/game-config.js` offers 5/10/15 questions for ordinary modes, fixed 3 rounds for `socialModes`, a single 120-second potato, and a one-round Bluff. PR #9 introduces the first configurable social game at 3/5/7 trolley rounds. Next: Punchline/Fill the Blank, then Bluff/Hot Potato.

**Winner clarity:** Define for each game what determines a win (individual score, team average score, first finisher, lives left, votes, judge's saved track or least penalties). Avoid treating a party vote as a score game by simply attaching team colours. A dedicated judge game must prevent both anonymous votes and unauthorized judging.

**Lobby & phone roles:** Always identify **your team, your role, whose turn it is, the next action and the current phase**. Add status text for all locked submissions, who is waiting, vote count and why a button is disabled. The non-judge teams must not be able to trigger the final verdict.

**Replay and bank quality:** Track used prompts/cards per room to avoid immediate repeats. Quiz Race difficulty settings currently rely on available curated category packs and fall back to standard questions when some graded items are missing; do not label these as guaranteed difficulty grades until coverage is measured. Test all original phrase cards for grammar and family-safe wording.

**Interaction and animation:** Restrict long suspense animations to optional intros, make them skippable and honour reduced motion. Screens and important controls should never require page-level vertical scrolling on TV; phone game panels can scroll internally if necessary. Keep the existing QR cloud HTTPS origin rather than local Wi-Fi-only addresses.

**Networking and reliability:** Pending multiplayer-hardening PR #2 overlaps server/app code. Merge carefully after integrated tests; keep the family Render service on manual deployment. In-memory games are lost after sleeping and restarting; warn before a long quiz, and consider optional server persistence only if needed, within a verified free allowance.

## Implementation order (one game at a time)

1. **Fork in the Tracks:** Finish judge route, 3-card grammar, 3/5/7 rounds and family test (PR #9).
2. **Punchline Party** and then **Fill the Blank:** 5/7 rounds and richer prompt/card pools; strongest low-risk longevity improvement.
3. **Spot the Bluff:** Repeated rounds with scoring/rotation; substantive original win-rule upgrade.
4. **Hot Potato:** Best-of-3/5, accumulated results and adjustable clock.
5. **Classic Quiz:** Multiple themed rounds and a final score gamble.
6. **Spin the Wheel**, **Dice Rally** and **Knockout:** distinct risk/resource systems after longer matches exist.
7. **Team Showdown:** Captain strategy and multi-set final.
8. **Board Race:** Test branch balance, then event tiles.
9. **Quiz Race:** Grand Prix/checkpoints and richer track themes.

Each change is a focused PR with backend unit/integration tests and browser checks at laptop/TV + portrait phones. Deploy explicitly between family sessions, not automatically during a match.

**No changes beyond PR #9 are implemented by this audit document.** It is the source-backed roadmap for game-by-game work.
