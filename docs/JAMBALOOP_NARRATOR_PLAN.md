# Jambaloop — Narrator voice / audio identity proposal (22 November 2026)

**Implementation status (22 November 2026):** Intro playback has been wired into all twelve expanded tiles in draft PR #7. Three pre-recorded ElevenLabs clips have been generated and uploaded as static MP3s: **Classic Quiz, Board Race and Quiz Race**. The ElevenLabs free generation service became busy while generating the remaining nine, so those modes currently use a **clearly labelled browser-native English speech fallback**, with the same scripts and controls. They do **not yet** have the consistent professional narrator voice. This design branch has not been published to the family site's Render deployment.

## Creative direction

A single recurring **Jambaloop announcer**: energetic, upbeat, warm, British-English, lightly game-show inspired, cheerful without sounding like an advertisement or constant chatter. Use the **same voice** across every game to make the site feel cohesive. Each game can have a short, distinct musical sting and/or transition sound *later* without changing the core voice.

A player clicks a game tile; its animated tile expands. Its preview has a play/pause **Listen to intro** button (speaker icon) alongside the written game description, How to play, Back and **Set up this game**. On an opt-in "Narrator on" preference, selecting another tile can automatically play that preview after the user's initial interaction. Default **off**; never autoplay on loading the homepage.

Host TV is the primary audio source at family game night. Phones default silent for narration to avoid 8 devices speaking at once. Mobile users can explicitly listen from their phones with captions visible. Narration should not continue over actual questions, countdowns or answers.

## Recommended production architecture

1. **Generate once, use indefinitely:** choose a legally appropriate provider and narrator voice, and render 12 short high-quality clips **offline**. Compress to audio files (`public/audio/narrator/quizrace.mp3`, etc.) and bundle as static assets served by the same Render web app. No voice-generation API key, no credits per play, no network calls to ElevenLabs or Suno during game night.
2. A tiny `public/narrator.js` (future) owns a single `Audio` element: plays one clip at a time, stops on Close/Set up/Leave/room begin, supports replay, one-device localStorage mute, optional volume, `ended` state and graceful unavailable-asset fallback. All playback on user gesture by default due to browser autoplay policies.
3. Include an exact text transcript in the preview for every audio intro, or link the clip to a transcript. Respect caption/text visibility independent of audio availability; don't read secret quiz answers aloud.
4. Prefer **8–15 seconds per clip**, max ~20s. Aim for 24–38 spoken words, unless a script's pauses demand less. Use matching loudness and similar pacing across all game intros. No big music bed under important rules; the title and first-second sting can introduce the mood.
5. Browser audio not supported? Hide/disable Listen; still show all rules as text. Do not make the game depend on third-party voice functionality or audio.
6. Record and preserve provider, account plan/tier, voice ID, generation date and license evidence with audio. Keep the original text source to regenerate if licenses change.

## Provider considerations

- **ElevenLabs:** best fit for a consistent warm British announcer. Two library voices surfaced in the connected ElevenLabs library: **Mark Munroe — British Radio Presenter and Voiceover Narration** (`nrD2uNU2IUYtedZegcGx`, male) and **Vicky Cowan — Pro British Radio Presenter Voice Actor** (`V0cljQmo7wpx8LTdbqfJ`, female). They are candidates to *preview*, not final selections.
  - Official terms: https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform — Free = no commercial license; free-tier published content needs attribution; paid plans include commercial licensing excluding beta services. Any future monetisation needs a fresh license review, potentially regeneration under a licensed tier.
- **Suno Speech (beta):** relevant for narrated tracks integrated with original background music, introduced Oct 2026. Better reserved for title/theme stings, not the core speech-first voice; do not depend on beta feature stability.
  - Official intro: https://about.suno.com/blog/introducing-speech-beta
  - Official terms: https://about.suno.com/terms — Free/Basic output limited to lawful internal personal **noncommercial** use **with attribution**; later commercial usage requires a qualifying paid license and correct rights per output.
- No purchase, paid plan, voice cloning, credits consumption or deployment is authorised by this design document. Avoid impersonating real/famous announcers without their consent.

## Example reusable brand audio

**Jambaloop welcome** — "Welcome to Jambaloop! One big screen, everyone's in. Pick a game, grab your phone, and get ready for a brilliant games night!"

**Room ready** — "Everyone's here! Phones at the ready. Let's get this party started!"

**Match ending** — "And that's a wrap! What a finish! Check out those scores — who's up for another round?"

**Keep these optional**: short, never interrupt instructions; winner call-outs can use text-only or individually approved variable narration. Do not narrate potentially offensive user-provided answers or nicknames automatically.

## Original game intros — working scripts

Use each ID to map the chosen game mode to `/audio/narrator/{id}.mp3`. All are original text (not borrowed slogans or scripted dialogue from another game or franchise).

