# Jambaloop: content expansion and release checklist

**Applies to:** all future Rookie Quest Games / Jambaloop feature and polish pull requests.

## Product principles

Jambaloop should not become a game people can memorise after a few evenings. Every substantial feature, gameplay or visual-quality iteration should assess content needs **at the same time as code changes**, adding fresh well-written entries to the relevant banks. A pure security hotfix can be exempt, but must not introduce bad content merely to meet a quota.

**All new content must be original**, suitable for family play and reviewed for the intended age range. Never copy the distinctive questions, scripts or set dressings of existing television game shows.

## Content types and locations

| Format | Source location | Important constraints |
|---|---|---|
| Classic, Wheel, Board, Dice, Knockout, Showdown, Potato and Quiz Race | `question-expansion-v2.js`, `questions.js`, `verified-questions.js`, `extra-questions.js` | Correct answer and distractors distinct; four choice options, 2 boolean options, bounded numeric results, unambiguous chronological/ascending ordering |
| New subject genres | `public/game-config.js`, `question-expansion-v2.js`, `board-questions.js` | Register every format, category grouping, Board Race levels 1–6, and a source-review plan |
| Same Page | `creative-expansion-v2.js`, `same-page.js` | Short open-ended prompts with multiple plausible answers; fair normalization |
| Punchline Party | `creative-expansion-v2.js`, `social-games.js` | Original prompts, varied settings and family-friendly humour |
| Fill the Blank | `creative-expansion-v2.js`, `social-games.js` | Exactly one `____` gap; all response cards should fit naturally |
| Fork in the Tracks | `creative-expansion-v2.js`, `fork-game.js` | Cards must work as noun phrases in all team combinations and preserve good/bad distinctions |
| Spot the Bluff | `creative-expansion-v2.js`, `party-games.js` | Familiar questions with enough plausible answers; no secret prompt on the TV |
| Top Answers | `creative-expansion-v2.js`, `top-answers.js` | Subjective questions with exactly four distinct options; percentages must be calculated only from the actual room votes |
| Rare Find | `rare-find-bank.js` | Finite, complete canonical answer lists; no ambiguous category boundaries; stable aliases; official source references for specialised factual sets |
| Brain Ladder | `brain-ladder.js` | Independently calculable answers; one correct option, three distinct alternatives, explanation and appropriate level |

## Review steps for every future content change

1. Decide which games and question genres need variety. Prioritise the smallest banks and modes which players replay frequently.
2. Add a batch of original entries, preferably several per affected genre, and document exactly how many. Do not inflate the numbers with trivial rewordings of the same answer.
3. Check each real-world factual claim against a reliable source. Source metadata can be added to the verified bank **only after the source is actually checked**. New v2 evergreen questions are *editorially authored*, **not independently source-verified**.
4. Run `node --test` including `test/content-expansion-v2.test.js`. The new content audit rejects duplicates inside batches, malformed answers, missing topics, out-of-bounds numerical answers, and incomplete board difficulty maps.
5. Run responsive browser tests. At desktop widths >= 1100px and height >= 700px, all 17 game tiles should be visible without scrolling; smaller screens intentionally paginate to keep controls readable.
6. Play a representative full game using actual phones and a host TV, including unusual accents, duplicate names, reconnections, three rounds in one game night, and rematches.
7. Record remaining uncertainties and review decisions in the draft pull request; do not claim that automated validity checks prove every trivia answer is factually correct.

## This batch (23 November 2026)

- **112** original new multiple-choice prompts across all previously offered subjects plus two new ones, Words & Language and Maths & Numbers.
- **30** new true/false statements, **12** numerical estimation questions and **12** ordering questions, concentrated on the two new genres.
- **227** new creative prompts and cards across Punchline Party, Fill the Blank, Same Page, Spot the Bluff, Fork in the Tracks and Top Answers.
- **6** finite-answer Rare Find prompts.
- **60** extra original algorithmic Brain Ladder variants (180 -> 240).
- New content is additive to the existing bank and uses its current no-repeat preference. It is not a guarantee that a question can never recur after a bank is exhausted.

**Release note:** Numbers above are authored additions, not a claim of independent source verification or real-player playtest success. The release candidate is a draft until review and green CI.
