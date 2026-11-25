# Integration batch status — 24 November 2026 (late)

Branch `ccr-f45d5751-1l0u82` integrates the open stability, redesign, So Close and roadmap PRs on top of `main` @ `140187e`, with fixes found in review. Statuses are kept separate on purpose.

## Reviewed and integrated (merged into the integration branch, **not into main**)

| PR | Result of review |
|----|------------------|
| #53 Quiz Race placings | Correct. `rankings()` already orders racers by finish; players are never deleted, so `placementRanks` cannot see a missing row. |
| #54 TV-first phones | Correct. Server default `phoneView` becomes `answers`; private team Showdown still forces `full`. So Close keeps unit and range on the phone wheel without the prompt. |
| #55 One-surface controllers | Correct. Scroll restoration is gated on an unchanged phase key, so a new question still starts at the top. |
| #56 Compact party finals | Correct. |
| #57 Quiz Race retry errors | Correct; `refresh()` swallows its own network errors, so the catch path is safe. |
| #58 Reload keeps locked answer | Test-only; passes. |
| #63 Batch-one redesign | Merged cleanly. Its `modes.length === 18` test was replaced (see below). |
| #65 So Close | Conflicts in `app.js`, `index.html`, `server.js` resolved keeping both sides. Defects fixed below. |
| #66, #62, #60 | Docs-only; merged, keeping both narration and player-stats sections. |
| #47, #50 | Deferred design PRs; not touched. |

## Defects found and fixed

1. **So Close reveal leaked results through the API.** At reveal start every client received the actual answer, `answerCorrect`, `earned`, `closest`, updated scores and a distance-sorted guess list. The server now stages the reveal: *guesses* (names + numbers, pre-round standings) → *answer* (actual value) → *results*. Each stage is published by a server timer; clients hold the previous frame until the matching state arrives (`stageFrame`).
2. **Early Next skipped the whole reveal.** `/advance` during an unfinished So Close reveal now acts as *Skip to results*; the next press moves on.
3. **TV header said "Answer revealed" during the guesses.** Caption is now "The big reveal" until results.
4. **Wheel drag was inverted.** Larger numbers sit above the centre, so dragging down now increases the guess (mouse wheel was already correct). Wide ranges also gain a ×10 step pair.
5. **"+100 pts each" for a single winner**, unlabelled ruler markers and a clipped 720p guess list: fixed (initials on staggered markers, TV list in columns).
6. **Hardcoded game counts.** `brain-ladder-browser.mjs`, `rare-find-browser.mjs`, `top-answers-browser.mjs`, `spotlight-browser.mjs`, `test/game-show-design.test.js` and `test/content-expansion-v2.test.js` now compare launcher tiles / registered modes against the explicit ID list in `released-games.js`, so removing or renaming a game still fails.
7. Local `browser-screenshots/` were untracked and ignored (CI uploads them as artifacts).

## Content added

`so-close-bank.js`: **72 real-world measurement prompts** (landmarks, geography, animals, space, history, sport, science, food, culture) with definitions, rounding, units and a cited reference each. Status is `sourced`, **not** `verified`: figures are long-established reference values, but no second editor has re-checked them. Duplicates of existing prompts were removed after a similarity screen. Every cited URL was fetched on 24 Nov 2026: no 404s remain; Britannica, parliament.uk and a few others return 403 to automated requests and still need a manual browser check. So Close draws from this bank first (unseen first, spread across subjects), topping up thin categories from the general estimate bank. Target remains 150–300.

## Tested (locally, this branch)

- `npm ci`; `npm test`: **166/166 pass** (was 146 on main).
- `node --check` on every `.js` file and every `scripts/*.mjs`: pass. `questionAudit()`: 0 errors. `soCloseAudit()`: 0 errors.
- All 16 CI browser scripts against a local server with Playwright 1.63 / Chromium: **all pass**; `tv-all-modes` reports no layout warnings for any of the 19 modes at 1280×720 and 1920×1080.
- New `scripts/so-close-browser.mjs` (added to CI): launcher setup, TV-first phones, arrow/drag/direct entry, reload with a locked guess, staged reveal, phone reload mid-reveal, TV skip, results, next round at 320×640, 390×844, 844×390, 1280×720 and 1920×1080 (reduced motion), no console errors: **pass**.
- Not done: physical TV/phone playtest, screen-reader pass, CI on GitHub for this branch (runs when the PR opens).

## Deployed

**Nothing.** Live `index.html` on jambaloop-family-test.onrender.com is byte-identical to `main` and serves no So Close or batch-one assets. Render's deploy SHA was not read (needs an owner-chosen Render workspace). Merging this branch to `main` will auto-deploy and restart in-memory rooms (#41): merge only in a quiet window.

## Next priorities

1. Owner playtest of So Close on a real TV + phones; tune reveal timings (currently ~6–14 s per round) and scoring.
2. Hand-check the 403-blocked sources, then raise reviewed rows to `verified`; grow the bank toward 150–300.
3. Hot Potato result/star placement and a central player-cap check across join/configure/start/playlist/rematch (handoff items still open).
4. Batch 2 redesign (Board Race, Dice Rally, Quiz Race) on its own branch, reusing the server-staged reveal pattern where a mode has secret submissions.
5. Integrate the 15 previously exported narrator MP3s before generating anything new.

## Visual and motion polish (follow-up on the same branch)

Built:
- **Launcher:** every show now has its own original vector emblem (`public/show-identity.js`). Studio and finale identities remain Batch 1 only. Tiles deal in with a stagger, their emblems draw themselves in, cards tilt towards the pointer with a moving specular light, and the preview cover lifts out.
- **Launcher bug fixed:** at 1920×1080 the seven-column grid was 21px wider than its 1400px shell and clipped the last column. A legacy `body:not(.playing) .mode-list {gap:13px}` outranked the launcher gap. The grid now also sits under its heading instead of floating mid-panel.
- **Game UI** (`public/visual-polish.css`, `public/motion.js`):
  - bolder stage entrances (starting at 20% opacity, never fully hidden);
  - answers deal in; the correct answer pops while the rest step back; a wrong pick shakes on the phone;
  - the timer gets a heartbeat in the last five seconds;
  - podium places rise third→first with a crown pop and sheen, and podium scores count up;
  - scene backdrops drift; a canvas confetti burst fires at the finale (TV and winning phones), on a So Close winner, and lightly for a phone round win.
- **TV reveal bug fixed (also on main):** with live scores, a second full-width Leaderboard panel squeezed the question until its answers were cut off at 1280×720. Standings now live in the sidebar (up to 8, single-line, scrolling) with "+N more".
- **3D:**
  - neutral tone mapping and a warm rim light;
  - a 1.3s camera intro sweep on mount;
  - an idle camera drift on the TV only, throttled to ~30fps, paused in hidden tabs.

  A prefiltered environment map was tried and **rejected**: it raised the longest main-thread task per mount from ~0.35s to ~1.8s, and the stage remounts every phase.
- Everything decorative is disabled under `prefers-reduced-motion`: verified 0 running animations and no tilt on the launcher.

Tested: `npm test` 173/173; all 17 browser scripts pass; `tv-all-modes` (now measuring after entrance animations settle) has 0 layout warnings. Screenshots were reviewed for the launcher at 1920×1080, 1280×720 and 390×844; Classic Quiz question, reveal and finale; Board Race; and Dice Rally.

Not done: a physical TV performance check (the idle drift and confetti need a real-device look), and a per-show bespoke motion language beyond Batch 1.