| Game ID | Suggested clip script |
| --- | --- |
| `classic` | "It's time for Classic Quiz! Choose your favourite topic, put those thinking caps on, and prove who knows their stuff. Every question counts. Are you ready?" |
| `wheel` | "Step right up for Spin the Wheel! Give it a spin and find out what category comes next. One wheel, plenty of surprises, and a lot of points to win!" |
| `board` | "Welcome to Board Race! Roll the dice, face the trivia challenges, and move your team across the board. Take the right turns, and the finish line is yours!" |
| `dice` | "Roll into Dice Rally! The dice decide your points multiplier, but your answers decide the score. A lucky roll helps — a clever answer makes it count!" |
| `knockout` | "Here comes Knockout! Three lives each, and every wrong answer puts you under pressure. Hold your nerve, stay in the game, and be the last one standing!" |
| `punchline` | "Welcome to Punchline Party! The sillier the prompt, the better. Write your funniest answer, read the room, and see whose punchline wins the biggest vote!" |
| `cards` | "It's Fill the Blank! You've got a hand of ridiculous answers and one very unfinished sentence. Pick the perfect punchline and see if your friends agree!" |
| `tracks` | "All aboard Fork in the Tracks! Two choices, one impossible decision. Pick your side, defend your thinking, and find out where everyone else stands!" |
| `bluff` | "Think you can Spot the Bluff? Someone's pretending to know the prompt, and they are counting on you believing them. Ask questions, read the room, and catch the faker!" |
| `potato` | "Things are heating up in Hot Potato! Answer quickly to pass the pressure to someone else. Don't get caught holding it when time runs out. Good luck!" |
| `quizrace` | "Welcome to Quiz Race! Think fast, answer correctly, and put your foot down! Every second counts as you race your friends to the finish line. Ready? Let's race!" |
| `showdown` | "It's Team Showdown! Bring your team together, share your knowledge and pile up the points. Only one side can take the victory — let the showdown begin!" |

## Future in-game voice states

Phase 1: **only** optional pre-game title intros on expanded tiles.

Phase 2, after testing accessibility and timing: optional short countdown ("Three! Two! One!"), winner/round ending stings, round breaks and rematch announcements, with a global **Audio / Mute** control in the TV host bar. Never read question answers or spoilers automatically; silence audio when the quiz itself needs attention.

## Acceptance tests for later implementation

- No sound until host chooses to play or enables Narrator. Volume never starts at max without a user gesture.
- Switching a tile stops the previous clip; repeated click/replay never overlaps two clips.
- Mute persisted per device. Host audio does not also play on every participant's phone.
- Captions/transcripts available; site fully functional without audio.
- Dynamic audio fetching occurs only on demand; no unnecessary app data usage on 4G/5G.
- No API keys embedded in the browser or server, and no ongoing generation costs.
- Playback/interrupt tested in Chrome, Edge, Android Chrome, iOS Safari; obey autoplay restrictions.
- Commercial license verified **before** any monetised deployment; attribution visible when a free non-commercial sample is published.

**This document is not evidence that audio files exist or that the website can play generated voiceovers yet.**

## Delivered implementation and credit usage

- Reusable client code: `public/narrator.js` (one audio channel, cancellation, optional local browser voice), `public/narration-scripts.js` (12 original transcripts and asset manifest), expandable tile markup in `public/home-launcher.js`.
- Permanent audio assets in this repository: `public/audio/narrator/classic.mp3`, `board.mp3`, `quizrace.mp3`. **MP3s are committed, not short-lived ElevenLabs URL references.**
- All 12 game previews have an opt-in **Listen to intro / Stop narration** button, a **Read spoken introduction** disclosure, and the existing Set up / Back actions. Audio stops on dialog/open/back/tab changes and when the page goes into the background.
- No audio preloads on the home page, and no ElevenLabs API key or paid AI call is used at runtime. Other nine intros are spoken by the phone/laptop browser using built-in English UK text-to-speech when the user presses Listen.
- Narrator voice in the three generated recordings: **Mark Munroe — British Radio Presenter and Voiceover Narration**; ElevenLabs ID `nrD2uNU2IUYtedZegcGx`. Model: `eleven_v4`. Each clip about 10 seconds. Generated 22 November 2026.
- Provider usage reported for these three clips: 199 + 203 + 202 = **604 ElevenLabs credits** (the tool also estimates a corresponding fiat equivalent; this does not establish whether the user's plan is billed).
- Free-plan noncommercial restrictions apply. Each recorded clip has a visible **Voice generated with ElevenLabs** link in its expanded tile. No commercial deployment rights are asserted.

**Remaining:** Generate the other nine ElevenLabs intros *when the provider's free generation capacity is available* and after checking applicable account usage/rights. Update `recordedIntros` in `public/narration-scripts.js` and add the matching static MP3s. Re-run `npm test` and browser playback tests. Do not rename fallback speech to an ElevenLabs recording until an MP3 is genuinely present.
