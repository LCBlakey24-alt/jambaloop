# Jambaloop — Game Expansion Planning Roadmap
**Planning update:** 24 November 2026
**Repository:** LCBlakey24-alt/jambaloop
**Status:** DESIGN ONLY — no gameplay, UI, database, authentication, or deployment changes authorised by this document.

## Purpose
Add genuinely different games inspired by popular *types* of browser/tabletop party entertainment, without copying another publisher's names, artwork, wording, card decks, branding, audio or distinctive presentation. Jambaloop games must each have their own central player decision, moment-to-moment loop, win condition, and TV/phone experience. Expand existing games by introducing *modes* when the core experience would otherwise be redundant.

## Existing baseline
The game catalogue currently lists **18 modes** in `public/game-config.js`: Classic Quiz, Spin the Wheel, Board Race, Dice Rally, Knockout, Punchline Party, Fill the Blank, Fork in the Tracks, Spot the Bluff, Hot Potato, Quiz Race, Team Showdown, Same Page, Spotlight Wheel, Brain Ladder, Top Answers, Rare Find, **Sketch Sprint**. Check the current source and merged PR status again before implementing; a repository draft or a file on main is not proof a feature is on the live website.

## Next-wave expansion — six priority concepts

| Priority | Working title | Defining player action / core loop | Why it is distinct | Design and implementation notes |
| --- | --- | --- | --- | --- |
| P1 | **Sketch Relay** | Alternate drawing a prompt on a phone and interpreting the previous player's picture; reveal the full chain on the shared TV. | Visual *telephone* and transformation, not Punchline Party writing, Same Page matching or quiz questions. | Touch/mouse canvas; privacy between handoffs; group reveal; multi-person chains; easy export of players' own creations with consent; accessibility alternative to drawing. |
| P2 | **Clue Circuit** | Teams select linked word targets using a limited clue from a designated clue-giver; rotate roles and manage hidden hazards. | Team-based *association strategy*, unlike Word Radar's free-form semantic ranking. | Server-filter hidden target maps; avoid cloning a published grid, terminology or card distribution; make original clue and interception rules; support colour-independent markings. |
| P3 | **Mini Mayhem** | Rapidly switch between 5–15-second touch, memory, targeting and sequencing challenges while the TV presents a shared tournament. | Motor skill and reaction *microgames*, not trivia-based Quiz Race or Hot Potato. | Deterministic timing and latency fairness; accessible non-twitch options; avoid impossible touch targets and noisy TV layouts; build an initial small set of genuinely varied challenges. |
| P4 | **Letter Panic** | Type a valid word containing an on-screen letter pattern before your personal countdown expires, then pass play. | Timed vocabulary generation, not trivia passing in Hot Potato or the two-clue merging in Word Fusion. | Dictionary source and UK spelling, rejected repeat words, rule for proper nouns, short latency grace, anti-cheat and fair keyboard accessibility. |
| P5 | **Escape Together** | Each player sees part of a puzzle; communicate to combine clues, solve connected locks, and escape within an optional timer. | Persistent *cooperative puzzle narrative*, not standalone Brain Ladder questions. | Original puzzle graphs; hints; resumable long sessions where feasible; no unsolvable branches; accessible clues with text equivalents; narrative packs. |
| P6 | **Mind Spectrum** | One player positions a secret target along a subjective scale; teammates give/interpret a clue and try to align their guess. | Interpreting another person's *subjective scale*, not Top Answers' actual room popularity votes or Same Page's matching words. | Devise own scale, target, marker, scoring and presentation rather than replicating Wavelength's board; ensure understandable prompts and age-appropriate content. |

## Additional ideas — keep in backlog, avoid unnecessary duplicate tiles

1. **Doodle Detectives** — One player illustrates an unusual phrase and others identify it or discriminate among invented interpretations. **Initially evaluate as a distinctly labelled mode within a drawing-game collection**, not a new tile by default. Only split from Sketch Relay if live testing shows clearly different play rhythms and repeat value.
2. **Risk Vault** — A no-trivia push-your-luck collection game: bank incremental rewards or risk losing a round's haul. **Conditional independent title** if prototype differs materially from Dice Rally's dice-based multipliers and cannot be a Dice Rally side mode.
3. **Picture Perfect** — Spot alterations, missing items and hidden details across original/appropriately licensed visual scenes. **Independent candidate** because observation accuracy and tapping positions are unlike existing questions. Budget content creation, scene licensing and touch accuracy.
4. **Case Closed** — Cooperative evidence investigation, suspect interviews and final theory submission. **Long-term narrative series**, distinct from Spot the Bluff's secret missing-prompt social deduction and from Escape Together's mechanical lock/puzzle flow. Start with one small original case before promising a library.

