# Jambaloop — Codex audit, fixes and experience upgrade brief

**Repository:** https://github.com/LCBlakey24-alt/jambaloop

**Baseline:** commit `a416a834d25d4cdb8ba10a14d6caaf1c4ed33048` imported the complete existing Quiz Club source (118 files). Preserve this working baseline.

## Mission

Turn the existing multiplayer, TV-hosted and phone-controlled Quiz Club into a polished **Jambaloop** games-night platform without rewriting or deleting working functionality. Prioritize reliability, safety and accessibility, then elevate the visual experience, transitions, backgrounds, celebratory effects and existing 3D minigames.

The repository is currently public. Do not commit secrets, identifiers, private user content or unlicensed media. "Jambaloop" is a provisional brand, not a legally cleared trademark.

## Before editing

1. Inspect `README.md`, `docs/DEPLOYMENT_AND_TESTING.md`, `server.js`, `public/index.html`, `public/app.js`, `public/style.css`, `public/board.js`, `public/tower-motion.js`, `public/game-config.js`, `test/*` and the rest of the modules.
2. Run `npm ci`, `npm test` and JS syntax checks. GitHub Actions passed after import, but recreate locally and assess coverage. Start the server and test a TV/desktop host and at least two phone clients.
3. Produce a compact audit: confirmed defects versus potential risks; severity, reproducible steps, affected modules and test gaps.
4. Work on separate feature branches and PRs. Make focused commits. Never force-push `main` or replace the architecture solely for appearance.

## Existing product behavior to preserve

11 games: Classic Quiz, Spin the Wheel, Board Race, Dice Rally, Knockout, Punchline Party, Fill the Blank, Fork in the Tracks, Spot the Bluff, Hot Potato, Team Showdown. Retain the 16 trivia categories and question bank, custom quiz import/export, phone controllers, QR and six-digit lobby codes, host/captain controls, answer scoring, reconnect/resume, score checkpoints, awards, playlists, selectable themes, sounds, 3D dice tower/tray, and reduced-motion / 2D fallbacks.

Current stack: Node.js 22, Express 5, vanilla browser JavaScript and CSS, Three.js (already used for 3D dice), Qrcode and Lucide. **Do not convert to React or add a new UI framework** without a demonstrated need.

## Priority 0 — Correctness, security, deployment

- Audit all game modes end-to-end and cover authorization for host/captain/player routes, answer privacy, team scoring, game states, timers, disconnects/rejoins, duplicate submissions, rematches and playlist transitions. Add targeted regression tests for each verified bug.
- Rooms are stored in a process-local `Map()` in `server.js`. This means restarts discard rooms and independently hosted instances will disagree. Preserve a long-running single-instance deployment for early testing; plan shared persistence/broadcasting only when justified. Do not claim serverless multi-instance support exists today.
- Examine public room creation/join endpoints for spam, flooding, excessive connections, oversized uploads and cleanup/rate limiting. Design reasonable protections that preserve a frictionless party experience.
- Review URL generation in `POST /api/rooms`, especially forwarded-host/protocol headers. Prefer trusted `PUBLIC_URL` and a deliberate proxy trust configuration, so QR/join URLs cannot be spoofed. Add tests.
- Inspect interpolated `innerHTML`/HTML templates and all user-supplied nicknames, custom quizzes, party text and imported JSON for injection, escaping and input-validation bugs. Do not assume a vulnerability exists without verifying it.
- Check avatar upload handling, privacy, content-type validation, lifecycle and memory usage; improve explicit privacy messaging for photos.
- Add safe server behavior for errors, timeouts, heartbeat cleanup, rejected requests, missing configuration and graceful shutdown. Keep any session keys out of URLs, logs and public output.
- Verify automated tests for 4, 12 and 30 participants. Treat the configured 300-player limit as unvalidated until appropriate performance/load tests demonstrate it.
- Review dependencies, third-party font/OFL notices, artwork/content provenance and release/legal readiness before public launch.

## Priority 1 — Jambaloop design system and responsiveness

Create a consistent, original, modern party-arcade feel (not a clone of Kahoot or Jackbox). The following palette is **provisional**, not mandatory: Midnight #131A33, Mint #44DDC8, Mango #FFCB63, Coral #FF718B, Violet #A78BFA. Develop reusable CSS tokens for colour, typography, spacing, radii, elevation, motion duration and focus states. Retain legibility and strong contrast.

- Redesign the landing hero, modes grid, category filters, buttons, settings panels, room-code/QR joining experience, status/error states, leaderboard and victory screens.
- Make host/TV layouts excellent at 16:9 and large desktop resolutions, provide a first-class landscape tablet layout, and make phone controllers thumb-friendly in portrait and landscape. Fix clipping, overflow, confusing navigation and touch targets.
- Give every game mode its own visual identity within the shared Jambaloop shell. Avoid costly full-page reflows or excessive imagery. Include active/loading/empty/disconnected/reconnecting states.
- Provide accessible semantic controls, keyboard support for host actions, visible focus indicators, correct modal focus, readable text and contrast, aria announcements that don't spam screen readers, and genuinely usable reduced-motion mode.

## Priority 2 — Motion, atmosphere and 3D

The code already has a Three.js board/dice presentation in `public/board.js`, tower animation logic in `public/tower-motion.js`, CSS presentation, sound cues and fallback rendering. **Improve these, don't rebuild them from scratch.** Ensure visual dice outcomes always match server-authoritative results and timings.

- Add restrained atmospheric animated backdrops, subtle depth/parallax, softly moving loop motifs, gradient lighting and responsive hover/press feedback. Keep the UI lightweight, readable and safe on mid-range Android devices.
- Improve scene transitions (roughly 180–350ms when suitable), room joining, player-ready feedback, round countdowns, answer locking, reveal anticipation, score movement and end-of-game podium moments.
- Use tasteful, short confetti/particle celebrations for genuine achievements and game wins, with clear reduced-motion and low-power fallbacks.
- Improve existing 3D die tumbles, tower collision readability, camera eases, board pawn travel and dice tray. Optimize WebGL use: render only when necessary, cap pixel ratio, clean up contexts/listeners, handle context loss, preserve the 2D fallback and avoid randomizing the already-decided game outcome.
- Add mode-specific effects where they enrich comprehension: wheel easing; fast, legible Hot Potato ownership handoff; Knockout elimination; anonymous Bluff/Punchline reveals; Team Showdown scoreboard; Fork in the Tracks choice reveal. Don't let animations delay gameplay or interfere with controls.
- Sound must be optional and respect browser autoplay restrictions. Motion must respect `prefers-reduced-motion`, pause where appropriate and never trap players.

## Delivery structure

**PR 1:** Audit + P0 fixes with reproducible tests, no visual overhaul.
**PR 2:** Shared design tokens and responsive host/tablet/mobile layouts.
**PR 3:** Motion polish, backgrounds and reduced-motion support.
**PR 4:** 3D dice/board/tray improvements and performance tuning.
**PR 5:** Remaining game-specific effects, cross-device playtesting and final QA.

For each PR, state what changed, why, screenshots/video for UI changes where possible, files modified, test results, any accessibility/performance trade-offs, and remaining issues. Prefer small verifiable improvements over a giant speculative rewrite.

**Begin by auditing the current repository and reporting the highest-priority confirmed problems. Then implement PR 1.**
