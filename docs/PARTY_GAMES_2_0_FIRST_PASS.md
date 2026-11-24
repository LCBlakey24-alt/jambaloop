# Party Games 2.0 — first gameplay update

## Scope
Punchline Party and Fill the Blank only. These two games **already support 3/5/7-round formats**; this update improves those existing choices, rather than rewriting the round engine.

## Changes
1. **Fairer ballot**: every valid submitted answer is now included (up to the game's configured room capacity), rather than choosing a random set of six. Players cannot vote for themselves. The host sees anonymous entries until reveal.
2. **Final-round stakes**: votes are worth 100 points in normal rounds and 200 points in the final round. The rules are visible on phone and TV. The server remains responsible for awarding all points.
3. **Fill the Blank hand refresh**: one optional free six-card refresh per round, before the player locks a card. The new hand excludes every item in the old hand and remains private to that player.
4. **Fresh content**: 30 original Punchline Party prompts, 30 original one-gap Fill the Blank prompts, and 40 original compatible phrase cards. Content is family-safe by default.

## Fairness / privacy controls
- All submitted entries can receive votes. Self-voting remains rejected by the server.
- The host/other phones never receive a player's private Fill the Blank hand.
- Redraw is denied after answer lock-in or a first redraw, and is validated against the game/round.
- Votes and writer identities remain hidden until reveal.
- The `shortlisted` count is always zero; no longer claim a random six-entry ballot.
- The existing continuous phone ballot layout keeps every choice reachable.

## Known trade-off
A 30-person room now has up to 30 ballot entries. This is fair but can be slower to read than a six-entry ballot. A later opt-in group tournament ballot could help larger groups if real playtests show that voting takes too long. Do not silently discard entries or pretend unshown entries have a chance to score.

## Quality gates
- Original content/structure checks and uniqueness validation.
- 30-player anonymous ballot integration test with all entries scored.
- Card refresh privacy, one-use limit and replacement quality.
- Three-round game verifying 100 / 100 / 200-point rounds.
- Full existing Node, content and browser suites.
- Live mixed-device group test before claiming large-room release readiness.

## Deployment
Jambaloop Render is currently configured to deploy each new commit on `main` automatically. Work on feature branches does not deploy, but **merging a PR into main does**; only merge after CI passes and preferably when no live family room is running. Server room state is in memory and is lost on deployment.
