# Jambaloop — Claude Code instructions

**Read these files before touching code:**
1. [README.md](README.md) — what is shipped and how to run.
2. [docs/CLAUDE_CODE_HANDOFF_2026-11-24.md](docs/CLAUDE_CODE_HANDOFF_2026-11-24.md) — recent implementation snapshot, issue priorities and next-work sequence.
3. [docs/GAME_EXPANSION_ROADMAP_2026.md](docs/GAME_EXPANSION_ROADMAP_2026.md) — future ideas and uniqueness gate.
4. Latest GitHub issues, pull requests, `public/game-config.js`, tests and Render deployment state. The documents are dated; **current source and CI take precedence**.

## Project constraints

- Jambaloop is an existing Node 22 / Express 5 multiplayer browser game. TV host and phone controllers support **19 released game mode IDs on `main`**, all live on Render, including So Close (`soclose`). `released-games.js` is the single explicit list tests compare against — update it deliberately when adding a game, with vanilla JavaScript UI and 3D only where appropriate. Do not rebuild it from scratch.
- Run `npm ci` and `npm test` before edits; add regression tests for each confirmed bug. Check full gameplay/content and browser workflows as relevant.
- Improve stability, reconnects, authoritative timers/scoring, player and host UX, responsive layouts, and original question/prompt coverage **before** expanding the number of game tiles.
- Preserve API/auth semantics and existing modes, themes, quiz editor, private data filters, SSE events, three.js fallback, session continuity and accessibility unless a tested change is explicitly scoped.
- Keep spoilers/private roles, secret submissions, ballots, hands, tokens, and answer keys out of other players' views, neutral TV/host state, logs and streams.
- Use small, reviewable branches/PRs. **`main` is set to Render auto-deploy on commit (though every release so far was a manual API deploy; check Deploys after merging); merging can restart active games** because server room state is currently in-memory ([#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41)). Do not automatically merge experimental code. Check current Render service and latest live SHA before claiming release.
- Do not add paid services/dependencies, age-restricted content, external login systems or persistent user-generated secrets without explicit review.
- New game designs **are not shipped**. In particular: [Secret Suspects #42](https://github.com/LCBlakey24-alt/jambaloop/issues/42) and [Bloodmoon Council #43](https://github.com/LCBlakey24-alt/jambaloop/issues/43) are planning-only. Read [Bloodmoon brief](docs/BLOODMOON_COUNCIL_DESIGN.md) before implementation. Keep the two distinct from Spot the Bluff.
- All art, narration and card/question copy must be original or properly licensed, not replications of another show's branded assets.
- Expand and fact-check content regularly, avoiding immediate repeats; use honest source and answer provenance.

## Voiceover future roadmap (do not implement during current QA sprint)

[Issue #61](https://github.com/LCBlakey24-alt/jambaloop/issues/61) and [full-match narrator/Double Act brief](docs/FULL_MATCH_NARRATION_AND_DUO_ROADMAP.md) describe an optional British TV presenter who narrates game previews, stage changes, predetermined public prompts/questions, reveal and finishing; and a later two-original-speaker scripted dialogue mode. Avoid runtime AI generation, secret answer/player-text narration, overlapping audio or blocking timers. Pre-render known licensed clips, keep exact captions, phones silent by default and sound opt-in; always provide text-only play. Current main contains **only 3 actual ElevenLabs MP3s** even though 18 scripts and 15 additional prior recordings are documented. Never mark unavailable binary audio as shipped. After quality/reconnection work, verify missing assets first; do not regenerate needlessly or spend credits without approval.

## Future account/statistics feature — **do not build yet**

[Player profiles, lifetime records and optional TV “form guide” #59](https://github.com/LCBlakey24-alt/jambaloop/issues/59) are recorded in [the dedicated roadmap](docs/PLAYER_PROFILES_AND_STATS_ROADMAP.md). An eventual user account can show per-game plays, individual/team wins, streaks and opt-in public highlights, with guest play preserved. Any reported percentage must be labelled a **historical record with sample size**, not an unsupported chance to win. Future implementation needs an audited server-authoritative winner definition for each mode, persistent private storage, secure authentication, age/privacy review, data deletion and idempotent completed-game events. No account database, login provider or paid feature is approved by this documentation. **Keep existing-game code review/reconnection and mobile QA as priority.**

## Work order

1. Sync and inspect `main`, live deployment, issues, recent CI and most severe reproducible bugs. Fix bugs with failing tests first.
2. Continue Party Games 2.0: Hot Potato / Spot the Bluff pacing and multi-round depth per [#40](https://github.com/LCBlakey24-alt/jambaloop/issues/40).
3. Improve UX, games' distinctiveness, bank size, end-to-end phone/TV coverage and age-appropriate filters.
4. Prototype **new** game ideas only after design/privacy contracts and targeted tests; keep implementation separate from this documentation update.

**If tool context is limited, follow the longer handoff instead of guessing at omitted features.** Always report what was reviewed, built, tested, merged and deployed as distinct statuses.


## Latest owner-approved development addendum (24 November 2026, evening)
Read [the next development handoff](docs/CLAUDE_NEXT_DEVELOPMENT_HANDOFF_2026-11-24.md) before beginning new work. It records draft PRs #63/#65, their latest checked CI, the standalone So Close estimation show, dramatic reveals across all games, the six original redesign batches plus So Close, continuous content expansion, and release priorities. Earlier references to 18 games describe the shipped baseline, not the proposed 19-game library. Do not assume draft features are merged or deployed.

## Integration batch status (24 November 2026, late)
[docs/INTEGRATION_STATUS_2026-11-24.md](docs/INTEGRATION_STATUS_2026-11-24.md) records which PRs were reviewed and integrated, defects fixed (So Close server-staged reveal, wheel drag direction, hardcoded game counts), content added (72 sourced So Close prompts), test results and what is **not** deployed. For games with secret submissions, follow the So Close pattern: stage reveal data on the server, never only in the animation.

## Current status (25 November 2026)
[docs/STATUS_2026-11-25.md](docs/STATUS_2026-11-25.md) is the latest snapshot: `main` 630732a is live with 19 games; open review PRs (#78 code-audit hardening, trivia specialist packs, party prompts v4); the Render auto-deploy vs `render.yaml` mismatch. It supersedes deploy and game-count statements in the 24 November files.