## Already planned concepts — prevent duplicate additions

- **More or Less?** — sourced real-world *which quantity is larger* comparisons; competitive points and elimination variants, optionally confidence wagers. Do not use unknowable world totals (e.g., global doors vs windows) as verified facts. Differentiate from ordinary closest-number trivia.
- **Word Fusion** — overlap/merge two prompted answers into a single word with explicit accepted answer normalization; do not simply rebrand other word games.
- **Word Radar** — cooperative semantic proximity search with a ranked similarity number and transparent corpus/word model/version; never confuse rank with above/below in alphabetic order. Distinct from Clue Circuit and Letter Panic.
- **Punchline Battle** — incorporate head-to-head/final rounds *inside* existing **Punchline Party**, not a duplicate standalone tile.
- **Spot the Faker** — evaluate as a substantially different sub-mode or prompt pack in **Spot the Bluff** unless a new core mechanic is justified.
- **Dare Deck / Truth or Dare** — proposed Friends & Couples game with consent, skip/swap without penalty, age-appropriate packs, and no dangerous or coercive dares.
- **Who Knows Me Best?** — private personal response + other players predict that *specific person's* answer; unlike Top Answers' room favourite.
- **Date Night Quest** — two-player cooperative conversational journey, distinct from high-score trivia and dare selection.
- **Story Chain** — original collaborative storytelling with secret creative constraints; consider overlap with Sketch Relay (text-only versus picture relay) and distinguish clearly.
- **Would You Rather?**, **Never Have I Ever** and compatibility questions should start as content packs or closely integrated modes, not automatic additional game tiles.

## Newly proposed, distinct social games — 24 November 2026

These are **new design proposals**, not implemented modes. The current website remains at 18 playable games.

### Secret Suspects — true-story deduction ([#42](https://github.com/LCBlakey24-alt/jambaloop/issues/42))

Players voluntarily submit **true** anonymous secrets. A neutral/rotating reader announces one secret, the group discusses, and each non-owner guesses who submitted it. Correctly identifying the owner earns **+1**; the owner earns **+3** if *nobody else* identifies them. The owner's decoy vote must not count as a correct guess or invalidate the hide-it bonus. Secret ownership, votes and pending stories are private until the reveal. Include consent, a non-punitive skip/replace option and temporary story retention. It is fundamentally different from Spot the Bluff: no designated unprompted liar; each clue is an actual personal story. **MVP before launch:** audited privacy, scoring, multi-secret selection without trivial elimination, rotating reader, TV/phone flow and non-graphic family-safe mode.

### Bloodmoon Council — vampire-themed day/night hidden roles ([#43](https://github.com/LCBlakey24-alt/jambaloop/issues/43))

A new original social-deduction game using the broad classic night/day hidden-role mechanic, but vampire fiction instead of a Werewolf/Traitors brand imitation. Proposed roles: **Vampires**, **Oracle**, **Warden**, and **Villagers**. At night vampires secretly nominate a victim, Oracle inspects one player's alignment and Warden protects someone. Daytime reveals what happened, then players discuss and privately vote to banish a suspect. Villagers win if all vampires are removed; vampires win if they equal/outnumber remaining non-vampires. Avoid duplicate skins of Spot the Bluff or Signal Jam. The **neutral host/TV must not receive hidden roles**, even as a background payload; dead players spectate without secret spoilers. Recommended group 6–12, subject to balance testing. See [complete design brief](BLOODMOON_COUNCIL_DESIGN.md) for roles, phase/privacy matrix, tie rules, accessibility and tests.

### Position in the queue

