# Jambaloop — British ElevenLabs narrator recording kit

Updated 23 November 2026 · 18 games, 3 recordings committed, **15 additional MP3 exports supplied by the user in ChatGPT and awaiting repository upload** (includes Sketch Sprint).

## Recording and download

- Open [ElevenLabs Text to Speech](https://elevenlabs.io/app/speech-synthesis) in your signed-in account.
- Select **Mark Munroe — British Radio Presenter and Voiceover Narration**, voice ID `nrD2uNU2IUYtedZegcGx`. This was available in the linked ElevenLabs voice browser.
- Choose a UK English natural/upbeat delivery, with one take of each script. Do **not** generate 4 variants per game: that multiplies credit usage.
- Copy each script below, generate it, and download the finished **MP3**. Name the files **exactly** `<mode>.mp3` (e.g. `wheel.mp3`).
- Upload the downloaded files to this ChatGPT conversation or add them to `public/audio/narrator/` in the Jambaloop repository. Once verified as real files, each game can be added to `recordedIntros` in `public/narration-scripts.js`.
- Keep transcripts visible and narration **opt-in** so no phone-data or ElevenLabs credit charges occur during normal play. Until an MP3 exists, the browser's `en-GB` speech synthesis remains the fallback.

**Important:** All 15 outstanding recordings were subsequently supplied by the user as MP3s on 23 November 2026. They have been renamed and packaged in ChatGPT, but **the binary MP3 files are NOT yet committed to GitHub**. No game may be registered in `recordedIntros` until its real MP3 exists in the repository. The original first attempt was queue-rejected without charge; later exports are present.

## Existing recordings (do not regenerate)

- `classic.mp3`
- `board.mp3`
- `quizrace.mp3`

## Missing introductions — copy one block at a time

### 1. wheel.mp3

> Step right up for Spin the Wheel! Give it a spin and find out what category comes next. One wheel, plenty of surprises, and a lot of points to win!

### 2. dice.mp3

> Roll into Dice Rally! The dice decide your points multiplier, but your answers decide the score. A lucky roll helps — a clever answer makes it count!

### 3. knockout.mp3

> Here comes Knockout! Three lives each, and every wrong answer puts you under pressure. Hold your nerve, stay in the game, and be the last one standing!

### 4. punchline.mp3

> Welcome to Punchline Party! The sillier the prompt, the better. Write your funniest answer, read the room, and see whose punchline wins the biggest vote!

### 5. cards.mp3

> It's Fill the Blank! You've got a hand of ridiculous answers and one very unfinished sentence. Pick the perfect punchline and see if your friends agree!

### 6. tracks.mp3

> All aboard Fork in the Tracks! Two teams choose their cards, then a different Trolley Driver pulls the lever each round. Everyone gets a turn behind the controls!

### 7. bluff.mp3

> Think you can Spot the Bluff? Someone's pretending to know the prompt, and they are counting on you believing them. Ask questions, read the room, and catch the faker!

### 8. potato.mp3

> Things are heating up in Hot Potato! Answer quickly to pass the pressure to someone else. Don't get caught holding it when time runs out. Good luck!

### 9. showdown.mp3

> It's Team Showdown! Bring your team together, share your knowledge and pile up the points. Only one side can take the victory — let the showdown begin!

### 10. samepage.mp3

> Welcome to Same Page! Read the prompt, write your first thought, and hope your friends think exactly like you. Every matching mind earns you points!

### 11. spotlight.mp3

> Welcome to Spotlight Wheel! Everyone gets a turn as the contestant. Spin to reveal a trivia topic and a fellow player who will offer expert advice. Listen carefully, make your choice and shine in the spotlight!

### 12. brain.mp3

> Welcome to Brain Ladder! Ten levels of original puzzles, two lives per player, and a tougher challenge at every step. Think carefully, lock an answer and see how high you can climb!

### 13. topanswers.mp3

> Welcome to Top Answers! First, vote for the answer you really prefer. Then guess which choice the rest of this room picked most. We'll reveal the actual votes on the big screen — no mystery surveys, just your crowd!

### 14. rare.mp3

> Welcome to Rare Find! Give a correct answer that you think nobody else will choose. We'll check the verified answer list, review unusual entries, and reveal how many players thought alike. Stand out to score big!

### 15. sketch.mp3

> Welcome to Sketch Sprint! One player becomes the artist, with a secret picture to draw on their phone. Everyone else races to guess what appears on the big screen. Fast fingers, sharp eyes, and plenty of laughs. Ready, set, sketch!


## Uploaded recordings — integration checklist (23 November 2026)

These additional MP3 files have been uploaded to the ChatGPT conversation and packaged as `jambaloop-complete-narration.zip` with the correct `public/audio/narrator/` folder structure. This ZIP is a conversation artifact, **not a GitHub commit**. Extract the ZIP and upload the audio files to the PR development branch, avoiding any replacement of the three existing MP3s. The filename match follows the chronological recording/export order and should be checked by listening to each game title before release.

| Game | MP3 file |
| --- | --- |
| Spin the Wheel | `wheel.mp3` |
| Dice Rally | `dice.mp3` |
| Knockout | `knockout.mp3` |
| Punchline Party | `punchline.mp3` |
| Fill the Blank | `cards.mp3` |
| Fork in the Tracks | `tracks.mp3` |
| Spot the Bluff | `bluff.mp3` |
| Hot Potato | `potato.mp3` |
| Team Showdown | `showdown.mp3` |
| Same Page | `samepage.mp3` |
| Spotlight Wheel | `spotlight.mp3` |
| Brain Ladder | `brain.mp3` |
| Top Answers | `topanswers.mp3` |
| Rare Find | `rare.mp3` |
| Sketch Sprint | `sketch.mp3` |

After binary upload, update `recordedIntros` in `public/narration-scripts.js` to include all 18 mode IDs, update `test/narration.test.js` to assert the actual committed file set, and check every MP3 endpoint and click-to-play on desktop/tablet/phone. Keep the existing opt-in narration behaviour and readable transcript. For future fuller tutorials, use a separate optional How to Play narration after players open each game, rather than lengthening the short homepage intros.
