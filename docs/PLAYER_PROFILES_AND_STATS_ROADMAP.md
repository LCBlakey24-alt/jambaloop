# Future proposal — Jambaloop player profiles, saved stats and TV spotlights

**Status:** FUTURE DESIGN ONLY. Nothing in this file implements accounts, a database, authentication, persistent room state or a new game mode.  
**Owner's goal (24 Nov 2026):** When players eventually create accounts, remember how many games they've played and won; show their success by game and, optionally, a fun pre-game statistic or win-rate comparison when family or friends join.

**Tracker:** [Issue #59](https://github.com/LCBlakey24-alt/jambaloop/issues/59).  
**Prerequisites:** Stable existing 18 modes, single-screen phone controls [#45](https://github.com/LCBlakey24-alt/jambaloop/issues/45), room/Render restart resilience [#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41), account security and UK privacy/age review.

## What the player sees

**Optional My Stats** (only for signed-in users; private by default):

- Overall: **games completed**, **games won**, **joint wins/draws**, **team wins** tracked separately, attendance/session count, recent form and personal bests.
- **By game:** games played, wins, shared wins, historic win %, personal best score where that score means something, dates and recent results.
- **Achievements** later: a first win, first win in a new game mode, consistent participation, a streak, a personal best. Focus on positive, non-addictive recognition; no pressure to complete daily streaks or play excessively.
- **Recap:** optional “Your games night” summary after the session with matches played, wins, mode highlights and an opt-in share card.
- Guest mode: **players keep joining with room codes without a login**. An account is never compulsory for family play; they can sign in between games, not during a timed phone action.

**TV introductions (later opt-in):**

- When the host starts a game, show a short public stat *only with that player's express choice*: “Alex — 8 wins from 20 completed Dice Rally games (40% historic rate)” or “Bailey has won three of their last five Quiz Race matches.”
- Keep language friendly (“form guide” or “historical record”), not “guaranteed to win” or “weakest player.” Allow **Hide my statistics** and per-room visibility controls. Never show email, legal name, birth date, private history or accounts of non-consenting players.
- **Phones stay controllers:** no scrolling profile pages during live questions. A small profile indicator and optional post-game My Stats link are enough. The TV remains the main game-show display.

## Win-rate versus a prediction

A past win rate means **wins / eligible finished matches for that mode**, with the actual sample size always visible. For example, “8/20 (40% historical)”. It is **NOT** a calibrated 40% chance of winning the next game: player count, opponents, teams, game modes, player selection and randomness change the odds.

If a later version offers a playful “who might win tonight?” estimate:
1. Require a meaningful sample, e.g. at least 10 comparable completed matches before even showing a rough historic rate; this threshold is a product proposal, not a statistical guarantee.
2. Keep solo, team and different modes **separate**; never combine points from unrelated games into a single invented skill score.
3. Present a sample size and prominent “Just for fun; based on past games, not a prediction” qualification.
4. Don't infer profiles or relative skill for unknown-age guests, and don't surface predictions for children without additional product/age/privacy review.
5. Make the entire TV comparison optional. Early versions should show historical stats only, not algorithmic win probabilities.

## Stats rules to specify per existing mode

Each mode needs an audited **result mapping**, not a single generic “max score wins” shortcut:

| Result type | Planning rule |
| --- | --- |
| Individual competitive | Count one completed game played; determine winner(s) from server-authoritative final results, including ties |
| Team competitive | Keep team victories in a separate category; a team member receives participation + team-win credit only if eligibility rules are met |
| Shared-tie / multiple winners | Define joint victory separately from sole first place, consistently per game |
| Cooperative games / no single winner | Credit participation and collective success/completion, not a fictional individual win |
| Host-only, spectator, early departure | Define eligible participation threshold; do not grant credit for controlling TV |
| Aborted/deleted match, incomplete room | Do not count as completed or awarded |
| Rematches and game-night playlists | Each actual completed game instance counts once; the overall event is a separate session record |

Before coding, review **all 18 modes** and explicitly enumerate winners/participation/ties/no-winner rules in tests. The final score displayed on the TV may be inappropriate for cross-game comparison.

## Required technical design (no system selected yet)

- **Accounts:** optional; investigate passkeys/email and potential Google or Microsoft sign-in only after choosing a secure service and reviewing cost and privacy. Third-party login does not prove age. Never demand a new account just to join a friend.
- **Database:** a persistent, access-controlled store for consented stats only. Keep long-term player records separate from **live room** state and the Render in-memory-room fix (#41). No database or provider has been selected or paid for.
- **Server-authoritative event:** after a match really finishes, record a *single immutable/idempotent* result per game-instance ID and account ID; reconcile exactly-once on reconnect/replay/crash. No client-submitted “I won!” fields.
- **Identity:** stable account ID; keep transient room tokens separate. The same nickname does not prove identity. If someone registers mid-party, never claim other guests' or old sessions' stats automatically.
- **Example minimal data:** account ID, nickname, optional chosen avatar, game-instance ID, mode, completed timestamp, participant count, playing style, team membership (if relevant), outcome, comparable in-mode score where meaningful. Derive aggregate stats; no raw quiz answers, personal secrets, card hands, private role allocations or hidden content.
- **Privacy:** profile data private by default; separately opt in to group stats, TV introductions, historical leaderboards and share cards; opt-out in one place. Minimal retention, access controls, deletion and export. Do not expose profile identifiers/email in TV state or multiplayer APIs. Apply appropriate UK privacy and age-appropriate-design safeguards at actual implementation.
- **Safety:** avoid broad public rankings, negative labels, social-pressure notifications or addictive streak prompts. Guests and younger players should see a default-private, family-friendly experience.

## Delivery phases — after reliability and mobile QA

1. **Rules and privacy design:** verify all 18 modes' win definitions, classify team/individual/co-op/no-winner results, write data and consent lifecycle, determine age/account approach.
2. **Personal private stats MVP:** voluntary account, secure sign-in, server-only idempotent completed-match history, simple private per-game dashboard. Guest-only joining unaffected.
3. **Achievements and recaps:** carefully curated badges, positive highlights and a post-games-night recap.
4. **Opt-in TV player introductions:** minimal public stats with player control; never reveal more than permission allows.
5. **Optional form guide:** if evidence supports it, show past records with sample sizes and caveats before exploring prediction. Do not create a numerical “chance to win” based on a handful of games.

## Tests before implementation can ship

- Complete/replay/refresh/disconnect/restart creates exactly one completed result; abandonment counts none.
- Cross-account authorization, token abuse, identical names, account linkage, deletion and withdrawal of display permission.
- Ties, team wins, equal scores, no-winner modes, aborted games, switching games without finishing, and historic records after game rules change.
- Player profile hidden on TV and other clients by default; an opt-in TV stat is displayed only when appropriate.
- All guest flows still pass, phones retain one live-action screen, low-spec/landscape mobile works.
- Accurate sample sizes and formulas; distinguish *historical win rate* from predictive probability.
- Review UK privacy, children and age-assurance implications and budget before choosing an auth/database provider.

**Do not start implementation as part of a code-quality PR or merge this documentation into production during an active room.** Render auto-deploys `main` and can restart in-memory sessions.
