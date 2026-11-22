# Jambaloop TV Show Bible — Stage and Interaction Specification
Updated 22 November 2026 — applied initially in draft PR #17.

## Overall television design
The TV is a *broadcast stage*, never a second phone controller. Phone buttons are large, responsive and touch-first; TV shows question, puzzle, performance, player progression, winner and join/room code. New broadcast styling lives in `public/tv-broadcast.css` and preserves the existing Jambaloop infinity branding. The shared `game-top` includes a clear show title, mode-specific stage colour, current phase, optional connected-player count and host controls. Hide decorative elements that compete with the current task on 720p TVs. Use animated colour only for state transitions and never rely on it to convey the result.

## State anatomy
1. **Lobby:** recognisable game identity; one sentence of rules; easy QR join; ready avatars and exact player count; visible Start condition.
2. **Introduction:** short, optional voice intro; mode title and how play works; host may skip.
3. **Playing:** one main content focal point, second-level leaderboard or progress, one current action.
4. **Waiting:** show submitted/total count, remaining time or reason for delay; never leak anyone's secret answer.
5. **Reveal:** animate actual correct answers or social outcomes, points gained, team change or contestant eliminated.
6. **Results:** leading player/team, scoreboard, short awards; next game and rematch controls.
7. **Next game:** retain roster and room code; switch colour palette without loading a new page or restarting the multiplayer connection.

## Game identities — palette plus TV treatment
| Mode | Accent | TV focal content | Reveal and feedback |
|---|---|---|---|
| Classic Quiz | Periwinkle | 16:9 question stage, large 4-choice board | Correct answer lit and a compact score rank |
| Spin the Wheel | Violet | Oversized category dial with readable marker | Category land, question, correct answer |
| Board Race | Gold/forest | 3D board and clearly readable pawns/route fork | Active pawn movement and score changes |
| Dice Rally | Amber | Copper dice and multiplier panel | Die result, multiplier and earned points |
| Knockout | Coral | Question stage plus live hearts | Life lost / elimination / remaining players |
| Punchline Party | Peach | Large punchline cards, no tiny text | Revealed audience vote counts |
| Fill the Blank | Rose | Prompt followed by playful card submissions | Winner, favourite answer and points |
| Fork in the Tracks | Lime green | Two complete track sentences, balanced layout | Driver lever, track hit and saved team |
| Spot the Bluff | Mint | Suspenseful anonymous response cards | Bluff identity and voting breakdown |
| Hot Potato | Yellow-orange | Giant shared countdown, current holder | Potato handoff and timer expiry |
| Quiz Race | Neon teal | Clear race track, racer trail and rank board | Finish order, distance and time |
| Team Showdown | Ice blue | Team score strips, question focus | Round points and winning team |
| Same Page | Mint/lilac | Shared prompt; then matched answer clusters | Group sizes, names and 100 points per matched partner |
| Spotlight Wheel | Gold/violet | Wheel, rotating contestant and expert, large 4-choice board | Contestant and independent expert points, correct answer |

## New original formats — next to implement or extend
**Brain Ladder:** progressive logic puzzles; benchmark difficulty via playtesting, never invent population percentages. Stage: tall vertical ladder with increasing difficulty and player-survival count. Phones: private answer and life status.

**Rare Find:** players try to give an obscure *valid* answer to a topic. Do not present fabricated poll percentages or label arbitrary scores as real survey findings. Source a genuinely permissioned survey dataset or explicitly score uniqueness among current room answers. Stage: dramatic falling score columns and an evidence/status ribbon. Phones: typed answer, then review/dispute where required.

**Top Answers:** popularity game driven by a real surveyed audience or a clearly labelled live-room poll; no invented outside poll totals. Stage: six-slot reveal board, score tallies and strikes. Phones: team answer and possible steal. Question packs need survey/sample metadata, consent/source, date, valid alternative wording.

**Spotlight Wheel:** implemented in draft PR #18. A host-controlled original wheel selects a topic and expert, with independent contestant and expert scoring and one contestant round per player. No TV programme assets are reused. Optional future extension: audience prediction without answer leakage.

## Technical acceptance for every game
- Test full 720p and 1080p 16:9 TV, 1024×768 landscape tablet, 390×844 phone and 320px narrow phone.
- TV must not have document horizontal or vertical overflow in typical intro, play, reveal and result phases.
- Show absolute current status clearly: waiting for X, ready, timer, answer locked, result, next.
- A 0.3–0.5s optional entrance is acceptable; no timed overlay may delay server game-state changes.
- `prefers-reduced-motion: reduce` disables decorative animations. Focus indicators, high contrast, text equivalents and accessible labels remain.
- Do not put private answer data on the TV before reveal. The server must authorise every submission or verdict.
- Provide tests for low players, high players, disconnect, refresh, stale requests and race conditions.
- Original names, prompts, rules and stage design only; no unlicensed television show trademarks, theme music, footage or logos.

## Current scope
PR #17 adds Same Page and shared broadcast visual styling for the first thirteen modes. Draft PR #18 adds the fourteenth game, Spotlight Wheel, with a complete server/client implementation and automated role/privacy/TV tests. Brain Ladder, Rare Find and Top Answers are specified but not yet implemented. Workflow screenshot artefacts are retained on GitHub Actions. Both PRs remain stacked and unmerged; the family live site is unchanged.
