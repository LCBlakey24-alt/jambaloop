# Rare Find — original live-room rarity game (draft v1)

New games default to the [research panel pack](RARE_FIND_PANEL.md). The rules below describe the optional room-rarity format.

**Brand:** Jambaloop, a Rookie Quest Games production.

**Branch:** `feature/17-rare-find-answer-review` (stacked on the unmerged Top Answers work). **Not deployed, not yet approved for public release.**

## Concept

Each player tries to name a correct answer that nobody else in the **current room** gives. There is no external survey or fabricated historical popularity database. Answers are checked against explicit, finite catalogues (with aliases) and any unrecognised entries must be adjudicated by the TV host before the reveal.

## Rules

- **3–30 contestants**, **3, 5 or 7 rounds**. Everyone answers individually from their phone.
- Choose individual play or two to four balanced teams. Each player submits privately. Matches count across the whole room, including teammates. Team standings use the average cumulative score per member. Teams tied for the highest average share the win.
- The round begins with an original question/category. Players enter one answer of up to 60 characters, once per round.
- Normalisation is case-insensitive, Unicode normalised and punctuation-insensitive. Explicit aliases, such as **Aluminium / Aluminum**, count as one canonical answer.
- Once everyone has answered, or the TV host closes the entry stage, the server checks replies against the catalogue.
- If all submitted answers are recognised, the game moves directly to the reveal. If any are unknown, it enters a **host-only review** step.
- The host can reject an unrecognised entry, accept it as a new valid answer, or **map it to an existing catalogue answer** (crucial for synonyms so they are not falsely treated as unique).
- Review decisions are recorded in the room's audit log, with the answer, decision, canonical match, host actor and timestamp.
- **Valid unique answer:** 200 points. **Valid answer chosen by exactly two people:** 100 points each. **Valid answer chosen by three or more:** 50 points each. **Invalid answer, or no answer:** zero.
- These are literal group sizes from the **people who submitted answers in that round**. The number of votes and size of groups are real, not invented. Tied overall winners share the top step.
- A host-approved answer is flagged as **host-reviewed**, not silently represented as independently verified. A reviewer should check a legitimate source before approval.
- Host can advance a stalled round; unanswered entries get zero. Only the TV host can approve/reject answers or advance during gameplay. Players remain in the room after each round and at rematch.

## Answer content

The initial bank contains **34 original prompts** built from finite-answer topics such as the eight planets, the oceans, constituent UK countries, US state names, chemical elements and element groups, SI units, Olympic ring colours, chess pieces, months, zodiac signs, and standard game symbols.

Each entry includes a canonical answer set, optional aliases, stable question-history ID, and an official source link for source-dependent topics where one was confirmed. General calendar, mathematics, and notation entries are manually curated.

Source anchors include:

- NASA: https://science.nasa.gov/solar-system/planets/
- NOAA: https://oceanservice.noaa.gov/facts/howmanyoceans.html
- ONS: https://www.ons.gov.uk/census/2011census/2011ukcensuses/ukcensusesfrequentlyaskedquestions
- US Census: https://www.census.gov/library/reference/code-lists/ansi.html
- IUPAC: https://iupac.org/what-we-do/periodic-table-of-elements/
- BIPM: https://www.bipm.org/en/measurement-units
- IOC: https://www.olympics.com/ioc/faq/olympic-symbol-and-identity/what-is-the-meaning-of-the-olympic-rings
- FIDE: https://handbook.fide.com/chapter/ChessEquipmentWithoutElectronicComponenets032026

**Content limitation:** The finite lists in this starter pack are intentionally narrower than general free-form trivia. Never claim they accept all conceivable legitimate answers; host review handles omissions. A production launch should review all prompts/aliases with a human fact-checking checklist and ensure no ambiguous wording is unfair to contestants.

## TV and phone flow

1. Launcher: Rare Find preview, original emerald-and-gold styling, preview instructions, 3/5/7 setup.
2. Lobby: distinctive Rare Find title art, join QR, players and game rules.
3. Entry: TV displays a full-screen challenge and locked response count; phone has a single private input and lock confirmation.
4. Host review if required: only host sees raw unrecognised answers and review action choices; player phones show a neutral waiting message.
5. Reveal: TV shows accepted canonical answers, the real matching groups, points per contestant, unaccepted answers and a reference source where one exists.
6. Finale: full leaderboard, shared winners, rematch and playlist continuation.

The interface uses accessible text labels, semantic status updates, touch-sized controls and reduced-motion alternatives. Host review lists and reveal groups scroll inside the TV stage. The phone form and result rows can expand vertically.

## Test plan

- Validate all catalogues, alias uniqueness and unseen-first selection.
- Test exact canonical answers, spelling/case variations, incorrect inputs, duplicate and stale submissions.
- Test that no answers or outcomes leak to the host before review, nor to other players before reveal.
- Test that only the host can review, and that a known canonical match combines groups correctly.
- Test rejecting unknown answers and that all host decisions remain auditable.
- Test skipped players, host-closed rounds, zero-score cases, 30-person capacity and rematches.
- Browser-test a full **three-round match** with both TV and phone at **1280×720, 1920×1080, and 1024×768**, recording screenshots at entry, host review, reveal and result stages.
- Run the full Jambaloop Node/gameplay and existing multi-game browser suite, fixing any regressions rather than disabling tests.

## Roadmap

Future versions may add curated larger packs, a stricter disputes queue and explicit source lookup per accepted answer, time-limited review with moderator handoff, special rarity bonus rounds, player-set competitions and better final podium animations. An AI-only validator must **never** silently determine right/wrong for public games without a source-backed review path.
