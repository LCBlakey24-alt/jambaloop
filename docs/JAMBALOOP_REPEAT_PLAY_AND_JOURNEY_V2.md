# Jambaloop: Return Play, Question QA, and Player Journey
Prepared 22 November 2026. This describes the implementation in feature/10-player-scale-and-trolley-polish and the remaining roadmap.

## Goal
One evening should feel like a series of polished, distinct game shows: immediate joining, clear roles, fast rounds, satisfying reveals, short score transitions, and a quick next game. Each mode has its own palette and animations but uses consistent controls.

## Implemented in the development branch
- Trolley: exactly one Driver round per player, reshuffled teams of remaining players, three candidate cards per phase per team (nine offered to each team), all candidates refreshed next round; individual points follow each player. The driver judges on their phone; disconnected-driver fallback is available to the TV host.
- Quiz Race: engine/room limit raised from eight to twelve racers, with more colours and compact on-TV standings.
- Question repetition: local phone browser remembers up to 2,000 opaque question identifiers and submits them when joining the next room. The server prioritises unseen quiz prompts. Quiz Race records its issued questions so replay can avoid them.
- Question evidence: thirteen new original items sourced to NASA, USGS, US National Park Service and Royal Museums Greenwich, with verification dates; original historic banks still require their own checking.
- Transitions: a shared, mode-coloured entry/reveal/leaderboard presentation with reduced-motion support.

## Limitations
Same-browser question history is not an account: another phone, cleared storage or private browser mode starts fresh. Finite packs inevitably repeat when exhausted; no unlimited-new-questions claim. Local room memory is lost when the free server sleeps/restarts. Racing with twelve players needs performance and accessibility testing before merging. Legacy questions have not all been audited.

## Player journey for the next development passes
1. **Browse:** visually distinctive game tiles with duration, individual/team support, player range and a concise intro. Preserve clear Host and Join calls to action.
2. **Join:** polished QR join, optional avatar, reconnect, readiness and visible roles. Large readable phone controls.
3. **Setup:** show actual maximum players, accurate estimated duration, question format, difficulty and role selection. Prevent invalid settings.
4. **Round start:** 0.3–0.6s optional stage cue, readable title, player count and progress; never hold the entire game behind an unskippable animation.
5. **Play:** one obvious phone task, large answer/card buttons, no secret leaks, host TV uncluttered.
6. **Reveal:** answer and explanation where available, cited evidence for verified facts, points and streaks. Explain why each mode's winner has won.
7. **Checkpoint:** visually distinct leaderboard reveal, concise rank changes and reduced-motion instant results.
8. **Game end:** podium and awards, next-game art and preview, rematch on same room and preserved roster.

## Mode-specific design priorities
- Classic Quiz: premium broadcast stage, elegant question and answer states, clear explanations.
- Spin the Wheel: recognisable category wheel, anticipation and immediate reduced-motion outcome.
- Board Race: wood-and-brass 3D board, camera clarity, route fork labels; extending individual pawns beyond four requires actual 3D and turn-engine changes.
- Dice Rally: copper dice and distinctive multiplier moment.
- Knockout: lives indicator, elimination and spectator journey.
- Team Showdown: large readable team strips, balanced setup and captain moments.
- Quiz Race: track theme graphics, interpolation and readable 12-racer ranking.
- Trolley: readable two-track stories, visibly separate good / sabotage / good tiles and prominent Driver controls.
- Punchline Party and Fill the Blank: bigger original decks, longer match options, fair voting with many submissions.
- Spot the Bluff: suspense without showing secret questions to the impostor.
- Hot Potato: shared countdown, transfer animations and short match series.

## Repeat-play and verified-content workflow
1. Draft 20–50 original questions per batch with categories, difficulty and four question formats.
2. Store stable question or fact ID, correct answer, three credible wrong options, category, primary reference URL, date checked, and time-sensitivity.
3. Verify the exact answer against the referenced source, and review every incorrect option for ambiguity or accidental correctness. No unverified facts in the published verified pack.
4. Automatically check duplicated wording, semantically duplicate facts where possible, spelling, invalid options, range/order answer shape, citation presence and malformed URLs.
5. Give changing facts (sports, records, political officeholders, world news) frequent expiry/review dates. Use historic fixed facts wherever long shelf-life matters.
6. Run automated and family playtests for 720p TV, 1080p, landscape tablets, portrait phones, reconnection, 3/12/30/100-player rooms, accessibility and large group voting.
7. Publish each approved batch via reviewed pull requests; never imply that the historic bank has been checked just because a new pack was verified.
8. When unseen questions run out, clearly communicate it and prefer the least recently seen. Consider opt-in account sync only if needed later.

## Remaining roadmap, not built by this branch
Cross-device repeat history; true oldest-seen fallback and depletion estimates; fully audited original bank; server-side content-review workflow; higher solo Board Race capacity; larger social ballots; more question/prompt/card packs; complete 12-mode TV and mobile visual QA.

Do not merge or deploy during a live family session. Test and reconcile work against existing development branches before production.
