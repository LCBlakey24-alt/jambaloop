# Jambaloop — release integration / stacked PR merge audit

**Prepared:** 23 November 2026. **Status:** Draft integration only — no merge or deployment authorised.

## Current branch layout

GitHub has nine open draft PRs as of this audit:

| PR | Branch | Base | Status / role |
|---|---|---|---|
| #2 | `codex/01-multiplayer-hardening` | `main` | Early reliability/security changes, based on an older 11-game tree. Selectively ported into integration branch, not safe to overlay wholesale |
| #3 | `design/02-jambaloop-home` | `main` | Earlier landing-page concept, diverged from the now-tested 17-game launcher. Retain for archival/design comparison, **do not blindly merge** |
| #5 | `feature/04-quiz-race-mvp` | `main` | Core new-game and quiz-race line, already includes merged changes from historical #7/#8 |
| #11 | `feature/10-player-scale-and-trolley-polish` | `feature/08-board-fork-paths` | Improved player journey, fork and quiz race; line diverged from two additional #5 commits |
| #17 | `feature/12-same-page-tv-broadcast` | `feature/10-player-scale-and-trolley-polish` | Same Page and broadcast refinements |
| #18 | `feature/13-spotlight-wheel-tv` | `feature/12-same-page-tv-broadcast` | Spotlight Wheel |
| #19 | `feature/14-rookie-quest-games-publisher-brand` | `feature/13-spotlight-wheel-tv` | Publisher identity |
| #21 | `feature/15-brain-ladder-logic-show` | `feature/14-rookie-quest-games-publisher-brand` | Brain Ladder |
| #22 | `feature/16-top-answers-room-survey` | `feature/15-brain-ladder-logic-show` | Top Answers |
| #23 | `feature/17-rare-find-answer-review` | `feature/16-top-answers-room-survey` | Rare Find |

**This draft integration branch** `feature/18-release-integration-reliability` stacks on #23 and is intended for its own draft PR. The latest feature line descends from `main` and includes the work of the stacked game line. PR #2 and PR #3 are independent *diverged* old lines, not separate steps that can safely be merged after the game stack without reconciliation.

## Existing CI evidence

- Rare Find PR #23: all three applicable checks passed on commit `094a3193c2ef86ff6d0c2793948c8271d6372891`.
- Its browser acceptance completed 3-round TV + phone tests at 1280×720, 1920×1080 and 1024×768, and the launcher all-mode test showed 17 initial game stages.
- This integration branch **must run its own full CI**, including server API, browser room/photo, 17-game launch, and all gameplay regression suites; the #23 green build does not automatically certify the later security changes.

## What this integration branch ports from PR #2

- Per-source-IP bounded creation/join request budgets; configurable max rooms and idle TTL with cleanup.
- Avoid anonymous traffic extending the room's idle retention.
- Check that user photos actually have JPEG structure (rather than only a data-URL extension).
- Require a joined member key to fetch an avatar; render through an authenticated same-room fetch on clients.
- Normalised Unicode display names with maximum length and control-character protection.
- Retain one active live NDJSON stream per joined key; duplicate tabs poll/retry instead of claiming two streams.
- Reject stale lobby settings/start actions; support form version snapshots.
- Safe recovery from invalid session storage, API errors in JSON, and focused lobby controls surviving roster renders.
- Targeted API and helper regression tests.

This is a **selective modern port**, not a literal merge of #2: we retained the newer LAN invitation interface selector and all original games, which the old #2 commit predates. A final review should check if PR #2 contains any remaining non-ported valuable tests or behavior before it is closed as superseded.

## What is left from PR #3?

The current launcher has its own TV-first dark theme, mode-specific previews and 17-game pagination. PR #3's older marketing-hero implementation and styling conflicts with this newer layout. **Do not overlay its old `public/app.js`, `public/index.html`, or styles onto the current branch.** Review its design notes/screenshots and archive only after user approval.

## Recommended integration strategy

1. Keep the current live family-test website and its hosting branch unchanged.
2. Obtain full green CI on this integration branch and manually inspect the code diff. If it is not green, fix the cause before continuing.
3. Review and preserve any **unique** still-relevant #2/#3 changes not yet in the new line; do not cherry-pick obsolete CSS or rewrite current pages.
4. Create a **release-candidate PR from the vetted integration head into `main`** (or explicitly rebase the draft integration PR onto `main` after review). Verify the cumulative diff, merged ancestry, and deployment protections; do not accidentally bypass or overwrite any PR.
5. After the user explicitly approves merging, merge the candidate into `main` using the agreed approach. Avoid simultaneously merging the old independent #2/#3 with newer implementation.
6. Only after verifying successful integration on `main`, close superseded or already-included draft PRs with an explanatory note; do not delete the source branches before an audit.
7. Deploy to a staging service and run a real-TV/real-phone group playtest. Production deployment requires a **separate explicit approval** and its own health and rollback plan.

**Alternative:** Merge the stacked PRs one at a time in dependency order (#5, #11, #17, #18, #19, #21, #22, #23, integration), changing each PR's base to `main` and resolving divergence after every step. This is more complex and has extra conflict risk; do not merge each PR into its historical feature base and assume that updates automatically reach `main`.

## Known blockers / risks to test

- Rooms live only in one server process's memory. Restarting, rolling out, or using multiple replicas can lose active games. Persisted shared-room infrastructure is not yet part of this product.
- High-player-count reliability is **not** validated by browser emulation. The starter photo size and rate limits are intentionally conservative.
- Human fact-review is still required for all new trivia sets and host-approved Rare Find answers.
- Optional avatar access is now credential-protected but needs a tested photo/real-device browser path.
- Verify real group joins, host/phone reconnections after switching Wi-Fi, phone keyboard positioning, and 720p projection legibility.
- If deployment is on Render, the repository's `render.yaml` targets `feature/04-quiz-race-mvp` with automatic deploy **off**. Merging `main` alone does not switch that deployment branch. Confirm the actual hosting UI before making changes.
- Before public marketing or broad distribution, review privacy/retention notices, image uploads, abuse controls, content sources, and accessibility.

## Decision

**Do not merge PRs or deploy until the user explicitly authorises a reviewed candidate.** Recommended next action after green CI is presenting the vetted cumulative PR and confirming: integrate into `main` only, or both integrate and manually deploy a test/staging site.
