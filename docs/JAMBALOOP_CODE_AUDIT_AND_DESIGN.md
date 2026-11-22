# Jambaloop — Code audit and design roadmap (22 November 2026)

## Scope, provenance and limits

This review covers the imported Quiz Club source and the Jambaloop branding commit on `main` (`1de383daeabc9deccd43293be75a11bb25f44748`). It is a static/source-level review plus test checks, not a substitute for running the full app with real host and player devices.

- **118 source files in the original import**, including 34 JavaScript files, 11 game modes, 16 quiz topics, shared multiplayer backend, artwork, font licences and demonstration videos.
- The original 34 JavaScript files passed Node 22 syntax checks; the seven dependency-free local tests passed.
- The 12 server-backed tests could not be run in the local offline audit container because Express was not installed. **GitHub Actions completed successfully on the branding commit**, where `npm ci` runs before `npm test`. Do not describe these 12 as failing application tests.
- No live usability screenshot or real multi-device playtest was completed during this review. The 300-player limit is configuration, not proven throughput.
- Existing source baseline, game functionality and supplied logos must not be overwritten. Jambaloop branding remains provisional pending commercial naming clearance.

## Architecture map

| Area | Primary files | Observations |
| --- | --- | --- |
| Server, rooms, API, game orchestration | `server.js`, `room-clock.js`, `room-presence.js` | Express 5, in-process `Map` of rooms, 6-digit codes, cryptographic host/player keys, JSON REST endpoints and NDJSON streaming `/live`. |
| Core frontend and lobby | `public/index.html`, `public/app.js`, `public/room-session.js` | Vanilla JS DOM rendering, host/phone views, reconnect handling and browser-stored sessions. `public/app.js` is ~1,327 lines; keep it working while extracting cohesive features as warranted. |
| Game metadata and quizzes | `public/game-config.js`, `questions.js`, `board-questions.js`, `difficulty-questions.js`, `extra-questions.js`, `public/custom-quiz.js`, `public/quiz-editor.js` | 11 modes, 16 named trivia topics plus Mixed Bag, quiz editor/import with validation. Quiz library is local to each browser. |
| Party modes and playlists | `party-games.js`, `social-games.js`, `public/game-night.js`, `public/party-views.js` | Party voting, Hot Potato, social writing games, 15/30/60-minute playlist presets and phone captain controls. |
| UI layers and themes | `public/style.css`, `public/studio.css`, `public/club-detail.css`, `public/mobile-deck.css`, `public/mode-style.css`, `public/branding.css`, other dedicated CSS files | Existing landing is light/cream with old quiz branding and a five-column mode grid; gameplay is generally dark. Overlapping selectors and theme-specific overrides need cautious consolidation. |
| Motion, 3D, scoring | `public/board.js`, `public/tower-motion.js`, `public/game-views.js`, `public/score-break.js`, `public/ceremony.js`, `public/sound-cues.js` | Three.js die/tower/board scenes, WebGL fallback, server-linked dice outcomes, staged leaderboard reveal and sound cues. 3D already has DPR cap, disposal, context-loss callbacks and mostly on-demand rendering. Preserve them. |
| Brand assets | `public/branding/`, `docs/BRANDING_ASSETS.md` | Supplied original navy and white logo images retained; transparent WebP display variants for light and dark contexts; emblem favicon. Use exact assets rather than approximating or regenerating them. |
| Automated checks | `test/*.test.js`, `.github/workflows/tests.yml` | Node 22 syntax checks and `node --test`; integration tests cover multiplayer groups of 4, 12, 30, reconnection, checkpoints, some game outcomes and playlists. |

## Confirmed source-level findings — verify impact before modifying

