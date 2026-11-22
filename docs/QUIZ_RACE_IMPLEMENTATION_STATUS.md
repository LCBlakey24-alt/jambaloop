# Quiz Race — implementation status (feature branch)

This branch implements a playable first version of **Quiz Race**, the twelfth Jambaloop mode. It is intentionally separate from draft PR #2 (multiplayer security/reconnect) and draft PR #3 (homepage redesign). It is **not merged, deployed, or certified for public launch**.

## Features implemented

- Host setup: General Knowledge/Mixed Bag or any existing themed category, Easy/Medium/Hard/Mixed race difficulty, Short/Medium/Long distance, and five track appearances (Neon, Desert, Snow, Jungle, Space). Two to eight racers.
- Integration with existing room codes, host/captain roles, joining and ready controls, existing quiz question banks, playlists and rematches.
- Three-second countdown, private multiple-choice questions on phones, 12-second per-question timer, and **Pass question** control.
- Authoritative continuous movement at base speed. Correct answers temporarily boost speed according to answer latency; wrong, Pass and timeout temporarily slow the racer. Effects replace, rather than stack; all movement stays forward.
- Server-chosen finish winner and standings from interpolated crossing times. A ten-second grace window lets nearby finishers complete after the winning racer crosses.
- TV display: winding SVG course, up to eight labelled racers, stable lanes, individual coloured curved progress lines and short glowing trails, scoreboard and finish marker.
- Phone controller: private question, four large choices, time remaining, current position, speed state, race progress and readable feedback.
- Server broadcasts bounded snapshots through the existing room stream, while the TV interpolates visually. No additional WebGL dependency.
- Pause/resume, spectator/waiting state for late arrivals, responsive phone view, reduced-motion treatment, and new unit and integration tests.

## Known limitations and follow-up before merge

1. **Testing:** the dependency-installed GitHub Actions test suite passed **29 of 29 tests**, including the new API integration test, on commit `438317b7a88b45380e89f508154cbd3b275b0fa3` (run [45042100202](https://github.com/LCBlakey24-alt/jambaloop/actions/runs/45042100202)). Browser and real-phone gameplay has **not yet been verified** in this environment; browser automation navigation was blocked by environment policy.
2. **Integration with draft PRs:** PR #2 changes security and reconnect logic in both `server.js` and `public/app.js`. Rebase or merge those changes carefully; don't let this feature overwrite their fixes. PR #3 updates `public/app.js` and the homepage, so verify new card styling once combined.
3. **Question difficulty:** the source bank contains relatively few category-specific curated Easy/Hard questions. The MVP supplements the relevant curated set with standard questions **from the selected category** to avoid empty races. Expand/taxonomise the banks before claiming uniformly difficulty-graded questions in every category.
4. **Appearance:** themes currently provide different background colour/scenery treatments over a shared SVG track; detailed original scenery illustrations and optional deeper 3D camera work are future polish.
5. **Latency/fairness:** answer speed is calculated from server timestamps, without trusting client-reported time. A carefully bounded RTT allowance has not been added. Evaluate real-device latency fairness before competitive/public play.
6. **Race balancing:** 70/120/190-distance choices and boost values are prototypes. Real players should validate whether race times, pass penalties and finishing windows feel fair.
7. **Scale:** 2–8 is the intended MVP racer limit, not a large-room benchmark. Server simulation and stream frequency should be load-tested across multiple rooms.
8. **Room durability:** the existing application stores rooms in memory. A process restart ends the race, as with existing game modes.

## Suggested validation checklist

- [ ] `npm ci && npm test` passes on Node 22 (existing and new tests)
- [ ] Host creates Quiz Race with every track/difficulty/length combination; category remains consistent
- [ ] Two players join using separate phones, ready up and race simultaneously
- [ ] Faster correct answer visibly boosts more; wrong, Pass and timeout result in distinct slowdowns
- [ ] Overtakes correctly change rankings; winner is server-authoritative across browsers
- [ ] Pause/resume doesn't consume question time or move the racers
- [ ] Late join waits for next lobby; disconnected phone reconnects and resumes its active question
- [ ] Fullscreen TV, 1024px landscape tablet, 390px Android portrait and 320px viewport have no clipped controls
- [ ] Reduced motion and keyboard navigation remain playable
- [ ] Host can rematch and load the next playlist mode; all original eleven modes still work
- [ ] Reconcile this branch with PR #2 security fixes and PR #3 homepage changes, then rerun tests

See `docs/QUIZ_RACE_GAME_DESIGN.md` and `docs/QUIZ_RACE_CODEX_BUILD_PROMPT.md` for the full proposed future roadmap. Numeric values are prototype defaults, not final gameplay balance.
