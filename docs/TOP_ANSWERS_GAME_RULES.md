# Top Answers — original live-room survey game

**Product:** Jambaloop, a Rookie Quest Games production.

**Status:** Draft game on a feature branch. Not deployed. This is an original game format inspired by the broad idea of survey/popularity party games; it does not use another programme's brand, questions, imagery, music or fictional statistics.

## Core principle

The **only** poll counts or percentages shown are the votes actually cast by players in **this room, during this round**. There is no pre-recorded public survey and no claims such as "100 people said..." or percentages from a fictional audience.

## How to play

1. Choose a **three-, five- or seven-round** match, with **3–30 players**. The game is individual, not automatically organised into teams.
2. **Poll stage:** Every player privately chooses their personal preference from four original options. A player's vote is locked and counted once.
3. **Prediction stage:** Everyone privately predicts which of the four options got the most votes. No aggregate results or participant choices are revealed yet. Players may predict the option they voted for.
4. **Reveal stage:** The TV displays four real vote counts and percentages using the actual number of responses received, highlighting the most popular option(s).
5. **Scoring:** A correct prediction of **any joint most-popular answer** earns 100 points, plus 20 points for **every actual room vote** that option received. Predicting a lower-ranked option earns 20 points per vote for it but no 100-point bonus. Prediction is optional; unanswered predictions score zero. An unanswered poll contributes no vote.
6. The host can close a slow poll or prediction stage early. If no one voted, there is **no top answer** and no imaginary points, regardless of predictions.
7. After all selected rounds, total scores decide the winner. Ties share first place. Rematches reuse the same room and prioritise previously unseen questions.

Examples: Three real voters choose A, A, B. If you predict A, you earn 100 + (2 × 20) = 140 points. If you predict B, you earn 20 points. If all voters choose different answers, all answers with one vote share the top position; each such predicted answer scores 120 points.

## Prompt library and privacy

- The first edition includes **80 original subjective prompts**, each with four plausible responses. Subjective answers do not claim a factual correct option and therefore do not need outside factual references or fake poll citations.
- Questions are fresh-first, using the current room and previous device question-history IDs. Once all 80 have been played, repeats are possible; add more audited prompts over time.
- The server checks joined player identity, active game and round, correct phase, option range and one submission per player. Stale and duplicate requests are rejected.
- During poll and prediction, the TV and other players see only submission totals, not secret votes, predictions, option popularity or correct leader IDs.
- At reveal the TV shows **aggregate counts only**, without identifying who chose which option; players can still see their own selection.
- The interface calls the results **Live Room Poll**, uses 'actual votes' language and never implies external survey sampling, national consensus or a demographic benchmark.

## Display design

- TV stage: aubergine/violet and gold visual identity, a clear four-option question board, no bars visible until reveal, animated real count bars, numerical results, top choice highlight and full final standings.
- Phone stage: touch-friendly options, distinct poll and prediction phases, lock confirmation and personal round score.
- TV host may manually advance stalled rounds without using player answer controls. Phones must reconnect to their own room and not leak other players' choices.
- Accessibility: reduced-motion support, high contrast, visible button focus, semantic status messages and text counts/percentages beyond decorative bars.
- Test 1280×720 and 1920×1080 TVs, 1024×768 landscape tablet, and 390×844 phone. Tests cover a three-round full match plus menu setup.
- Screenshots and audit JSON are retained as CI artifacts.

## Future extensions

- Optional **team guessing / steal** mechanic, where the TV stages a true game-show face-off. That should remain a distinct scoring variant rather than being mixed into the first solo survey mechanic.
- Larger prompt packs and optional in-room voice poll; real, consented externally collected survey packs could be supported **only** with sample size, source, date and proper rights metadata.
- Better animated sequential count reveals and local multiplayer insights without exposing private participant-vote mappings.

## No live deployment

This feature is stacked on the earlier draft Jambaloop PRs and must be reviewed, tested and explicitly approved before merge or deployment.
