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