1. **Invite URL origin trust:** In `server.js` near room creation, `x-forwarded-host` and `x-forwarded-proto` are consumed to generate the QR invite URL when `PUBLIC_URL` is not set. Treat as a potential attacker-controlled-origin risk depending on reverse-proxy behaviour. Require a validated canonical public origin or explicitly trusted proxy settings; add adversarial tests.
2. **Avatar authorization:** `GET /api/rooms/:code/avatar/:id` returns in-memory photo bytes without checking `x-game-key` membership. Even if other room details aren't readily enumerable, picture URLs may be shared; add an access/lifecycle review and tests, including what happens after a player leaves or the room expires.
3. **Abuse/connection bounds:** `POST /api/rooms` has no explicit application-level creation limit and `/live` can open multiple NDJSON streams for the same key. Cap resources, rate-limit creation/join attempts appropriately and test graceful backpressure/reconnect behaviour. Do not break frictionless guest play.
4. **Server-local state:** `rooms = new Map()` means restarts lose rooms and multiple instances will not share them. Initially deploy as a long-lived single Node instance; document restart semantics. Propose durable persistence/pub-sub as a separate architecture PR only after measuring needs.
5. **Brand inconsistency:** Homepage hero still says “Big quiz,” title and visible theme labels retain “Quiz Club,” old hero art is `/quiz-club.webp`, and internal legacy browser keys include `quiz-club-theme` and `quizmas-session`. Update *visible* copy and metadata now, but migrate browser keys backward-compatibly; don't strand existing sessions/quizzes.
6. **CSS layering and discoverability:** `studio.css` defines a cream/light landing with a navy-ish #2945c0 accent and a five-column modes grid, while `club-detail.css` adds game artwork and a featured first card. It is visually inconsistent with the new colourful loop logo. Inspect responsive styles and breakpoints before changing them; do not stack another large override-only CSS file.
7. **High-frequency updates:** `public/app.js` uses a 150ms interval for timers/ceremonies/score checkpoints even on inactive views. Check visibility/battery cost and render signatures, measure rerender/focus disruption, and scope updates to active views without breaking countdown correctness.
8. **Rendering safety:** `public/app.js`, `party-views.js` and other modules construct substantial template strings and `innerHTML` from game/player/custom-quiz state. Helpers escape many values, but perform an end-to-end untrusted-input and XSS audit rather than assuming the entire app is safe or compromised.
9. **Validation, privacy and editorial:** Check nickname normalization, custom quiz import, JPEG magic bytes and content limits; review third-party image/video provenance and bundled OFL font licences before monetisation. World News quiz content can become stale and needs an editorial fact check.
10. **Load claims:** The configured cap of 300 players and existing 30-player test are different claims. Build representative load tests for room creation, NDJSON streams, repeated answers, score publishing and server memory before marketing 300 simultaneous devices as verified.

## Product direction — Jambaloop, the party arcade

### Brand

- Default: refined deep navy (`#131A33`, deeper surfaces `#101626`), white text, controlled use of the logo's teal (`#1DD9BE`), yellow/orange (`#FFBD43`), coral (`#FF6B71`) and violet (`#8954FF`).
- Support a light version using the navy logo; use the existing white-logo WebP for dark surfaces.
- Reuse the infinity-loop shape as a subtle visual motif, **not as a permanent full-screen animation**. Keep current themed modes (Christmas, Arcade, Lodge) functional.
- Build CSS tokens for typography, spacing, contrast, buttons, radius, shadow, layers and motion, plus mode-specific accent tokens. Don't recolour brand image files with CSS filters.

### Landing and choosing games

- Replace quiz-specific hero copy with “Your next game night starts here” or an equally clear original message; say TV/large screen + phones + browser join.
- Primary actions: **Host a game**, **Join with a code**; tertiary **Explore games**. Surface “Resume room” only when meaningful.
- Improve the discovery cards: clearly show game name, short premise, player minimum, category (Trivia / Party / Team / Quick), input type, and an *honest* time estimate only if measured or described as approximate.
- Reuse existing `public/mode-*.webp` and `public/videos/*.mp4`. Show posters by default; lazily load video only in a deliberate preview or after user focus/interaction. Provide play/pause/mute and reduced-data options. Never autoplay eleven full previews at once.
- Consider a featured game, game-selection filter chips and a separate details sheet with “How it works”, players, estimated time, **Play** and **Add to playlist**. The card and CTA should remain useful with keyboard and touch.
- Fix awkward gaps/orphan cards with a responsive ~3-column desktop, 2-column tablet, 1–2-column narrow-phone structure and consistent 16:9 artwork cropping. Preserve readability at 320px and 200% zoom.
- Keep quick “3 steps: Host → Join → Play” explanatory UI and a simpler code-entry field with example formatting, join errors and reconnect messaging.

### Shared interaction and motion

