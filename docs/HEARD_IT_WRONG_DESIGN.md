# Heard It Wrong — music soundalike guessing game

**Working title:** Heard It Wrong  
**Status:** DESIGN / CONTENT PLANNING ONLY — not implemented or published.  
**Tracker:** [Issue #51](https://github.com/LCBlakey24-alt/jambaloop/issues/51)  
**Origin:** Creator's idea, including the supplied example **"Sweed Comb Alibaba" → "Sweet Home Alabama"**. Do not replace or silently misattribute that example.

## The hook

Show an invented funny-looking / funny-sounding phrase on the shared TV. Read it aloud as written and try to recognise the *actual song title* hidden in the sounds. The humour is in the phonetic mishearing, not in knowing obscure trivia about the artist. This is a **mondegreen-inspired** wordplay game, not an invitation to reproduce real commercial song lyrics.

A simple first release should use **original soundalike prompts representing short song titles** (rather than quotes from song verses). Do not include original lyric excerpts, sound recordings, instrumental samples, album art or official logos without cleared rights. A genuine *misheard lyric* variant using actual lyric lines/audio is a separate later rights-and-permissions workstream.

## Example rounds for editorial review

| Original phonetic clue | Correct song title | Source |
| --- | --- | --- |
| Sweed Comb Alibaba | Sweet Home Alabama | Supplied by project owner |
| Lettuce Bee | Let It Be | Invented draft soundalike |
| Darn Sing Green | Dancing Queen | Invented draft soundalike |
| Row Ling In The Jeep | Rolling in the Deep | Invented draft soundalike |
| Wand A Wall | Wonderwall | Invented draft soundalike |

**These are title soundalikes, not original song lyric quotes.** All invented examples require playtesting for recognisability and accurate answer/artist metadata. Never mislabel authored nonsense as a documented real misheard lyric.

## Provisional rules for an MVP

**Room:** Solo or individual multiplayer, suggested 1–12 players. Later teams if the game is genuinely better with them. Pick 10 / 15 / 20 rounds. A family-friendly Music category can filter by time period or difficulty, but do not hardcode narrow cultural assumptions.

1. Server picks an authored, unrepeated clue from a reviewed pool and withholds the correct title until reveal. TV shows the soundalike phrase in oversized type, a countdown and current round. Optionally play an **original spoken performance of the nonsense phrase** by the approved announcer if the audio file is actually available; no song excerpts are needed.
2. **Player phone:** four big **A / B / C / D** controls (the choices are readable on TV). For remote or accessible no-TV play, permit the full question/choice text on the phone. Player taps one answer, gets an immediate **LOCKED** confirmation, and waits; no extra phone page or scrolling for a normal choice.
3. After the configurable timer ends (suggest 20–30 seconds) or all active players submit, server reveals the correct song title; optionally a verified artist name and short independently worded trivia snippet. Television handles animations and leaderboard.
4. Suggested scoring: **100 points for a correct choice**, zero otherwise, with a *separately configured* speed bonus as existing quiz rules allow. Tie scores share rank. Avoid a scoring system that unfairly favours the fastest internet connection.
5. Optional second mode: player types the answer instead of choosing; exact normalisation and approved aliases are server-owned. Do not use uncontrolled fuzzy match that accepts different songs. The first release should prioritise reliable multiple choice.
6. Replay uses a new shuffled subset, avoiding already used clues when enough inventory exists. If a pack lacks enough unique questions for the chosen round count, offer a shorter match instead of silently repeating questions.

**Proposed difficulty:** Easy = short, well-known title and recognisable breaks; Medium = more transformed syllables; Hard = longer phonetically plausible title. Difficulty is based on human playtests, not an arbitrary character-count algorithm.

## MVP content and editorial pipeline

Goal: at least **60** unique, original phonetic-title puzzles before a 20-round public format is offered. For each entry store:
- Stable ID, original author provenance, exact source song title, artist/source metadata as needed, 1–3 accepted title spellings/aliases, region/era/difficulty and audience rating.
- The newly authored nonsense phonetic phrase, readable as UK English, and 3 independently chosen, plausible but unambiguously incorrect title distractors.
- Manual editorial flags for whether the phonetic clue is genuinely decipherable, title/artist is correct, answer is unique among offered choices, and no copyrighted verse or recording is embedded.
- Test-case IDs for accents/case/punctuation/apostrophes in typed answers, plus optional reviewed aliases. Prevent exact and near-duplicate prompts across packs. Ensure the database does not pretend a famous song is public domain just because its *title* is short.

Keep the first release **family-friendly** with no surprise adult or explicit themes. Avoid current chart hits where metadata is uncertain until checked. Make the music pack culturally broad (decades/genres, British and international artists), not a single playlist.

## TV / phone / tablet requirements

| Phase | Big TV / host display | Player phone/tablet controller |
| --- | --- | --- |
| Lobby | Game preview, short rules and room code | Ready; no instruction overload |
| Question | Big soundalike phrase, countdown, four song-title choices, round progress | Only A/B/C/D, short status, optional Help/expanded text |
| Locked | How many have answered (not who chose which option) | LOCKED / waiting; selection stays visible |
| Reveal | Phonetic clue → correct title, optionally verified artist and independent fact; score transition | CORRECT/WRONG and own points, no full duplicated leaderboard |
| Results | Podium and celebration | Your rank, your points, Rematch/Ready |

- One live player action per phase; no Back/Next mobile pager or horizontal scrolling. Aim for no ordinary vertical scroll at 390×844 or 844×390. Support 320px, landscape tablet and large text by adaptive sizes, not hidden choices.
- Optional **Read It Out** narrator button on TV, default captions and manually readable text. Narrator audio must be original and bundled; do not dynamically fetch the copyrighted song or promise the remaining ElevenLabs MP3 introductions are installed.
- Colour-independent feedback and assistive labels; keyboard focus rings; reduced-motion visual reveal, no flashing imagery. A typed mode must work when the soft keyboard is open.
- TV/host does not receive server answer keys before the correct reveal. Reveal is synchronized between all clients.
- Distinct soundalike visual identity (e.g. typographic word fragments) but avoid copying another television show's logo, cards or jingles.

## Uniqueness / how to place it in Jambaloop

- Versus **Music trivia**: success comes from **hearing through phonetic nonsense**, not recalling an artist/year/fact.
- Versus **Word Weld / Word Fusion**: no overlap of two answers; just one phonetic transformation.
- Versus proposed **Sound Scene**: no external sound identification; the clue is a created spoken phrase and text.
- Start by testing as a dedicated **Music & Wordplay game-format prototype**. Award a separate 19th launcher tile only if it creates a sufficiently distinctive repeated play loop; otherwise implement it as a prominent format under the current trivia system. Do not claim the new format exists until registered, tested and merged.

## Implementation and verification gates

1. Confirm format/brand name and document a fully deterministic question schema. Prototype 15–20 entries first in a **separate content/engine branch**; get feedback on phonetic recognisability; expand to 60+ unique reviewed clues before public 20-round format.
2. Reuse current quiz timers, answer submission, leaderboards and reconnection behaviour only where it preserves the new format's semantics. Server-authoritative correct answers and scoring; protect questions from REST/NDJSON leakage.
3. Test zero/late/duplicate submissions; tie ranks; wrong choices; unanswered timeout; offline phone returning mid-round; game restart; question deduplication; answer aliases; soft-keyboard overlap; screen reader/caption mode; TV/phone reveal synchronisation.
4. Run Node, content and browser tests at 320×640, 390×844, 844×390, 1024×768 tablet, 1280×720 and 1920×1080 TV; playtest with a real mixed-age group on actual phones.
5. Merge only after tests and a review of license/content provenance. `main` is currently tied to Render automatic deployments; merging can restart active in-memory rooms (see [#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41)).

**No lyrics, commercial audio, external artist voice imitations or promotional artwork are bundled by this design document.**
