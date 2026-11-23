# Brain Ladder — Original Jambaloop Logic Game (Draft v1)

**Product:** Jambaloop, a Rookie Quest Games production.

**Status:** Implementation on feature branch. Not merged into main or deployed.

## What the game is
A shared TV logic-and-reasoning elimination game where everyone gets the same original puzzle on their phone, with level-by-level difficulty progression. It is **not** a reproduction of The 1% Club and never asserts that a puzzle is answerable by a given percentage of the population.

## Game rules

- **2–30 participants**; choose **5, 7 or 10 levels**.
- Every contestant begins with **two lives**.
- Each level gives all surviving players one of four choices; they answer privately on phones.
- Each correct answer earns **80 + (20 × level)** points (100 on level one, 280 on level ten).
- Each wrong, missed, or unsubmitted answer at reveal loses one life; two lives lost means elimination.
- Eliminated players remain in the game room as spectators and cannot answer again until the next game.
- Answers remain hidden from the TV and other players until everyone eligible has submitted (or the host reveals manually).
- The shared TV shows a vertical progression tower, survivors, the current puzzle, reveal, calculation and final rankings.
- A room ends when all selected levels are completed **or** nobody survives. High score wins; tied scores share the victory.
- If a contestant becomes disconnected, the TV host can reveal manually; an omitted answer counts as missed at reveal.
- The app allows an untimed reasoning round; no misleading countdown is shown. It can eventually support an optional server-authoritative countdown with grace periods.

## Puzzle-bank design
- **180 original, deterministic, machine-checkable logic puzzles:** 18 versions at each of 10 levels.
- Ten families: equal-step arithmetic, geometric sequences, weekday offsets, equal groups, alternating jumps, reverse-equation solving, offset squares, cyclic colour order, consecutive odd-number totals, and pairwise handshakes.
- Every puzzle has four distinct answer options, one computed correct answer and a concise calculation/explanation.
- The server shuffles answer order independently each time and stores the only correct index.
- New questions are selected unseen-first using stable prompt identifiers. History stored on a device discourages repeating puzzles in later sessions. After its deck is fully exhausted, the mode may reuse puzzles.
- Difficulty is an **editorial progression** based on reasoning complexity, not an empirically measured success-rate percentile. This bank should receive human usability review and difficulty calibration before a public claim that later puzzles are reliably harder for a given audience.
- No scraped TV show questions, copyrighted TV graphics or fabricated official statistics.
- Because this is mathematical/logic-generated content rather than historical trivia, explanations and independently calculated correct outcomes serve as verification. Factual reference URLs are not invented.

## TV and phone journey
1. **Lobby:** original Brain Ladder cover, 5/7/10-level length, two-life rules, QR join.
2. **Puzzle stage:** left-hand vertical ladder of up to ten steps, four large answers on TV, no answer controls on TV.
3. **Private phone:** answer once, then wait for lock confirmation; eliminated participants see spectator status.
4. **Reveal:** correct answer glows, explanation appears, remaining-survivor count updates.
5. **Climb:** next step only if someone is still playing. No premature end-of-match screen before scores are counted.
6. **Final standings:** score, remaining lives, equal winners, replay or queue another Jambaloop game.

## Acceptance and further improvement
- Test both the 2-player minimum and all 30 players.
- Test all 180 puzzle variants for distinct answer options and their calculated solutions.
- Test privacy, duplicate submissions, early disconnect/host-advance behaviour, replay history and elimination.
- Browser-test 1280×720 / 1920×1080 / 1024×768 TV plus 390×844 phone, from lobby through a complete match.
- Check long mathematical questions and result screens for visual clipping at smaller resolutions and reduced motion.
- Potential future changes: recorded narration, optional lifeline, full ladder celebration, more non-numerical spatial/pattern puzzles, accessibility content review and community-calibrated difficulty tiers.

Brand placement: Jambaloop title first; Rookie Quest Games credited only as the production/publishing label per `docs/ROOKIE_QUEST_GAMES_JAMBALOOP_BRAND.md`.