- Motion language: mostly 160–300ms CSS transforms/opacity; longer intentional stage transitions 300–600ms. Animate outcome *presentation*, never game result or timer state.
- Make the loop emblem gently breathe/trace during initial lobby loading and successful connection; stop when settled or when motion is reduced.
- Give mode cards subtle lift/focus outlines and artwork parallax **only when appropriate**; avoid continuous tilt, bright flashing and layout-shifting shadows.
- Reuse existing `score-break.js` FLIP/reorder logic and `ceremony.js` podium reveals; polish hierarchy, stage timing and celebrations only after testing.
- Add predictable transitions for lobby join, ready count, countdown, answer lock, reveal, leaderboard checkpoint and playlist handoff. Avoid trapping keyboard focus or disabling controls during effects.
- Respect `prefers-reduced-motion`, mute choice, data savings, background-tab pausing and accessibility. Prefer `transform` and `opacity` for smooth motion. W3C WCAG 2.2 AA is the accessibility target.

### Game-specific polish, without changing rules

| Game | Suggested improvements |
| --- | --- |
| Classic Quiz | Clean question typography, high-contrast answers, selected/locked feedback, reveal wipe, leaderboard emphasis |
| Spin the Wheel | Clear server-selected category, deceleration and pointer settling; deterministic and skippable |
| Board Race | Better camera framing, pawn route highlights and result readability; keep server-authoritative 3D die, tower and 2D fallback |
| Dice Rally | Better two-dice landing, score multiplier presentation and audio, with no visual/result mismatch |
| Knockout | Animated heart/life indicators, spectator/knocked-out state, restrained elimination reveal |
| Punchline Party | Anonymous card entrances, reading-time pacing and clear ballots; never leak identity early |
| Fill the Blank | Responsive private hands, satisfying card selection and optional subtle shuffle |
| Fork in the Tracks | Two distinct choice zones, team vote breakdown, animated result reveal with no early leaks |
| Spot the Bluff | Clear hidden-prompt distinction, masked suspense and fair anonymous vote reveal |
| Hot Potato | Transfer/handoff animation, holder identification, legible 120s countdown and poor-network fallback |
| Team Showdown | Team-tinted panels, privacy-aware player questions and shared team-score animations |

### 3D and performance

- Preserve the existing Three.js architecture and `mountTable` logic. It already caps DPR, handles context loss, disposes GPU resources, renders mostly on demand, and has reduced-motion/2D fallbacks.
- Measure fps/frame time on an ordinary Android phone and desktop TV; improve scene composition and die/tower lighting only if readability and performance improve. Never add a second perpetual renderer for the homepage.
- Use low-cost animated CSS/vector backdrops by default; load Three.js only for games that need 3D.
- Avoid excessive video downloads, unnecessary timers while offscreen, and repeated full-page DOM replacement for small state changes.

## Recommended work sequence

1. **PR 1 — Audit & test fixtures:** reliable `npm ci`, all existing tests, automated browser smoke tests where feasible, reproducible issues, priority ranking, screenshots across desktop/landscape tablet/portrait phone.
2. **PR 2 — Security and multiplayer stability:** URL origins, avatar access, creation/join rate limiting, streaming client limits, reconnection, memory and idle cleanup; add regression tests.
3. **PR 3 — Brand foundation:** CSS tokens and Jambaloop copy; logo contrast rules and responsive header/footer; backward-compatible legacy browser storage handling.
4. **PR 4 — Landing and game discovery:** new hero, card layout, categories/filters, game previews and host/join/setup UX; preserve all modes.
5. **PR 5 — Host and player UI:** game lobby, timers, answers, spectator/captain states, leaderboard and celebrations; accessibility and responsive views.
6. **PR 6 — Mode-specific motion and 3D:** selective quality improvements after profiling; include fallback tests.
7. **PR 7 — Full device/playtest and launch readiness:** 11-game matrix, real phones, Android touch, desktop and TV, slow network, reconnect and load tests, provenance/privacy notes.

## Acceptance criteria and reporting

- Every existing game can be selected, hosted, joined and completed, including playlist handoff, rematch, scoring and captain controls.
- Brand images render correctly on light and dark themes; no excessive CSS filtering or blurry scaling; no broken navigation at common breakpoints.
- Input and game data stays readable at desktop/TV, 16:9 landscape tablet and 320px phone widths; no major overflow/focus trapping.
- Reduced motion is usable everywhere and doesn't block play or hide necessary game information.
- Existing tests still pass; new tests cover each confirmed defect and redesigned high-risk interaction.
- Changes arrive in small reviewable branches/PRs with screenshots, before/after performance observations, regression notes and known limitations.
- No claims of validated 300-player or multi-instance operation until appropriate realistic tests pass; no production deployment, brand registration, or paid features without user approval.