1. First resolve **confirmed multiplayer/restart risk** [#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41) and other gameplay-breaking defects.
2. Complete planned **Hot Potato / Spot the Bluff** depth [#40](https://github.com/LCBlakey24-alt/jambaloop/issues/40) and ongoing original content growth.
3. Prototype Secret Suspects and Bloodmoon Council in **separate** design, game-engine, privacy, and UI PRs. Validate their distinct core loops against every existing game.
4. Continue the original P1–P6 pipeline only as capacity and playtests support it. Do not count any concept as an additional live mode until fully coded, tested and merged/deployed.

## Future platform enhancement — player accounts and statistics (planned only)

[Issue #59](https://github.com/LCBlakey24-alt/jambaloop/issues/59) and [the dedicated player stats roadmap](PLAYER_PROFILES_AND_STATS_ROADMAP.md) record a **later** feature, not a new game or a feature that is coded, merged or deployed.

- Allow **optional accounts** while preserving existing guest-friendly room-code play without registration. Later investigate Google/Microsoft and other secure login methods, with no provider or spending commitment.
- Track **server-confirmed completed games** and per-mode performance: games played, wins, shared places, team victories separately, personal bests, selected achievements and personal games-night recaps.
- Give every signed-in user a **private-by-default** My Stats screen. On the TV, show selected player stats before a game **only when the player opts in**, and keep phones almost entirely focused on game controls.
- Show “8 wins from 20 finished Dice Rally games (40% historical win rate)” rather than “40% chance of winning tonight.” Don't combine different game scoring systems or publish unsupported small-sample odds; any future probability estimate needs specific validation and clear caveats.
- Write an explicit result/eligibility mapping for all **18 existing games**, including individual ties, team wins, collaborative or non-winner modes and disconnected/aborted matches. Prevent duplicates on refresh, rematch and server retries.
- Treat account security, persistent database costs, privacy, deletion/export, children's protection and account-linked identity as prerequisites. Existing in-memory room reliability [#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41) is a separate blocker.

**Implementation priority: AFTER** the current multiplayer quality and [single-screen mobile redesign #45](https://github.com/LCBlakey24-alt/jambaloop/issues/45). Do not begin building user accounts or add a new paid data store because this planning section exists.

## Content filtering, age and accessibility (design requirement)

- Whole-site content metadata must include audience eligibility (Kids, Family, Teen, Adults Only), intensity/subject tags, authored/source provenance, moderation state, pack ID, and stable duplicate-detection ID.
- Default to **Family-safe** for guests and any unknown-age player. A room's effective content allowance must reflect its **least-permissive participant**, not just the host's selection. Never send restricted prompts to unauthorised clients.
- Adults-only access needs a documented UK regulatory/privacy assessment and an appropriate age-assurance solution for the actual content and service; a self-declared age toggle or social login alone is not reliable verification. Google/Microsoft/email sign-in are **future account features**, not proof of age.
- For social/couples modes: optional play, skip/swap without humiliation, no pressured personal disclosure, and moderation/reporting for custom prompts. Avoid dangerous, abusive, coercive or non-consensual challenges.
- No age-restricted content should be developed, switched on or shown before the gating and safety architecture is designed, reviewed and tested.
- Child-facing content and any account features require privacy-by-default, minimal data, suitable parental controls where needed, and age-appropriate user experience. Recheck applicable law at implementation time.
- Test TV 1280×720 and 1920×1080, landscape tablet 1024×768, and phones 390×844 and 320px; keyboard, screen reader, reduced-motion, reconnect and poor network paths.

## Game uniqueness acceptance gate

Before a new **home-page game tile** is approved, its design document must answer:
1. What is the *one-sentence hook* and what do players physically do each turn?
2. What information do TV, host and each phone see at each phase?
3. What skill / social behaviour does it reward that no existing mode chiefly rewards?
4. What is the win condition, optional solo/teams mode and reasonable group size?
5. What makes its rules and *actual feel* meaningfully different from the closest two existing titles?
6. Why must this be a new game, rather than a mode, round variant or question pack?
7. What distinct original visuals, assets and terminology does it use?
8. How is content verified, moderated, classified, deduplicated and replayed?
9. What are the fairness, privacy, age, accessibility, latency and disconnect tests?
10. Is there enough original content for repeated sessions, with a realistic content maintenance plan?

**Reject or fold into an existing game** if differences amount only to graphics, theme, category, superficial point scoring, or a mildly changed question format.

## Implementation order and release discipline

1. Keep the existing **18** modes stable; inspect current branch, CI and live deployed commit before modifying code.
2. Write individual playable-design briefs for P1–P6, each with a short realistic MVP, examples, data schema, screen flows and overlap test.
3. Prototype **Sketch Relay**, then **Clue Circuit**. Validate real TV + multi-phone play before expanding.
4. Prototype **Mini Mayhem** and **Letter Panic** with input/latency and fairness tests.
5. Develop **Escape Together** and **Mind Spectrum** after the shared media/puzzle and subjective-scoring needs are specified.
6. Reassess the four backlog ideas only after their closest existing/new game has been playtested.
7. Keep ongoing original content expansion, not just added tiles; check factual sources, moderation and repeat frequency.
8. Codex/Claude implementation must be isolated to reviewed changes, follow existing test discipline, and **must not** merge, deploy, switch on 18+ content or implement accounts on the strength of this planning document alone. The Render service auto-deploys commits merged into `main`, so a merge can interrupt active rooms.

## Planning status
**Twelve additional proposals recorded:** the original six priority independent candidates and four backlog candidates, plus Secret Suspects and Bloodmoon Council (both planning-only). Doodle Detectives remains a potential drawing-game sub-mode. None of the proposals listed in this roadmap is implied to be coded, published or live.
