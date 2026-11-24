# Claude Code handoff — Jambaloop, 24 November 2026

**Purpose:** When the user's Claude Code access returns, use this file and [../README.md](../README.md) to continue improving the existing Jambaloop repo. No separate "new site" is required. The user's intent is to make the current 18 modes reliable, polished and replayable, steadily expand original content, and prototype distinct future modes without cloning third-party games.

## Verified baseline (at the time this handoff was prepared)

- Repository: `LCBlakey24-alt/jambaloop`; primary branch: `main`.
- Last observed `main`: `cb780155e28324bbbe9e4fdebddf69d73b780b4d`, from merged PR #39. **Recheck** SHA, branch, issues, PRs and CI at run time; this snapshot will age.
- Current `public/game-config.js`: **18 playable modes**. A mention of 17 in historical documents is stale. Do **not** count future designs as active tiles.
- Site: [jambaloop-family-test.onrender.com](https://jambaloop-family-test.onrender.com). Render service `jambaloop-family-test` uses `main` and `autoDeployTrigger: commit` (auto deploy on every main commit). Previous known-good deployment on 24 Nov was `cb780155`. Recheck Render before announcing any release.
- Technology: Node.js 22, Express 5, in-memory multiplayer room state, REST and NDJSON live updates, vanilla JavaScript DOM frontend, Three.js for dice/board scenes, `npm ci` and `npm test`.
- The most recent gameplay change (PR #39) passed **146 Node tests** and the full configured browser suite before merging. It added 100 family-safe Punchline/Fill the Blank entries, complete ballots instead of six-person exclusion, a one-use private Fill the Blank six-card redraw, 100/200 points per vote on regular/final rounds, and fixes for stale card taps, empty vote phases and vanishing action errors. Do not reimplement these features.
- **Narration gap:** only three real MP3 assets have been confirmed in GitHub; 15 separately prepared ElevenLabs recordings are *not* yet incorporated. Scripts/documentation are not proof that the audio bytes exist. Never mark all 18 recorded intros complete until the assets are present and playable.
- README and some older audits contained historical descriptions; newer code and current test evidence take priority. Keep README accurate when features land.

## Source-of-truth reading order

1. Root [README](../README.md) — how to run, what currently ships, repo workflow.
2. [Game expansion roadmap](GAME_EXPANSION_ROADMAP_2026.md) — uniqueness gate, existing and future game ideas.
3. [Game rules audit](GAMEPLAY_RULES_AUDIT_2026.md) — ideas; many historical "not yet built" claims are stale.
4. [Content expansion playbook](CONTENT_EXPANSION_PLAYBOOK.md) and [release readiness](RELEASE_READINESS_2026-11-23.md).
5. [Party Games 2.0 first pass](PARTY_GAMES_2_0_FIRST_PASS.md) and relevant **current code** / tests.
6. [Bloodmoon Council concept](BLOODMOON_COUNCIL_DESIGN.md) + [#43](https://github.com/LCBlakey24-alt/jambaloop/issues/43) — PLANNED, not built.
7. [Secret Suspects](https://github.com/LCBlakey24-alt/jambaloop/issues/42) — PLANNED, not built.
8. [Live-room persistence](https://github.com/LCBlakey24-alt/jambaloop/issues/41) — confirmed operational risk.
9. [Hot Potato / Spot the Bluff improvements](https://github.com/LCBlakey24-alt/jambaloop/issues/40) — next targeted gameplay depth.
10. The latest open issues, current branches, CI results, actual deployed commit and relevant source files.

## What the user wants Claude Code to accomplish

**Do multiple small, fully finished, independently reviewed PRs, not a giant untested rewrite.** Fix real bugs and reliability issues, improve every player's interface and host TV layout, and enlarge original trivia and party content with dedupe and editorial quality. Preserve the 18 existing games and their distinguishing mechanics.

### P0 — release correctness and multiplayer stability

- Inspect open PRs, status checks, logs and latest deployment before working. Do not replay old PR plans without verifying current implementation.
- Confirm live session creation, code/QR joining, captain/ready state, room authentication, game/round identifiers, disconnected players, SSE reconnect, vote privacy, pause/resume and rematch. Add tests reproducing **specific observed issues**.
- **Auto-deploy is on.** Every merge to `main` can restart the service and destroy rooms because `server.js` uses `rooms = new Map()`. Review [#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41); do not promise persisted rooms or switch to expensive services without approval. Avoid merging during an active session.
- Audit game input serialization/HTML escaping, role/vote/answer leakage, stale action submissions, double scoring and late joins. Examine current protected avatar, origin, rate-limit and stream code before claiming older audit findings remain unfixed.
- Add an end-to-end test for each high-risk uncovered flow: expiry, reconnect during night/vote, no submissions, one eligible voter, ties, result/replay, network loss and TV host interaction.
- Release only after `npm test`, game/content QA and the full responsive browser workflow are green; an automated pass is not a real mixed-device family playtest.

### P1 — quality and replayability of existing modes

- Complete [#40](https://github.com/LCBlakey24-alt/jambaloop/issues/40) as **separate** small changes: Hot Potato 1/3/5-match formats, 60/120/180-second clock, cumulative catches and least-caught victory; Spot the Bluff timed discussion, strict hidden-role security, role rotation and meaningful multi-round play. Confirm existing 3/5/7-round Bluff format before modifying.
- Keep improving phone controller layouts at 390×844, 844×390 and 320px; TV no outer scroll at 1280×720 / 1920×1080; tablets landscape. Visible statuses, accessible targets, contrast, focus, reduced motion and replay buttons must work across all modes.
- Make gameplay decisions distinct: Wheel limited-use rerolls; Dice Rally one tactical reroll; Knockout extra lives/rescue; Quiz Race Grand Prix; Classic Quiz strategic finale; Board Race event tiles after measuring fairness. Introduce **one isolated ruleset at a time** with tests.
- Ensure question/prompt no-repeats where possible, honest category-specific content counts, enough content to support configured game length, and continually add original game-specific prompts and verified trivia in small batches.
- Check whether a planned idea is functionally redundant before approving a new tile. Avoid adding superficial reskins.

### P2 — next two original game concepts

1. **Secret Suspects** [#42](https://github.com/LCBlakey24-alt/jambaloop/issues/42): all stories are **true**; anonymous voluntary private submission; rotating unprivileged reader; discussion; private vote for owner; +1 to correct non-owner guesser; +3 to secret owner only when **no other player** identifies them; prevent secrets/ownership leakage until reveal. Family-safe opt-outs, no permanent sensitive storage. Stage through design, tests, engine and player/TV screens.
2. **Bloodmoon Council** [#43](https://github.com/LCBlakey24-alt/jambaloop/issues/43): working-title vampire social deduction. Persistent night/day phases, hidden Vampires/Oracle/Warden/Villagers, private phone role actions, day elimination votes, non-graphic family-safe TV narration and explicit team win conditions. See complete state/privacy/testing spec [here](BLOODMOON_COUNCIL_DESIGN.md). **Not just Spot the Bluff with vampire artwork**. Do not add to game list until end-to-end functional and tested.

Both concepts are **planning-only** and should have standalone small design/engine PRs before UI and publication. Their final branding must be original and commercially reviewed.

### P3 — additional backlog

- Current [game roadmap](GAME_EXPANSION_ROADMAP_2026.md): Sketch Relay, Clue Circuit, Mini Mayhem, Letter Panic, Escape Together, Mind Spectrum; additional candidates Doodle Detectives, Risk Vault, Picture Perfect and Case Closed.
- Word Weld (also known in prior discussions as Word Fusion/Word Smash-type mechanic; see [#29](https://github.com/LCBlakey24-alt/jambaloop/issues/29)), Signal Jam [#30](https://github.com/LCBlakey24-alt/jambaloop/issues/30), and sourced real-stat **More or Less?**. Do not duplicate a game simply because a different TV show inspired it.
- Later: safe Friends & Couples Truth or Dare and Who Knows Me Best?, optional family/teen/adult metadata and UK-compliant age assurance. **Do not ship adults-only mode or accounts before legal/privacy architecture.**
- Update three categories continuously: verified multiple-choice/true-false/number/order questions, source-checked genre packs, and original creative prompts/phrase cards. Don't claim estimates (such as global doors vs windows) are sourced facts.

## Coding and verification guardrails

- For each issue: verify the bug exists on latest `main`; write a failing test first; implement minimal fix; run all affected tests; add browser acceptance on actual phone and host sizes; document known constraints; put into a descriptive feature branch and PR.
- Maintain original Jambaloop branding and the Rookie Quest Games publisher. Avoid copying Dropout, The Traitors, Werewolf commercial editions, Jackbox, House of Games or other third-party text, imagery, audio and distinctive branding; inspiration is in *general mechanics*, not assets.
- Privacy: strictly filter private cards, secrets, hidden roles, actions and player keys from host, spectator, wrong-player, SSE and logs. Server-authoritative scoring / timers. No persistent personal secrets without clear consent and a data-lifecycle decision.
- Respect free Render plan and no new paid API/dependency without approval. Keep 3D fallback, accessibility and performance; don't silently change already working rules, playlists, game identifiers, browser storage keys or player capacity.
- Before any `main` merge, recheck whether family rooms are active if possible; warn that deploy may terminate sessions. Never claim deployed until Render shows the target commit as **Live**.
- Update README, roadmap, design brief and test evidence when a feature is implemented. Label **planned / in PR / merged / deployed** separately.
- If context/credits run short: finish the highest-priority focused PR with tests and a clear next-step note; don't leave a breaking partial merge.

## Suggested first run of Claude Code

Read root `README.md`, `CLAUDE.md`, this handoff, current game-config, existing issues #40–#43 and GitHub Actions status. Assess the current live Render commit versus `main`. Present a short severity-ranked issue list with file/line references. Fix the **highest-impact reproducible gameplay/reconnect bug** with targeted regression tests, then propose the next isolated gameplay PR. Only after reliability is stable begin the new Bloodmoon Council and Secret Suspects design/engine branches. Keep implementation and merge separate from mere planning.
