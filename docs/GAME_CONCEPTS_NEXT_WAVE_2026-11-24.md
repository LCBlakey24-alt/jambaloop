# Jambaloop — next-wave game design portfolio (24 November 2026)

**Status: PLANNING ONLY.** This brief does not implement, register, merge or deploy new game modes. Its purpose is to give Claude Code and future contributors specific, testable ideas while protecting the existing 18 playable games and their quality. Verify the actual GitHub main branch and Render release at implementation time.

## Product direction: the TV runs the show; the phone is a controller

- A normal player action should fit on **one phone screen** with a clear short prompt and 1–4 obvious controls. Never require Back/Next pages to complete an active action; scrolling is justified for longer lists, typing, drawing and accessibility zoom only. See [TV-first mobile overhaul #45](https://github.com/LCBlakey24-alt/jambaloop/issues/45).
- TV is the shared stage: big prompt, examples, timers, public cards, standings, narrator and results. Phones privately show only role/hand/answer or the one action needed. Do **not** send any hidden answers, cards, roles, other-player bids or personal secrets to the host/TV before the legitimate reveal.
- Tablets used by players should remain controller-first, including landscape. Host tablets and phones may use a distinct host role, but must not gain secret role data.
- For every new game: short skippable 3-step intro; optional expandable full rules; feedback on tap/lock/wait/reveal; accessible fallback without a TV; visible reconnect status; no extra page navigation in live actions.
- Large 8–30-player choice lists may need a continuous vertical list or a numbered TV list + phone number grid with an accessible descriptive alternative. Never silently remove eligible entries.
- Minimum QA: full game simulations; real multi-device REST/stream privacy and scoring tests; 320×640, 390×844, 844×390 phones; 1024×768 player tablet; 1280×720 and 1920×1080 TV; screen readers, input/keyboard overlay, larger text, reduced motion and late reconnect.
- [Restart-state issue #41](https://github.com/LCBlakey24-alt/jambaloop/issues/41) remains a high-priority live risk. Render auto-deploy on main can drop in-memory rooms. Do not treat an implementation PR or green tests as permission to trigger an unattended live restart.

## What exists and what is only planned

The currently registered **18 playable modes** are named in public/game-config.js: Classic Quiz, Spin the Wheel, Board Race, Dice Rally, Knockout, Punchline Party, Fill the Blank, Fork in the Tracks, Spot the Bluff, Hot Potato, Quiz Race, Team Showdown, Same Page, Spotlight Wheel, Brain Ladder, Top Answers, Rare Find, Sketch Sprint.

**Already in design:** the user's original card game **Bank** [#46](https://github.com/LCBlakey24-alt/jambaloop/issues/46) and documentation PR [#47](https://github.com/LCBlakey24-alt/jambaloop/pull/47); **Secret Suspects** [#42](https://github.com/LCBlakey24-alt/jambaloop/issues/42); **Bloodmoon Council** [#43](https://github.com/LCBlakey24-alt/jambaloop/issues/43); **Sketch Relay**, **Clue Circuit**, **Mini Mayhem**, **Letter Panic**, **Escape Together**, **Mind Spectrum**, **More or Less**, **Word Weld**, and others in the [existing roadmap](GAME_EXPANSION_ROADMAP_2026.md). Never count planning names as live tiles.

**Two newly proposed independent games in this brief:**

- **Question Vault**, [issue #49](https://github.com/LCBlakey24-alt/jambaloop/issues/49): collaborative ten-question deduction with a single Keeper.
- **Mystery Market**, [issue #48](https://github.com/LCBlakey24-alt/jambaloop/issues/48): hidden-bid fictional-item market with resource strategy.

**Existing concepts expanded below:** Sketch Relay, Bank and other traditional cards; visual memory and audio games should normally become *formats/packs* of a coherent existing title rather than independent launch tiles.

## A. Question Vault — cooperative yes/no deduction

**Hook:** One player knows the mystery object. Can the rest identify it before their ten shared questions run out?

**Audience / format:** 3–12 recommended players, 3- or 5-object match, entirely cooperative. A rotating Keeper sees a private, vetted common object (e.g. 'umbrella', 'bicycle', 'piano'). Everyone else asks yes/no questions; no hidden antagonist or personal secret is involved. This differs from Secret Suspects (whose story is autobiographical), Brain Ladder (standalone logic challenges) and Clue Circuit (association and hidden team maps).

**Provisional playable loop:**
1. Server chooses a reviewed object from a category (Everyday Objects, Animals, Places, Food) and privately sends it only to the Keeper. TV displays the category, a question budget of 10 and the asker order. The Keeper cannot reveal the word through any state/host endpoint.
2. Current asker submits one concise yes/no question (max 120 characters) or picks a suggested question. TV displays the question. Keeper replies **YES**, **NO**, or **UNSURE** from one phone screen. UNSURE still consumes a question, discouraging indefinite skipping.
3. Other players discuss and can attempt one object guess instead of another question. A wrong guess uses a question slot and the turn moves; a correct guess ends the round. At 0 question slots, reveal the object and move to the next Keeper.
4. TV shows the complete public question/answer trail and round result. Keeper role rotates; no reader gains privileged access beyond their own legitimate turn.

**Suggested co-op score (must playtest):** guessed after 1–6 question uses earns 3 team stars; 7–8 earns 2; 9–10 earns 1; failure earns 0. All players share the result. A valid early win does not require spending remaining questions. The group tries to earn the highest total stars in 3/5 rounds. No player benefits from misleading their teammates.

**Phone:** asker gets one text field/quick question and SEND, Keeper gets YES/NO/UNSURE, other players see a compact WAIT state. Never require a second page to find the action; long discussion/history stays on the TV. Provide full question/object context only to the rightful role.

**MVP content:** at least 120 original, obvious, age-safe objects balanced across categories with editorially reviewed ambiguous terms and aliases. Maintain a no-repeat pool and indicate when a pack is exhausted; do not use niche trademarked characters. A suggested-question set of 30 broad yes/no prompts can help children/novices.

**Critical tests:** Keeper secret redacted from TV/host, guests and streams; wrong key/late join; action-by-role gating; query sanitisation; 0/1/6/8/10-use boundaries; Keeper disconnect/timeout; rematch and new Keeper; 320px landscape/portrait input handling.

**Status:** [#49](https://github.com/LCBlakey24-alt/jambaloop/issues/49) only. Rules and score provisional until a playable design test.

## B. Mystery Market — secret bids and fictional value

**Hook:** Bid against friends for unusual fictional lots. The trick is deciding what they are worth while preserving enough money for later lots.

**Audience / format:** 3–8 individual players, start with **20 purely fictional coins**, play 5 lots; expand to 3/7 after timing tests. No money, payments, exchangeable virtual currency, wagers, cash-out, purchases or prizes. This is a points-management board game, not a gambling service.

**Provisional playable loop:**
1. TV reveals an original illustrated fictional item with descriptive clues, rarity and a *plausible point-value range*. The item's **pre-authored true game value** stays server-private and is never based on claimed real-world sale prices.
2. All players privately choose PASS or a sealed bid from 1 to the number of coins they still possess; the phone only displays their budget, bid and LOCK button. The TV shows only a locked-in count.
3. When all eligible players lock or the timer ends (suggest 30 seconds, configurable), server resolves the **highest bid**. All-highest ties use a **public rotating priority order** established before bidding, not connection speed. A passing or disconnected player bids zero and cannot win. If all pass, the lot remains unsold.
4. Winner pays exactly their bid and receives the lot, its fixed true value is revealed, and other bids are shown simultaneously. Other players keep their coins. All players see the updated standings.
5. After 5 lots, **final net worth = unspent coins + sum of values of acquired lots**; highest wins, tied totals share victory. A cheap winning bid can make a profit, an overpriced lot can lower net worth. Do not confuse bids with the value score.

**Illustrative round (fictional numbers, not item facts):** player has 20 coins; bids 6 on an enchanted umbrella valued at 9, wins, now holds 14 coins and 9 collection points = 23 net worth. If the lot's hidden value were 3, their net worth would instead be 17. This makes the risk intuitive.

**Original value-content rules:** create at least 35 original illustrated lots, each with a clue, authored rarity band, fixed value (say 2–12) and explanation for how clues relate to that value. The clues must permit reasonable estimates; hidden value must not be arbitrarily random each session. Validate any formula/content balance with simulated bidding; avoid unfairly favouring item-order luck. The game should reward valuation and limited-budget choices, not trivia recall.

**Phone:** large bid selector, PASS and LOCK; after locking: WAIT. TV owns cards, clues, other bids *after* resolve and net-worth totals. A no-TV accessibility view can show the same public clues without revealing the private value/bids before the round.

**Critical tests:** cannot bid >wallet or negative; own bid private until reveal; ties rotate fairly; all-pass/no-bid; duplicate submissions; insufficient wallet; late disconnect; scoring identity/integer arithmetic; future lot values not leaked; no coins purchased or redeemed.

**Status:** [#48](https://github.com/LCBlakey24-alt/jambaloop/issues/48) only. Distinct from Bank (directional card-rank predictions + Joker wipe), Dice Rally (dice score multiplier), and More or Less (verifiable fact comparisons).

## C. Sketch Relay — deepen the already-planned picture chain

**Hook:** A sentence becomes a drawing, that drawing becomes a new sentence, and the TV finally reveals how wildly it changed.

**Audience:** 4–12 players; 1/2/3 independent chains, 4–8 transformations per chain depending on group size and time. Good family-friendly 10–20-minute target, to validate with real sessions. Do not add a duplicate Sketch Sprint tile; Sketch Sprint is live timed drawing/guessing while Sketch Relay is sequential *reinterpretation*.

**MVP loop:** server seeds an original start phrase known only to the first drawer. First person draws for a suggested 45 seconds. Next person sees **only the latest drawing** and has suggested 25 seconds to type a description. Next person sees **only that description** and draws it. Continue until everyone in that chain contributed or the chain length is met. Each handoff privately contains one predecessor artifact, not earlier images/guesses. The TV displays a neutral progress/round indicator but no secret chain content until the reveal. At end the TV unfolds the entire original phrase → drawing → description → drawing chain step-by-step, including attributions **only with participant consent**. The group can laugh and save/export only after an explicit opt-in.

**Scoring:** MVP is **no-score social mode**, avoiding hostile scoring of drawing ability. Optional later feature: each participant guesses the original start phrase from the final picture, earning 1 point for a semantically equivalent answer, subject to an exact supported manual adjudication policy. Do not implement automated subjective scoring without a sound method.

**Phone:** draw canvas OR a single short caption field; one action at a time with SUBMIT. Drawing must support touch, undo, clear confirmation, stroke continuity and landscape. Accessibility alternative: sticker/icon assembly or opt-out with a simple descriptive role; test before claiming equitable play.

**Content:** at least 100 original, visualisable, family-safe phrases across Everyday, Fantastical, Outdoors and Silly Situations; not celebrity/brand imagery. Prevent repeats and moderation errors. Support short/long name handling, accidental back navigation and disconnected contributors.

**Key tests:** no cross-chain content leaks before reveal; correctly alternating artwork and text; no self-assignment where impractical; safe rendering of arbitrary text/drawings; deterministic assignment; no missing link when a participant leaves; optional content export consent; phone pointer and keyboard reliability.

## D. Bank and traditional card table — keep creator's rules authoritative

**Bank** is the owner's original game, recorded in [#46](https://github.com/LCBlakey24-alt/jambaloop/issues/46) and the open [#47](https://github.com/LCBlakey24-alt/jambaloop/pull/47). It is NOT implemented. Essential confirmed rules: an Ace is low (1), one possible opening-card replacement that must be accepted, Higher/Lower draws, earliest BANK after two cards, first to 20, **at exactly 15 combined cards (saved + run) a player may bank or continue, and once above 15 they must continue to 20**, rank-pair ends turn with no new cards, Joker wipes all banked cards. Before writing the engine confirm what counts as two cards, a normal wrong guess, initial/replacement Joker timing, and precise 20-card finishing count. Do not invent remaining decisions.

**Suggested traditional card candidates (original graphical implementation, traditional underlying rules):**

| Candidate | Proposed hook | Phone action | Launch status |
| --- | --- | --- | --- |
| **Chase the Ace** | One card each, decide whether to keep it or swap, then reveal the lowest card and lose a life | KEEP or SWAP | Prototype after Bank; clarify variant/dealer rules before coding |
| **Cheat / Bluff** | Play face-down cards while claiming a rank; opponents may challenge; reveal whether the claim was true | PLAY / CHALLENGE | Distinct from Spot the Bluff's missing-prompt answers, but private hand management is more complex |
| **Sevens** | Build card sequences outward from each seven; first to empty their hand wins | Play one valid card or PASS | Distinct sequential shared-card strategy; must display legal cards clearly on phone |
| **Blackjack/21** | Play against a dealer using hit/stand decisions and optional virtual tournament points | HIT / STAND | Prefer non-wager family scoring; clarify soft Ace and dealer standing rules |

All traditional titles need a complete explicit variant ruleset, fair shuffling, a server-private deck, tie/end handling and tests. Never duplicate the Bank/Risk Vault core mechanic under different graphics.

## E. Features best implemented as packs or sub-modes (not new tiles yet)

- **Picture Perfect → Memory Gallery:** show an original image on TV for 20 seconds, remove it, then ask 3–5 recall questions about changes/positions; award one point per answer. The image must be original/licensed and have usable descriptive equivalents. This can be a Memory pack in Picture Perfect, not a third drawing game.
- **Quiz / Spotlight → Sound Scene:** play a bundled original sound, then identify an instrument, event or sound order. Keep the playback on the TV; ensure captions/transcripts or visual equivalent so hearing-impaired players can still participate. **Do not** upload famous music clips or rely on unlicensed sound effects.
- **Punchline Party → Caption Contest:** original captionable illustrations with existing anonymous submission/voting; add as a content pack or round type, not a separate tile.
- **Mini Mayhem → Pattern Tap:** reproduce a rapidly displayed icon sequence, with turn-based accessibility alternative. One minigame in an existing planned collection, not its own tile.
- **Friends & Couples → Who Knows Me Best?:** selected consenting player privately records a preference, others predict their answer; skips allowed, no pressure to disclose personal/intimate information. Unlike Top Answers' room popularity measure, this predicts a *specific person*. Initially an opt-in family-safe social pack.

## Improvements to current games before adding tiles

| Existing title | Next focused improvement | Evidence needed |
| --- | --- | --- |
| **Hot Potato** | 1/3/5-potato match and least-caught cumulative winner; clock/passing fairness | Issue #40, disconnect/expiry tests |
| **Spot the Bluff** | a fair timed discussion, hidden-role safety and role rotation | Issue #40, private state and browser tests |
| **Quiz Race** | Grand Prix with several races and carry-over standings, connection-latency tolerance | scripted fair racing tests |
| **Knockout** | opt-in rescue round or one extra life, not an unbalanced extra chance for one player | simulations and tie checks |
| **Dice Rally** | one tactical reroll token per match; reject stale rolls and double spending | state and 3D fallback tests |
| **Classic Quiz** | short high-stakes final question as an *optional setup modifier* | score symmetry and correctness tests |
| **Sketch Sprint** | improved drawing/guess timing and accessible drawing controls | mixed-device drawing tests |
| **Top Answers / Rare Find** | stronger answer/prompt variety and replay quality before adding more UI | duplicate, content and large-ballot tests |

Don't add new complexities simply to make a game longer. Playtest short vs normal vs extended formats and keep phone UI simple.

## Release priorities and acceptance gates

1. **P0 reliability:** secure state/auth/round transitions, timers, network resumes, memory-only rooms, avoiding auto-deploy during active games [#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41).
2. **P0 controller-first UX:** all 18 shipped games one live-action screen with no pager, TV owns stage; [#45](https://github.com/LCBlakey24-alt/jambaloop/issues/45).
3. **P1 content & existing-game depth:** expand independently verified trivia and original creative content, protect no-repeat; improve Hot Potato, Spot the Bluff and existing short matches [#40](https://github.com/LCBlakey24-alt/jambaloop/issues/40).
4. **P2 one new prototype at a time:** Sketch Relay (existing priority) or Question Vault (new low-complexity proposal) for fast real-group testing; finish Bank rules and prototype server deck independently.
5. **P3 higher-complexity games:** Mystery Market economy/balance, Secret Suspects privacy, Bloodmoon Council role secrecy; each with standalone security and gameplay testing before a tile is created.
6. **P4 modes/packs:** Picture Perfect memory, Sound Scene audio quiz, family-safe social/couples packs. Make sure these are truly new play *experiences* before granting separate launcher slots.

**Every future implementation must include:** (a) a player decision and win/success contract; (b) host/TV/player private-data visibility matrix; (c) scenario tests including wrong/tied/all-pass/no-answer outcomes; (d) original content or clearly documented source; (e) accessible phone/TV screenshots; (f) all existing regressions; (g) a live-play review separate from the code merge. Do not release game titles that consist only of placeholder cards or one untested round.
