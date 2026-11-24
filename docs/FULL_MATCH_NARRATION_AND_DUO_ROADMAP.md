# Jambaloop — future full-match voiceover and two-presenter roadmap

**Status: FUTURE DESIGN ONLY.** No new clips, runtime code, credits, or live-site features are created by this plan.
**Tracking:** [Issue #61](https://github.com/LCBlakey24-alt/jambaloop/issues/61).

The creator wants **a polished British game-show presenter**, audible and captioned, taking players from selecting a game through instructions, stages, prompt/questions, rounds, results and replay. Later, offer **two original comedic co-hosts** that converse together. The desired *style* is a lively British presenting partnership, **not** the names, voices, trademark identity, exact jokes, or catchphrases of Ant & Dec or any other real presenters.

## Verified 24 November 2026 baseline

- The game list in `public/game-config.js` has **18 playable modes**.
- `public/narration-scripts.js` already has readable written previews for all 18 modes.
- `public/narrator.js` gives each game an optional click-to-play intro, using a static recording where present or locally available `en-GB` browser text-to-speech; it cancels previous narration.
- Only **`classic.mp3`**, **`board.mp3`** and **`quizrace.mp3`** are currently **committed to `public/audio/narrator/`**. The other 15 ElevenLabs intro recordings were previously delivered to ChatGPT, described in [the British narrator pack](ELEVENLABS_BRITISH_NARRATOR_PACK.md), but **are not committed to GitHub**. Check their bytes and titles before integration; do not mark their manifests complete without a verified MP3 on `main`.
- `public/sound-cues.js` separately makes programmatic sound effects and result stings, but does not speak multi-phase narration.
- [Prior narrator architecture/voice notes](JAMBALOOP_NARRATOR_PLAN.md) remain helpful but contain dated 12-mode/9-missing statements; this verified 18-mode/15-missing snapshot supersedes those counts.

## Core experience: TV talks, phones control

- **When game tile selected:** short optional 8–15-second game introduction, always with the text transcript. **How to Play:** distinct optional longer explanation, not part of a mandatory autoplay sequence.
- **When everyone is ready:** short neutral introduction to the match: “Phones at the ready. The first round starts now!”
- **When a new round begins:** a 2–5-second variation, e.g. “All right, let's see what's coming up next.”
- **When a known public prompt displays:** if an *approved exact text clip exists* and its matching content ID is shown, the host can narrate that known question/prompt. **No reading of future questions, answer keys, private clues, secret cards or user-generated text.** If the fixed prompt has no recording, show it as text; don't call an external TTS service during the match.
- **When voting begins:** “The answers are in. Time to make your choice.”
- **On reveal:** “Here we go. Let's find out how everyone did!”
- **On final round:** “This is it: the final round. Everything comes down to this!”
- **On game end:** “And that's the game! Let's see how you've finished.”
- **After results:** “Another round? The choice is yours!”

The sample lines are *proposed original writing*, not recorded assets. Use **several variants** of common cues and randomise deterministically by match/round so nobody hears the same line every 15 seconds. Keep clips short, especially during active timed play.

## Event-to-clip architecture (proposed)

A versioned static manifest maps `{ modeId, eventId, variant, audioAsset, captionText, lengthMs, speakerSet, rightsSource }`.

| Event family | When it triggers | Where audio plays | Requirements |
| --- | --- | --- | --- |
| `preview` / `how_to_play` | Opening a tile or explicit How to Play | Host/initiating device only | User gesture/explicit opt-in, never autoplay at page load |
| `lobby_ready` / `start` | Ready/all players confirmed | TV host | One event per match |
| `round_start` / `round_final` | New round | TV host | Variants, never auto-delay timer or input |
| `question_public` / `prompt_public` | Approved fixed question is currently shown | TV host | Only pre-recorded exact public text with stable content ID |
| `vote_open` / `vote_close` | Voting transition | TV host | Never read submitted options/hidden owner |
| `timer_warning` | One selected time marker | TV host | One short clip, avoid overlap with critical player input |
| `reveal` / `scoreboard` | Server-authoritative outcome | TV host | Avoid unrevealed answer/hidden information |
| `game_complete` / `rematch` | Final server results and rematch | TV host | No invented winner/number/nickname voice substitutions |

Make the playback key **game instance + round/phase ID + server event revision**. If the same state is re-rendered or re-sent after reconnect, don't speak again. A new rematch is a new game instance. The host controls a single narration channel: cancel stale clips on transition, support skip/mute, and do not let multiple presenter/sound cues overlap. Do not block or restart an active question timer just to finish a line.

### Per-game events to map before implementation

The following is **an event design inventory**, not an assertion that every listed event exists under exactly that name in current code. Audit each game's true stages and state transitions first.

| Existing game | Original narration to prioritise |
| --- | --- |
| Classic Quiz (`classic`) | Intro, question/round, answer lock, reveal, leaderboard, final |
| Spin the Wheel (`wheel`) | Wheel spin, chosen category, question, reveal, finish |
| Board Race (`board`) | Turn change, roll, landing/category, public quiz, finish |
| Dice Rally (`dice`) | Roll and multiplier, question, reveal, finish |
| Knockout (`knockout`) | Lives/round, last players standing, final |
| Punchline Party (`punchline`) | New original prompt, writing, anonymous vote, reveal |
| Fill the Blank (`cards`) | Sentence and card pick, vote, results |
| Fork in the Tracks (`tracks`) | Teams choose/argue, driver decides, outcome |
| Spot the Bluff (`bluff`) | Prompt, discussion, suspicion, vote, role reveal |
| Hot Potato (`potato`) | Pass cue, short warning, holder caught, final |
| Quiz Race (`quizrace`) | Starting signal, question/answer result, finish line |
| Team Showdown (`showdown`) | Teams ready, question, scoring, final |
| Same Page (`samepage`) | Write answers, lock, matching reveal, finish |
| Spotlight Wheel (`spotlight`) | Spin, contestant/adviser turns, decision, reveal |
| Brain Ladder (`brain`) | Next tier, question, life/loss cue, final |
| Top Answers (`topanswers`) | Vote preference, guess group majority, result |
| Rare Find (`rare`) | Public prompt, submit uncommon answer, rarity reveal |
| Sketch Sprint (`sketch`) | Artist turn, draw/guess start, reveal, finish |

**Narration must never leak special private role/prompt, correct choices or anonymous submissions before the public reveal.** The TV is the shared information surface; phones default silent. Live phone actions continue to take just one screen.

## Versioned static audio — cost and privacy

1. Generate narration **offline** with ElevenLabs or another properly licensed voice tool. Bundle small compressed MP3 clips, transcripts and checked audio files with the repo. No generation API keys or expensive API calls when players run a game; no personal player text sent to the provider.
2. First integrate the **15 missing already-produced** intros (only once the real files are verifiably available) before paying to generate new lines. Keep the existing Mark Munroe British intro voice as the proposed primary presenter unless the owner chooses otherwise.
3. Reuse generic cues where possible; do not record 18 copies of “Next round.” Prioritise high-impact spoken bits (start, transition, reveal, ending). Consider known question/prompt readout later as a **curated limited pack** because hundreds of prerecorded question MP3s would add asset/maintenance costs.
4. Keep exact transcript/caption text visible, including an option to read all rules without enabling sound. Require opt-in host sound activation to respect autoplay restrictions. One host volume control, independent voice toggle and sound-effects toggle, and an easy **Skip voiceover** action.
5. Mark missing MP3 explicitly. Fallback to readable on-screen text and, if a player independently chooses, local `en-GB` speech. Never block play due to absent audio or make a hidden dynamic TTS request.
6. Check licensing/rights for each generated voice/model/output at creation and at public commercial release; voice-library availability and paid tiers can change. No celebrity voice cloning or imitative voice performance.

## Future optional Double Act mode

**Status: stage 3, after a robust single-presenter release.**

As of November 2026, the [official ElevenLabs Text to Dialogue API](https://elevenlabs.io/docs/overview/capabilities/text-to-dialogue) supports scripted multi-speaker audio using Eleven v3/v4. It can produce complete conversations with different voices, rather than trying to cross-fade separately spoken lines at runtime. Choose original voices with appropriate licensing and two distinct fictional personalities:

- **Presenter A:** enthusiastic, reliable British host who confidently explains rules, leads events and delivers clear result announcements.
- **Presenter B:** quick-witted, lightly sarcastic co-host who offers funny *non-personal* asides, but never talks over rules or distracts from a timed question.

**Example prerecorded exchange (original draft):**

A: “We've reached the final round. Time to find out who can hold their nerve.”

B: “Excellent. Because somebody's confidence is about to need a very comfortable chair.”

A: “Phones ready? Let's play!”

Use an optional selector: **Classic Presenter / Double Act / Captions only**, and potentially **Short commentary / Full commentary**. Pre-record complete 3–8-second exchanges and some longer optional intros. Do not build a live chat bot that guesses reactions to player secrets; keep the duo non-interactive, cost-bounded, and safe. Laughs and personality are welcome, but jokes must not humiliate younger players or imply someone is cheating.

## Sequencing and tests

**Stage 0 — finish the current narrator set:** verify original 15 supplied files exist and belong to right games; add real files; audit audio metadata/licence; update `recordedIntros` and tests. No fake completion via file names alone.

**Stage 1 — reliable single-host commentary:** define the event manifest; write one short original script per event family and alternative variants; implement in small PRs for 2–3 modes first; verify exact audio events and no interruption/slowdown of multiplayer.

**Stage 2 — approved known prompts:** link a small set of **public and fixed** content IDs to prerecordings; test selected question timing and clarity. Not every question needs speech.

**Stage 3 — Double Act:** review licenses/voice choices and credit budget, then produce authored two-person exchanges and an opt-in TV audio style selection; real family playtesting before wider rollout.

**Acceptance gates:** all 18 games remain playable without audio; no hidden answer/secret/participant text leaked; no duplicate voiceover on SSE rerender/reconnect; host mute/skip respects preference; captions/transcripts available; clips never overlap, hide controls or block timers; no unknown paid generation; cross-device/browser and 720p TV tests; appropriate licensing before commercial reuse. Future recorded audio must be bundled/reviewed and added only in its own code/asset PR.

See [Issue #61](https://github.com/LCBlakey24-alt/jambaloop/issues/61) and the older [narrator architecture](JAMBALOOP_NARRATOR_PLAN.md). Priority is **below** multiplayer stability [#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41) and mobile controller simplicity [#45](https://github.com/LCBlakey24-alt/jambaloop/issues/45).
