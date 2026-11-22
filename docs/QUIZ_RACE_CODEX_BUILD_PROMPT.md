# Codex build prompt — Jambaloop Quiz Race

**Repository:** \`LCBlakey24-alt/jambaloop\`

You are continuing development of an existing browser-based, phone-controlled multiplayer party-games platform. Add **Quiz Race**, a continuous, question-driven race, as a self-contained new game mode. Do not replace or destabilise existing modes.

## First: read the project and current state

1. Read \`docs/QUIZ_RACE_GAME_DESIGN.md\` **in full**. That is the source of truth for the proposed mechanics, timing, curved-track scene, coloured trails, category/difficulty system, edge cases and tests.
2. Read \`docs/JAMBALOOP_CODE_AUDIT_AND_DESIGN.md\`, \`docs/CODEX_BRIEF.md\`, \`docs/HOME_REDESIGN_V1.md\` (if present), \`public/game-config.js\`, \`public/game-views.js\`, \`public/app.js\`, \`public/game-night.js\`, \`questions.js\`, \`server.js\`, \`public/mode-style.js\`, \`public/board-route.js\` and tests.
3. Examine GitHub PR **#2** (multiplayer security/reconnect) and PR **#3** (homepage redesign). They were open/draft when the spec was authored. **Re-check live status** before beginning; plan safe coordination. Do not create conflicting changes or overwrite either PR.
4. Run baseline Node 22 install, syntax checks and tests. Document missing coverage. Understand the existing six-digit room/QR, phone captain, NDJSON streams, question privacy, game playlists and rematches.

## Player-facing product requirements

- Host chooses General Knowledge, Mixed Topics or one existing themed question category; difficulty Easy, Medium, Hard or Mixed; track length Short/Medium/Long; independent visual track skin Neon/Desert/Snow/Jungle/Space.
- Use existing difficulty bank IDs (\`family\`, \`standard\`, \`challenge\`) through an explicit mapping, rather than breaking existing games.
- Initial target 2–8 simultaneous racers; use a three-second countdown. Question format MVP: multiple choice on each phone with a 12-second limit, feedback, and a **Pass question** button.
- Everyone moves continuously. Correct answers increase speed proportional to response time; wrong answers slow more, a Pass slows less than wrong, timeouts slow most. Overtaking requires no action and is determined by actual position.
- First to the finish line wins, from authoritative server crossing times. Give other racers an optional short finishing window, then reveal results and use existing rematch/playlist controls.
- Phone controller: private question, 4 large choices, Pass, timer, progress/position/speed. Host/TV: readable winding race track, racer icons, **two trails** per racer (thin complete progress line and brighter fading recent trail) following curved lanes, leaderboard, finish line.
- Track theme is **cosmetic**, with no lane advantage, speed bonus or altered finish distance.
- Honour reduced-motion and sound preferences and don't require WebGL to play.

## Physics and fairness (provisional baseline; do not silently alter)

- Base speed 1.0 distance units/s; clamp to 0.4–2.0.
- Correct answer boost amplitude \`A=0.25+0.50*(1-clamp(responseSeconds/12,0,1))\`, fading linearly to zero across 4s.
- Wrong: -0.45 for 3s. Pass: -0.30 for 2s. Timeout: -0.60 for 3s.
- On every accepted answer, replace the old effect; no stacking. Speed is \`clamp(1 + A*max(0,1-u/D),0.4,2.0)\`.
- Server integrates distance by elapsed monotonic time, computes earliest crossing time and decides winner. Clients may **only interpolate visuals**.
- Race lengths provisionally 70/120/190 units; verify actual duration with simulation/playtesting.
- All player question timers, question identifiers, effect timings and answer correctness are server authoritative. Client times are untrusted. Assess a small bounded round-trip compensation for responsiveness fairly; document choices.
- Use comparable, valid, non-repeating question sequences from existing banks. Handle pool exhaustion explicitly and prevent client answer leaks, duplicate answers and unlimited Pass spam.
- On pause, freeze both race movement and remaining question time; reconnects restore authoritative state. Late arrivals spectate this race.

## Implementation design

Preferred separation:
- Pure physics/state in \`quiz-race.js\` with injected clock, no browser dependencies.
- Arc-length path geometry and animated tracks in \`public/quiz-race-track.js\`.
- Phone and TV markup in \`public/quiz-race-view.js\` and scoped \`public/quiz-race.css\`.
- Pure unit tests in \`test/quiz-race.test.js\`, plus integration and browser tests.

Integrate \`quiz-race\` into \`public/game-config.js\`, the host setup and lobby flows in \`public/app.js\`, server \`/api/rooms\` life cycle and \`/live\` stream, room state serialization, game playlists, rematch and appearance tokens. Do not make a 12th mode by copying Board Race or by adding hard-to-maintain if/else blocks everywhere. Preserve multiplayer security changes from PR #2.

Prefer a lightweight **SVG path/Canvas 2D** S-curve track with precomputed arc-length lookup and stable lane offsets. Show the racers' positions based on true track distance, not raw parametric curve \`t\`. Progress lines and trails should wrap along the bends. Use 5–10Hz server snapshots and requestAnimationFrame for **display-only** interpolation; do not create extra per-player streams. Render sensibly on desktop/TV, landscape tablets and phones, with 2D/low-motion fallback.

## Work in stages with separate reviewable PRs

1. **PR A:** Physics / config / question fairness and deterministic unit tests. No graphics or large homepage rewrite.
2. **PR B:** Server game lifecycle, authoritative snapshots, answer validation, timers/pause/reconnect, finish order and integration tests.
3. **PR C:** TV winding track, coloured curved progress/trails, visible overtaking, result screen and mobile/host UI, with browser regressions.
4. **PR D:** Five track skins, transitions/audio, accessibility and performance refinements.

For each PR: describe changed files, screenshots/video if visual, tests run, actual result, risks, what remains and any deviations from the design. Never force-push \`main\`; avoid overwriting PRs #2/#3. A reproducible, tested, understandable build is more important than adding visual complexity.

## Acceptance requirements

- 2–8 racers can play simultaneously through an existing lobby; all start together and continue moving.
- Faster correct answer yields stronger boost than slower correct answer. Wrong, Pass, timeout produce distinct penalties, all temporary.
- Everyone stays within speed bounds, no backwards racing or cumulative boosts; no one can farm Pass instantly.
- Server, not client timing/animation, determines the first to cross, with correct close finishes and overtakes on curves.
- TV displays a distinctly winding track and a **coloured curved progress line + fading trail** for each racer; animation remains smooth without WebGL.
- Phones use existing accessible controls; category, difficulty and track skin work as configured.
- Reconnect, pause, rematch, captain, playlists, malformed inputs, stale/double submissions and spectators work.
- Reduced motion, keyboard interaction, screen reader labels, phone widths and 16:9 TV presentation are tested.
- Existing game modes remain usable and all existing CI tests still pass.

**Start now with a brief implementation plan and PR A.** Do not claim Quiz Race is finished until all planned stages pass. Do not publish or deploy without separate authorisation.