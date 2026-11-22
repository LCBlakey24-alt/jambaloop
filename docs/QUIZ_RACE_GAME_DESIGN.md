# Jambaloop — Quiz Race
**Game design document • Draft v1.0 • 22 November 2026**

**Status:** Approved *concept* and proposed implementation specification, not implemented. Proposed numeric values, visuals and extra features require playtesting. **Issue:** [#4 — Quiz Race](https://github.com/LCBlakey24-alt/jambaloop/issues/4).

## 1. Concept and pillars

**One-line pitch:** Answer quickly to accelerate, keep momentum through the bends and overtake rivals; **the first racer across the finish line wins**.

- All players answer trivia questions independently on their phones and race simultaneously on the shared host/TV screen.
- **Correct quickly → bigger temporary speed boost; correct slowly → smaller boost; wrong → meaningful slowdown; Pass → skip the question for a modest slowdown; timeout → stronger penalty.**
- Racers *always* retain some movement and may overtake at any point. Accuracy and reaction time determine results, **not quiz points**.
- The race is a continuous real-time mode, distinct from **Board Race** (dice and board spaces) and **Dice Rally** (dice multipliers).
- Use the existing room-code/QR, host/captain, category/question system, playlists, rematches and Jambaloop visual identity. No new sign-in or matchmaking layer.

## 2. What the player chooses

### Host setup
| Setting | MVP choices | Detail |
| --- | --- | --- |
| Questions | **General Knowledge**, **Mixed Topics**, or one existing themed category | Reuse existing \`public/game-config.js\` categories; do not create separate incompatible taxonomy |
| Difficulty | **Easy / Medium / Hard / Mixed** | UI mapping proposed: Easy → current \`family\`, Medium → \`standard\`, Hard → \`challenge\`; Mixed rotates across those, subject to available questions and balanced quality |
| Length | **Short / Medium / Long** | Suggested target distances: 70 / 120 / 190 units; tune after actual timed playtests |
| Track theme | **Neon Circuit / Desert Run / Snow Circuit / Jungle Trail / Space Route** | Appearance only; track geometry and physics remain comparable across themes |
| Racers | **2–8** for the first version | Optional solo practice later; 12+ only after UI and load tests |
| Question timer | **12 seconds** default | Optional 10–15s tuning after playtests, same timer for everyone |
| Accessibility | Reduced motion, optional sound, high contrast | Respect both user preferences and OS settings |

The *quiz theme* (what questions are asked) and the *track theme* (what the race looks like) are **independent**. E.g., Sports questions on the snowy track. The host sees a configuration summary before starting.

**Question format for MVP:** multiple choice (four large tap targets). Additional question formats may be added after reviewing response-time fairness; long text entry, ordering and number estimates are not fair in the same 12-second speed model without different rules.

### Player lobby
- Join by existing six-digit room code / QR / invite URL. Choose a nickname and one of eight distinct colour/icon pairings (colour should not be the only identifier).
- Host/TV shows the chosen track, category/difficulty/length, connected racers and ready indicators.
- Three-second \`3…2…1…GO!\` countdown synchronised to the server. Do not accept answers or move racers before GO.
- Late joiners spectate rather than enter mid-race; they may join the next game or rematch. Keep this rule explicit.

## 3. Core gameplay

1. GO starts the shared race clock and all racers at distance 0, base speed.
2. A timed, player-private question appears on each phone. The TV shows only race action and status, never correct answers.
3. All racers advance along the winding course continuously while the phones show questions.
4. The player selects one answer, or **Pass**. Input locks when accepted. The server measures time and validates the response.
5. The player receives quick feedback and a speed effect, then receives the next question after a short breather (~0.7 seconds).
6. Boost/penalty effects fade naturally; new effects **replace**, not stack, an old effect. Questions are independent between players.
7. Speed changes move each racer forward, including overtakes at curves. Racer lanes are aesthetic: they do not alter actual distance or provide shortcuts.
8. First to distance \`trackLength\` is the winner. Freeze authoritative ordering, show a brief finish/photo-finish reveal, then final standings and rematch/playlist controls.

**Important distinction:** "Pass" is provisionally defined as *skip a question*; "overtake/pass a racer" is always possible through higher speed. This resolves the earlier ambiguity for a first prototype; it remains a design choice that can be adjusted.

### Fair question delivery
- Select from existing category/difficulty question banks. Do not expose answer keys in phone snapshots before validation.
- Ensure comparable difficulty and available pool size for every player. Suggested MVP: seeded room-specific order of the **same** non-repeating multiple-choice questions, but each player progresses independently at their own pace. Do not display those questions or answers on the shared TV.
- Prevent question repetition until a pool is exhausted; then reshuffle and rotate deterministically. If the category/difficulty lacks enough valid items for a race, show clear setup validation or use an **explicitly disclosed** wider pool. Do not silently introduce off-theme questions.
- Guard against tapping multiple answers, submitting old question IDs, replaying submissions, skipping unlimited questions at negligible cost, or deriving correct answers from server state. The next question is issued only by the server.
- A minimum inter-question delay (~0.7s) prevents uncontrolled speed-tapping, including passes. Test whether rapid question progression remains fair and accessible.

## 4. Proposed numeric model (playtest baseline)

These are *starting assumptions*, not established balanced values.

### Units and clocks
- Distance in abstract track units; speed in track units/second.
- Base speed: \`v0 = 1.00\`.
- Speed range: \`0.40 ≤ speed ≤ 2.00\`.
- Question window: \`T = 12s\`.
- All scoring, collision-independent distance, start/finish times and question deadlines are owned by the server.
- Use a monotonic server clock for active race physics. Use server receive times with a documented, small RTT-based allowance for answering fairness. Never trust client-submitted elapsed times.

### Answer effect
| Outcome | Effect at decision moment | Duration, fading to zero |
| --- | --- | --- |
| Correct | \`+0.25 + 0.50 × (1 - clamp(responseSeconds / 12, 0, 1))\` | 4.0s |
| Wrong | \`-0.45\` | 3.0s |
| Pass/Skip | \`-0.30\` | 2.0s |
| Timeout | \`-0.60\` | 3.0s |

A correct answer at 0 seconds gives **+0.75** initial target-speed effect; at 3 seconds **+0.625**; at 7 seconds about **+0.458**; and at 12 seconds **+0.25**. Slower correct answers are still beneficial.

For an effect of amplitude \`A\`, elapsed seconds \`u\` after the accepted outcome and effect lifetime \`D\`:
\`\`\`text
strength(u) = A * max(0, 1 - u / D)
v(t)        = clamp(1.0 + strength(u), 0.4, 2.0)
distance   += v(t) * dt
\`\`\`
If there is no effect, move at base speed. The last accepted answer replaces the current temporary effect, so bonuses cannot stack indefinitely. For aesthetics, the client can ease its displayed movement between authoritative snapshots; easing must not change the server finish result.

**Examples:** Correct quickly → brighter, longer speed trail and noticeable acceleration. Wrong → shorter/dimmer trail and temporary deceleration. Pass → mild loss of momentum while the next prompt arrives. No effect may move a racer backwards.

### Finish ordering
- On each server simulation interval, integrate progress and determine the earliest instant a racer crosses the target distance. If multiple cross within the same tick, interpolate their crossing time using start/end distance and the effective speed/integration model; order by those timestamps, not by loop order or client frame rate.
- An exact unresolved dead heat is rare; handle deterministically and transparently (e.g. display a joint finish if times are indistinguishable within the simulation's time resolution) rather than selecting by array order.
- Display positions from authoritative progress data. Do not change standings based on rendered screen coordinates or apparent lane length.
- All racers finish or use a short post-winner grace window (e.g. 10 seconds) for runners-up before final results. The first player remains winner irrespective of grace-window completions.

### Balance targets
Short race roughly 1 minute; Medium roughly 1.5–2.5 minutes; Long roughly 2.5–4 minutes at typical human pace. Verify with simulation and actual players. Avoid runaway leaders, avoid repeated Pass exploits, and confirm strong players can catch up without arbitrary rubber-banding.

## 5. Shared-screen race scene

**Layout (16:9 host/TV):**
\`\`\`text
  [QUIZ RACE]     CATEGORY: SPORTS     DISTANCE: 120       [00:54]
  ┌─────────────────────────────────────────────────────────────┐
  │  Bending S-shaped track with 2–8 readable racers           │
  │  ╭───────────────────────────────────╮                      │
  │  │ colored curved paths / progress  ╰────╮ FINISH ▨▨▨    │
  │  │ racers move with boosts + trails        ╰────────────── │
  └─────────────────────────────────────────────────────────────┘
  1  MIA  72%   ▶ faster   2  JAY  69%   3  SAM  61%   ...
  [Host: Pause] [Sound] [Room code / QR] [Connection status]
\`\`\`

### Curving track and trails
- Draw a large, readable **winding/S-bend track** using SVG Bézier paths or a 2D Canvas path, with a start line, finish marker, road edging, markers and themed scenery.
- Each racer has a stable identity (nickname, distinct icon and colour), visible on-screen with their own separate *visual lane*. Compute positions from **normalised track arc length**, not naive Bézier parameter \`t\`, so motion along curves isn't distorted.
- **Permanent thin progress line:** colour-coded, from start to each racer's actual travelled distance along their lane, with subtle opacity. Makes their advancement legible at a glance.
- **Short bright trailing wake:** render the most recent ~6–10 abstract distance units behind the racer with a fade, longer/brighter for correct-answer acceleration, softer/dimmer during wrong/Pass/timeout. Follow the actual curved course; do not draw a straight shortcut.
- Prevent overlapping names by floating labels or using a compact standings strip. Racers may overtake without simulated vehicle collisions; keep controls entirely on phones.
- The finish remains clear. For large separation, use a minimal camera/track-focus transition or an inset overview rather than hiding last-place racers.
- On narrow TV/tablet layouts, choose an alternate framing/inset; don't compress the road until labels become unreadable.
- Theme changes should affect scenery, surface pattern, ambient colour and decoration while using the same route and speed physics.

### Optional five track skins
1. **Neon Circuit** — navy tarmac, teal/mango/violet/coral illuminated edges, city silhouettes.
2. **Desert Run** — sand-coloured shoulders, dunes, dusty but readable trails.
3. **Snow Circuit** — icy bends, crisp white banks, subtle falling snow (off for reduced motion).
4. **Jungle Trail** — canopy shadows, leafy edges, warm sunlight.
5. **Space Route** — dark stellar road, planets and faint nebulae without distracting flashes.

All tracks share a compact asset manifest and low-data fallback. Track graphics must not cover racers or questions; avoid copyrighted racing characters/brands.

### Animation states
- Intro fly-in and 3…2…1 countdown.
- Continuous client-side interpolation between periodic server progress snapshots. No client-authoritative distance.
- Correct answer: ~200–350ms easing and stretched luminous trail. Faster answers produce stronger but not blinding glow.
- Wrong/Pass: gentle deceleration and shorter/fainter wake; no violent flashing or camera shake.
- Overtake: brief position change emphasis, readable without a sound cue.
- Near finish: optional restrained energy buildup or framing change.
- Crossing: finish ribbon/line effect; winner announcement and very short optional confetti.
- Close race: photo-finish graphic uses **recorded server crossing timestamps**, never a fabricated video replay.
- Optional sound and lower-cost graphics must always be available; respect \`prefers-reduced-motion\` and reduced-data/low-power modes.

**Technology preference:** 2D SVG geometry plus CSS transform/opacity as MVP. Use SVG path measurements/lookup tables or an equivalent precomputed arc-length polyline; do not require a game physics engine or heavy WebGL. Keep Three.js optional for later visual upgrades.

## 6. Phone interface

**Portrait:** current question/difficulty indicator; 12-second countdown; four large accessible answer choices; an explicit **Pass question** control; bottom persistent strip with position, progress, speed state and connection indicator.

Example:
\`\`\`text
  Quiz Race      2nd of 6                 Sports • Medium
  Which country... ?                     [ 08s left ]
  [A ...                         ] [B ...                 ]
  [C ...                         ] [D ...                 ]
  [Pass question]
  ────────────────────────────────────────────────────
  Progress 65%        Speed BOOSTING          +0.63
\`\`\`

- A correct/incorrect/Pass response gives concise feedback that doesn't block next question.
- Avoid routing back to full room/lobby after each question. Keep answer choices comfortably tappable and semantic.
- Provide reliable return-from-background and reconnect states, showing authoritative distance and active question after network recovery.
- Landscape phone: two-column question/answers as appropriate; no clipped controls.
- Avoid requiring racing/steering inputs; this is a **knowledge-speed game**, not an on-phone driving game.

## 7. Server & integration design

Consult current \`main\` and the two open PRs before implementation: **#2 multiplayer hardening** and **#3 homepage redesign** may be merged or rebased independently.

Suggested separated modules:
- \`quiz-race.js\`: pure speed/effect maths, player race state, tick integration, finish order, authoritative question acceptance; testable with an injected clock.
- \`public/quiz-race-track.js\`: SVG/S-bend geometry, arc-length lookup, progression/trails, interpolation.
- \`public/quiz-race-view.js\` and \`public/quiz-race.css\`: shared TV and phone UI, themed skins and reduced-motion rules.
- \`test/quiz-race.test.js\` (and browser fixtures when available).

Adapt the repository's existing architecture:
- Add a unique \`quiz-race\` mode to \`public/game-config.js\`, appropriate setup defaults, 2-player minimum, artwork and a reusable theme palette.
- Integrate room creation/configure/start/answer/state serialization/streaming/end/rematch/playlist in \`server.js\` via a dedicated race handler. Avoid scattering race mechanics through unrelated branches.
- Reuse \`makeQuestions\` and current category/difficulty IDs, but create fair repeat-safe room question queues. Do not leak answers in public state, in host snapshots or in race metadata.
- Use \`/api/rooms/:code/live\`/existing room stream to send **compact race snapshots**, e.g. 5–10 times/sec under load, with server time, race status, player distance and speed effect timestamps. Render at \`requestAnimationFrame\` rate via interpolation; do not open extra streams per player.
- Server simulation may tick at around 20Hz; test CPU/network for multiple concurrent rooms. Beware process-local room state and background-tab throttling.
- Authentication, input validation, idempotent submissions, host/captain permission checks, player reconnect, rate limits, pauses and room cleanup must follow the hardened code.
- Use client-side smoothing only for graphics; compute winning based on server monotonic timing. Stop/skip sending unnecessary updates once finished.

### Explicit edge cases
- Same answer submitted twice, out-of-date answer ID, racing before GO, answer after timeout, Pass after answering, browser disconnect/reconnect, no answer, question pool exhaustion, insufficient players, late joins, spectator display, host pause/resume, multi-step playlist and rematch.
- On pause, freeze question timers, effect decay and position together. On resume, do not unfairly spend remaining time.
- Consider RTT/latency differences: record sampled round trips, compensate conservatively with a bounded allowance if required, and test a weak connection. Keep anti-cheat logic and reward fairness server-controlled.
- Disconnected racers can continue moving at their decaying/base speed but eventually time out unanswered questions; don't let their final boost persist forever. Reconnected phones resume with the latest active prompt.
- Protect room access, especially race answers and player photo URLs.
- Never promise support for 300 racers simply because another game mode advertises 300 players.

## 8. Acceptance tests (must pass before shipping)

1. Every player starts at exactly distance 0 after one countdown; no early movement.
2. Correct at 2s yields a stronger speed change than correct at 10s.
3. Wrong, Pass and timeout give distinct penalties; speed never below 0.4 or above 2.0.
4. Effects expire/replace predictably; no unintended accumulation and no backward motion.
5. Two racers can overtake on a winding track; ordering matches server progress even when on different visual lanes.
6. Server finish result is the same regardless of frame rate, animation toggle, slow connection or render fallback.
7. Multiple racers crossing during the same tick get a consistent, justified crossing order; no array-order bias.
8. Individual phones can progress through questions independently without revealing answers to others.
9. No unlimited pass spam, duplicate answers, stale question acceptance or client timestamps changing the winner.
10. Host/captain, room codes, ready states, pause, reconnect, spectator/late join, rematch and playlist operate.
11. Questions adhere to the selected theme and difficulty; pool exhaustion is handled explicitly.
12. 8-player race remains readable and performant on desktop/landscape tablet and a typical mid-range Android phone; no unintended horizontal overflow.
13. Reduced motion, keyboard/touch, high contrast, screen-reader names and 2D fallback all work.
14. Existing 11 games and baseline tests remain unchanged/passing. Run \`npm ci\`, \`npm test\`, syntax checks, opt-in browser tests and manual multi-device sessions.
15. CI results, performance observations, known limitations and screenshots/video are included with each PR.

## 9. Implementation milestones

- **M1 Rules & validation:** seedable pure physics model, fair question ordering, length/config schema and deterministic test cases.
- **M2 Server mode:** state transitions, question endpoints, SSE events, finish ordering, edge cases and integration tests.
- **M3 TV track:** curving 2D track, moving vehicles/icons, per-player progress and curved fading trails, scoreboard and finish.
- **M4 Phones & host:** question UI, Pass, speed indicator, ready/countdown, accessibility and reconnect.
- **M5 Themes & polish:** five appearance skins, subtle audio/animations, extra-device and load testing.
- **M6 Optional future:** team races, solo time trials, cosmetics, 3D track cameras, more question formats, achievements and spectator controls.

All feature development should use a new branch and reviewable PRs, respecting ongoing PRs #2 and #3. No gameplay code has been changed by this specification.

## 10. Codex handoff

See [QUIZ_RACE_CODEX_BUILD_PROMPT.md](QUIZ_RACE_CODEX_BUILD_PROMPT.md) for the executable development instructions. The preferred first PR is **M1: deterministic mechanics, configuration and tests**, not a giant end-to-end implementation.
