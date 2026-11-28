# Jambaloop — a Rookie Quest Games production

Jambaloop is an original multiplayer browser-game product within the planned **Rookie Quest Games** publishing label, part of the wider **Rookie Quest** family (Keeper, Forge, Worlds and the planned RPG). It remains its own game with distinct branding, code, domain and TV/phone experience. Other planned Games titles can share the publisher label later.

This is an active development project. Draft pull requests are not necessarily deployed to the live website; always check the branch and GitHub Actions before assuming a feature is published. See [the publisher and brand guide](docs/ROOKIE_QUEST_GAMES_JAMBALOOP_BRAND.md).

Jambaloop currently supports a big-screen host and phone controllers across 22 game modes, with honest mode-specific capacity limits. Some trivia paths are configured for large rooms, but the 300-player ceiling is not a verified load-test result. The question library includes multiple-choice, true-or-false, closest-number, and put-in-order formats, plus separate original prompt banks for the newer game-show modes. Choose from Jambaloop Classic, Christmas, Neon Arcade, and Winter Lodge visual styles. Christmas is a selectable category. Turn on **Include Christmas questions** to add it to Mixed Bag, Spin the Wheel, or Board Race.

## Development roadmap and Claude Code handoff — 24 November 2026

**Live product:** 19 playable game modes (current status: [docs/STATUS_2026-11-25.md](docs/STATUS_2026-11-25.md)). **Planned concepts are not live features.** Jambaloop's current core is a big-screen host with player phones, guest room codes and server-authoritative gameplay.

For the next coding session, read [**CLAUDE.md**](CLAUDE.md) and the [dated Claude Code handoff](docs/CLAUDE_CODE_HANDOFF_2026-11-24.md) first, then consult the [game expansion roadmap](docs/GAME_EXPANSION_ROADMAP_2026.md) and the latest GitHub issues, branches, tests and Render deployment. The handoff is a snapshot; verify `main` against the deployed version before changing code.

**Next priorities:** fix reproducible multiplayer bugs and room-restart risk ([#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41)); deepen Hot Potato and Spot the Bluff ([#40](https://github.com/LCBlakey24-alt/jambaloop/issues/40)); keep increasing original prompts and source-reviewed trivia with no-repeat coverage; then prototype distinctly different games in isolated PRs.

**New design-only concepts:** [Secret Suspects — true anonymous personal secrets](https://github.com/LCBlakey24-alt/jambaloop/issues/42) and [Bloodmoon Council — vampire day/night hidden-role deduction](docs/BLOODMOON_COUNCIL_DESIGN.md) ([#43](https://github.com/LCBlakey24-alt/jambaloop/issues/43)). Neither is implemented, registered in the launcher or released. Do not copy another programme's branding, scripts, cards, artwork or narration; an original experience and new-player tutorials are required.

**Deployment warning:** the Render service is set to auto-deploy `main` on commit, although every release so far has been a manual deploy (see [the status note](docs/STATUS_2026-11-25.md)); treat any merge as a possible restart. The game server stores rooms, votes and scores in process memory, so a live deployment can interrupt an active session and lose its room state. Finish game sessions before merging where possible and verify the exact Render commit has reached **Live** before announcing release. The missing British narration MP3 pack (15 new files) is still a separate installation task; files in a plan do not imply the audio is bundled.

### Future TV voiceover and co-host narration — planned only

[Full-match narration and original two-presenter roadmap](docs/FULL_MATCH_NARRATION_AND_DUO_ROADMAP.md) ([Issue #61](https://github.com/LCBlakey24-alt/jambaloop/issues/61)) extends the existing short audio introductions to optional British spoken game instructions, **known/public** question or prompt readouts, stage transitions, rounds, voting, result reveals and rematches. TV hosts the voice with matching on-screen writing/captions; phones stay quiet, simple controllers. A later opt-in **Double Act** format would feature two original presenters exchanging prerecorded, funny lines via ElevenLabs multi-speaker Dialogue mode, without impersonating real UK presenters or reading unpredictable player text.

**Current truth:** all 19 modes have written intros, but only `classic.mp3`, `board.mp3` and `quizrace.mp3` are committed narrator recordings. Fifteen other previously provided recordings still need binary integration before claiming all intros use the professional British voice. No full-match or dual-host mode exists yet. See [existing British voice recording pack](docs/ELEVENLABS_BRITISH_NARRATOR_PACK.md). Finish mobile/multiplayer reliability work before adding optional, cost-controlled voice production.

### Future feature — optional player profiles and lifetime game stats

[Player profiles and statistics](docs/PLAYER_PROFILES_AND_STATS_ROADMAP.md) ([Issue #59](https://github.com/LCBlakey24-alt/jambaloop/issues/59)) are planned for a later phase, **not currently available**. If players choose to create accounts, they could see games completed, individual and team wins, per-game historic win rates with their match count, achievements and an optional end-of-night recap. A player could choose to show a small **opt-in** “form guide” on the TV before a game; this would be labelled **historical results, not a guaranteed chance to win**. Guests must always be able to join and play without an account. Private-by-default profiles, account deletion, age-appropriate design, secure identity and persistent storage all require review before implementation. Reliability and phone-controller improvements remain the current priority.

## Play at home

1. Install Node.js 22 on a laptop. Run `npm ci` and then `npm start` from this folder.
2. Open http://localhost:3000 on the laptop. Show it on the TV with HDMI or screen mirroring. A compatible TV browser can also open the laptop’s local network address.
3. Connect the laptop and phones to the same network. Host a game and have players scan the room’s QR code. Players can also enter the six-digit code or paste the full invite link into the code box.
4. Start when everyone is in the lobby. Players answer on their phones and the host advances after each reveal. Use **Quiz scoring** to set base points, the largest possible timed bonus, and double-point rounds.

## Play on a phone

Jambaloop adapts to phones and small touch screens. The launcher and setup can use **Back** and **Next** where needed, but live question controls, party voting ballots and final results use a **single scrollable phone surface** so no answer or vote option is hidden on another page. Use **Games** or **Topics** on the mobile home screen to jump directly to those sections.

## Game styles and effects

Every mode has its own stage palette, display font and animated backdrop. The fonts are bundled, so the game can load them over your local network. Turn on **Sound** on the TV for mode-specific transition cues and swooshes. Jambaloop follows your device’s reduced-motion setting for background and transition effects.

The game modes have distinct cover identities, with newer formats also using original typographic cover designs. Board Race has a brass and hardwood tower, a felt board, and four pawn silhouettes that match the standings. The die drops through opening gates, strikes four ramps and bounces onto the board. The timed animation settles on the number drawn by the room server. With TV sound on, the tower plays a clack at each impact. The camera moves closer for the drop and pulls back for the pawn’s route. Dice Rally uses a copper-trimmed tray and two separate bounce paths. Both games carry the roll result into the question screen. Reduced motion displays the settled result, and TV browsers without WebGL show a flat view.

## Desktop game library and ongoing content

On TVs and laptops (at least 1000 × 600 px) the home screen opens on the **game shelf**: a curved 3D carousel of every game. The centred game's own identity (face, colours and background) takes over the whole page, its card explains how to play, and an optional **voice guide** reads each introduction once the shelf settles (the three recorded clips where available, otherwise the device's own read-aloud; nothing plays until it is switched on). Browse with a TV remote's or keyboard's ← →, a swipe, a scroll or a click; choosing the centred card opens its setup. **Show all tiles** switches to the full gallery (remembered on that device). When a game starts, the TV plays a short title sting in that show's identity, and a brief "Final question" or "Final round" band before the last one (TV only, decorative, skipped for reduced motion). In the lobby, the captain's phone (or the TV) can flick between games with ‹ › and the TV lobby re-themes to each show as it arrives; full options stay under **Choose game**. At normal desktop screen sizes the tile gallery shows **all 19 game modes at once**, without requiring a page change or scrolling the main screen. Smaller laptops and landscape tablets continue using readable paginated tiles; the phone launcher retains four games per page.

The trivia library now has **26 named topics plus Mixed Bag**: 18 everyday subjects (including **Words & Language** and **Maths & Numbers**) and 8 **specialist packs** — **Football, NBA Basketball, NFL, NHL Ice Hockey, Formula 1, Olympics, Disney & Pixar and Superheroes** — each with at least 50 multiple-choice, 20 true/false, 5 estimate and 5 ordering questions. Specialist packs are played as a topic of their own (Classic, Knockout, Dice Rally, Showdown, Quiz Race and more) and are kept out of Mixed Bag, Spin the Wheel and Board Race so everyday games stay balanced. Everyday topics were topped up too (about 1,100 everyday questions across all formats in Mixed Bag). Pack questions use settled facts, and anything time-sensitive names its year; they are editorially reviewed but not labelled source-verified. Both new genres work with multiple choice, true/false, estimate and order formats, and have appropriate Board Race difficulty selections. The same question banks feed Classic Quiz, Wheel, Board Race, Dice Rally, Knockout, Team Showdown, Hot Potato and Quiz Race.

Content grows with major development releases: earlier content expansion included 166 static quiz questions across the four formats, 227 creative prompt/phrase cards, six Rare Find answer sets and 60 extra calculated Brain Ladder variants. The Party Games 2.0 update added a further **100 original family-friendly prompts/cards** (30 Punchline prompts, 30 Fill the Blank prompts and 40 phrase cards). Content expansion has automatic format and duplicate checks, but **factual answers still require independent editorial/source review before a public release**. See [Content Expansion Playbook](docs/CONTENT_EXPANSION_PLAYBOOK.md).

## Browse and present

Filter categories by group or search by name. The four new categories are **Art & Design**, **Games & Puzzles**, **Animals**, and **Space & Astronomy**. Each adds 20 questions across the four answer formats. They support up to 15 questions with mixed formats or five when you choose a single format.

On the TV, **TV focus** hides host controls while the phone captain operates the game. Select **Exit TV focus** to bring them back. The shared screen shows round progress, a large countdown, live answers, and a top-three score panel after the reveal. The full leaderboard remains available below the question.

## Party lobby and phone display

Choose **Open party lobby** on the TV for an immediate room code and QR code. The first person to join becomes captain. On their phone, the captain can choose the game and question source, start it, advance rounds, and set up a rematch. The TV host also has controls and can transfer captaincy in the lobby. The TV shows who is connected, away, or ready. Players can tap **I’m ready** as a signal to the captain. The host or captain can still start as soon as the minimum number of players is connected. Refresh, open the join link again, or use **Resume a room** on the same browser to return with your name, avatar, and locked answers. Late arrivals can scan **Room** on the TV during a game and will be added when the next lobby opens.

## Leaderboard checkpoints

In quiz setup, choose **Leaderboard reveal** to show scores after **Every question**, **Every 3 questions**, **Every 5 questions**, or **Final scores only**. New quizzes in the browser start with every three questions. The answer reveal still tells players how they did. When a checkpoint is due, choose **Show leaderboard** to pause between questions.

On the shared screen, the checkpoint starts at the previous standings and reveals updated scores from the bottom of that board to the top. The rows then move to their new positions, with arrows and the number of places gained or lost. In larger rooms, scores are revealed in groups and you can page through the full standings once the animation ends. Players see their own standing on their phones. In Team Showdown the checkpoint ranks teams by score. Board Race ranks teams by spaces travelled and breaks position ties with points. Choose **Continue quiz** when the room is ready for the next question.

## Game Night playlists

Choose **Build a playlist** in the lobby to line up the games that follow the current one. Add your own choices or start with an approximate 15-, 30-, or 60-minute preset covering both established and newer shows. The host and captain can reorder or skip upcoming games. Select **Load next game** from results to open the next lobby with the same room code, players, and avatars. Each game starts with fresh raw scores. The games-night table instead awards three, two or one stars for podium places, so a 10,000-point quiz is not unfairly added to a 200-point party game; tied places share the same stars. Set a different quiz or time limit in the next lobby before starting it.

The captain or host chooses **Phone display** in game setup. **Show question and answers** puts the question and controls on each phone. **Answer controls only** keeps the question prompt on the TV and sends the buttons, number scroller, or ordering list to the phones.

## Private questions and party games

- **Team Showdown** defaults to **Private questions** when you select the mode. Each phone receives a different question in the same round. The TV shows the shared countdown and submissions, with team scores on the chosen leaderboard schedule. The player can review only their own questions. Turn the option off to play shared questions or use a saved custom quiz.
- **Spot the Bluff** needs at least three players and supports selectable **3, 5 or 7 rounds**. A rotating player secretly receives no prompt, only a hint at the kind of answer to write ("A place", "A reason or an excuse"); the hint goes to that phone alone. Each person writes privately, then votes for another player who submitted a reply. The reveal has two beats, both timed by the server: first the vote count with the most suspected player marked, then, five seconds later, the bluffer; no name, result or score is sent before the unmasking. Each correct vote earns **100 points**; the bluffer earns **50 for every player fooled** and **100 escape points** if they submitted a reply and were not the sole top-voted player. A tie for the most votes lets the bluff escape. The final screen names the Sharpest Eye and the Best Bluffer. The family bank has 203 prompts. Scores carry through the match and reveal a final winner. Bluff role assignments cycle before anyone repeats whenever the same players remain connected.
- **Hot Potato** needs at least two players. The room shares one two-minute countdown. Only the holder gets a multiple-choice question. A correct answer sends the potato to a randomly selected connected phone. Skips and wrong answers give the holder a new question and keep the potato with them. Whoever holds it at zero loses. The TV seats everyone in a circle (their optional selfie, or an initial) with a pulsing, steaming potato in front of the holder; it beats faster and glows redder as the clock runs down, ticks each second when TV sound is on, and arcs across the circle to the next holder after a correct answer. Seats keep join order, disconnected players are greyed out, and reduced-motion settings show the potato without the jump or pulse.
- **Selfies** are optional at join. Use the front-camera picker or choose a photo. The app crops and resizes it before sending it to the room. The server keeps avatars in memory for the room’s lifetime.

## Family games and the dice tower

- **Punchline Party** needs at least three players. Write a short reply to a funny prompt and vote for another player's anonymous entry. Choose 3, 5 or 7 rounds; **every valid submitted entry** appears on the ballot, and players cannot vote for their own. Votes are worth **100 points normally and 200 points in the final round**.
- **Fill the Blank** needs at least three players. Choose a phrase from your private six-card hand to complete the sentence. You can **refresh your six-card hand once per round before locking in**. Choose 3, 5 or 7 rounds; all valid entries appear on the anonymous ballot, with **100-point votes normally and 200-point votes in the final round**. Other players and the host cannot see your private hand.
- **Fork in the Tracks** needs at least three players. Every player becomes Trolley Driver once. In each round the remaining players are reshuffled into two balanced teams, and each team chooses from three positive cards, three sabotage cards and three final-defence cards. The Driver then pulls the lever; the spared team scores and individual scores persist across the reshuffle.
- **Board Race** shows a 3D dice tower on compatible TV browsers. On their turn, an active teammate taps **Roll the dice**, or the TV host can roll for them. The die tumbles down the tower and lands on the board before the pawn advances by the face value, stopping at the finish if fewer spaces remain. The face value is the base score and the difficulty level from 1 to 6. The landing tile chooses the genre. Timed rounds can add a speed bonus worth up to 25%, 50%, or 100% of the roll. Players on other teams can predict whether the roll will be high or low for fun.

## Create your own quizzes

Open **My quizzes** to write and save quizzes with any of the four answer types. Each quiz can have up to 40 questions. Saved quizzes are stored in the browser where you authored them. Use **Export** and **Import JSON** to move a quiz to another device or back it up.

Choose **Use quiz** from the library or select it as the **Question source** for Classic Quiz, Dice Rally, Knockout, or Team Showdown. A captain can also load a saved quiz from their phone into the live lobby.

## Answering questions

Open **Practice answers** for the four quiz formats or **Try a practice round** for supported dice, wheel, puzzle and party games. Setup panels provide written rules and an optional spoken introduction; recorded audio is used only where a credited asset is bundled. Choose **Family mix · ages 8+** or **Challenge mix** for curated multiple-choice games from the standard trivia setup. These mixed-topic packs are separate options from the general question bank and saved quizzes.

- **Multiple choice and true or false** submit immediately when you tap an answer.
- **Closest number** uses the right-hand scroller, plus/minus buttons, or typed entry. Tap **Lock in number** to submit. The smallest absolute difference wins. Tied guesses all get the same base points. In Knockout, only the closest guesses keep their lives.
- **Put in order** uses the up and down buttons to reorder the list. Tap **Lock in order** to submit. The entire sequence must match to earn points.

Closest-number and put-in-order sessions offer five questions when you choose one category, or up to 15 in Mixed Bag.

## Game modes

- **Classic Quiz** has 5, 10, or 15 questions from a selected category or the Mixed Bag.
- **Spin the Wheel** has 5, 10, or 15 questions. The host spins before each question. The wheel uses each category once before drawing from all categories again.
- **Board Race board (26 November 2026):** one square lap of touching spaces round the edge of the board, then a four-space finishing straight in to the middle. 24 spaces by default. The lanes split at the first corner and rejoin at the second: Power Lane up the edge, Question Trail on a slimmer lane inside it. A team chooses its lane only when its piece is standing on that corner, and a roll that would pass it stops there. Landing exactly on a corner collects that corner's power-up for the team: 50/50 (removes two wrong answers from the live question, on that team's phones only), New Question (throws out the live question and asks a fresh one for everyone), Double Points (double on a question; must be played before the team answers) and Half Points (played on a rival, who scores half on their next question). Any teammate plays them from their phone; the TV shows what each team is holding, what is in play and who has been halved.
- **Board Race** divides players into two to eight balanced teams, or up to eight solo racers with a piece each (raised from four on 26 November 2026; other team games stay at 2–4 teams). On a team’s turn, a teammate or the host rolls a 3D die. The pawn moves to a category tile and everyone answers. The rolled number sets each correct answer’s base points and difficulty from 1 to 6. The bank has questions for each genre, grade, and answer format. Timed questions can award an optional speed bonus. Closest-number ties receive equal points. Choose a 16-, 24-, 32-, or 40-space route and two to four pieces. With fewer players than pieces, each player gets one piece. Every numbered tile has a genre, with genres repeating on longer boards. The first team to reach the finish wins after the question is scored. At the turn limit, the team that travelled farthest wins, with team points breaking a tie. Team points are the team's average points per player across the questions. The setup estimates time from the number of spaces, pieces and expected players, the turn limit, and the timer. Once players join, the lobby estimate uses the actual headcount. The range uses the 20th and 80th percentiles of first-finish dice odds with allowances for answering and advancing. Devices without WebGL use a flat board and dice faces. If the TV browser temporarily loses its graphics context during a game, the flat view appears until 3D recovers.

- **Dice Rally** rolls two 3D dice before each question. A total of 2–6 is worth ×1, 7–10 is worth ×2, and 11–12 is worth ×3. The same multiplier applies to every correct answer that round.
- **Knockout** gives each player three lives. Wrong and missed answers cost one life. Eliminated players can spectate and rejoin for the next game. Multiplayer games end when one or zero players remain, or when the questions run out. Players rank by lives first and points second. If the last players are eliminated together, points decide the winner.

- **Quiz Race** supports up to twelve simultaneous individual racers. Correct speed boosts and wrong, skipped or missed slowdowns are private to each phone while the TV shows the live race.
- **Same Page** asks everyone for a private creative answer and rewards players whose normalised answers match.
- **Spotlight Wheel** rotates every player through the contestant role, selects a private expert, and scores the contestant and expert independently.
- **Brain Ladder** uses 240 original calculable puzzles across five-, seven- or ten-level climbs, with two lives per player and private answers.
- **Top Answers** creates a genuine live poll from the room, then scores predictions from the actual vote totals rather than invented survey data.
- **Rare Find** checks typed answers against 40 finite curated catalogues. Unique accepted answers score 200, pairs score 100 each, and groups of three or more score 50 each. Unrecognised answers enter a host-only review with an in-room audit trail before scoring.
- **Sketch Sprint** is the 18th game: three, five or seven rounds for at least three players. One rotating artist sees a secret original prompt and draws on a phone; vector ink appears live on the TV while everyone else gets five private guesses. The first correct guess scores 150 points, second 100 and later correct answers 75; the artist earns 50 if anyone recognises the drawing. Rounds last up to 90 seconds, with 300 original drawable prompts and no copyrighted picture assets. See the [British ElevenLabs narrator pack](docs/ELEVENLABS_BRITISH_NARRATOR_PACK.md) for the 15 remaining optional MP3 recordings. Three existing recordings remain available and other introductions continue to use browser-based British speech when supported.

- **Catch Up** *(22nd game — added 26 November 2026; not yet playtested with a real group)*: 2 to 30 players in two sides. One side has 60 seconds to answer as many questions as it can; the question is on the TV and anyone on the side answers on their phone, first answer counts. The other side then gets 60 seconds and fresh questions to beat that number (matching it is not enough). A wrong answer freezes the side briefly. The sides swap for a second round.
- **Way Off** *(21st game — added 26 November 2026; not yet playtested with a real group)*: 3 to 30 players. Everyone scrolls to a guess at the same number question while the TV shows every guess turning live. When the answer is revealed the guess furthest from it is out (a quarter of the room in big groups), and anyone who did not guess is out too. A fresh question follows with fewer players until one is left. If nobody guesses, nobody goes.
- **Bloodmoon** *(20th game — added 26 November 2026; not yet playtested with a real group)*: 5 to 16 players. Every phone is dealt a secret role (Vampires, one Oracle, one Warden, Villagers); the TV never receives them. Each night everyone chooses privately on their own phone; each day the room talks and votes to banish a suspect. A tie banishes nobody. The village wins when every vampire is out; the vampires win when they match the village. Max and Poppy narrate the public moments from pre-recorded lines.
- **So Close** *(19th game — live since 25 November 2026)*: two or more players estimate real-world measurements on a phone number wheel (swipe, ▲/▼ or typed entry) and lock in. No range is shown on any screen while guessing — the server withholds it until the reveal — so guesses start at zero and each player picks a step size (1, 10, 100, 1K, 10K, 100K or 1M) for the wheel. Any whole number from zero upwards is accepted. Closest-number questions in the other quiz modes use the same rule. The closest guess scores 100, an exact guess 200, tied closest players share equal points, and there is no speed bonus. The TV reveals every guess on a measuring scale, builds suspense, then shows the actual value and winner; the server releases each stage, so no phone or TV can see the answer early. Questions come from a 72-prompt sourced measurement bank.

- **Knockout survivor ladder:** a ladder beside each question on the TV shows every player's three pixel hearts.
  - **Losing a heart:** when someone gets one wrong, their heart shatters into pixels with an 8-bit "hit" sound.
  - **Knocked out:** on their last heart, a big ✕ stamps across their photo with a KO jingle, and they drop into the knocked-out row as everyone below moves up a rung.
  - **Phones:** each player's phone breaks their own heart with a short buzz.
  - **Sounds:** synthesised in the browser, TV-only and opt-in.

- **Team Showdown** lets the host or captain choose two, three, or four balanced teams. Everyone answers on their own phone. Each round, a team earns the average of its players’ points, including misses. Highest team score wins, and players retain their individual scores.

**Welcome to Jambaloop:** once a lobby-first room has players and a captain, the TV plays Max and Poppy's animated welcome. It covers what Jambaloop is, how the TV and phones work together, how to join, the captain's job, how answering works and the range of games. Each line has its own scene (`public/welcome-show.js`) and caption. It plays once per room and can be replayed from the lobby.
- **Captain skip:** the captain can tap **Skip intro** on their phone, and the hosts sign off with a random quip ("Looks like this lot already know what they're doing!").
- **Welcome back:** a phone that has seen the welcome or played a game remembers it. If everyone connected has been before, the hosts say "Welcome back!" and the captain chooses **Play the intro** or **Skip, let's play**.
- **Browsing:** the welcome steps aside as soon as the captain starts browsing.

**Double Act intros (Max & Poppy):** every game has a short, original two-host intro in `public/duo-scripts.js`, and all of them are **recorded**, along with the welcome, the welcome-back exchange and the skip quips (24 takes in `public/audio/duo/`).
- **Voices:** ElevenLabs Dialogue (`eleven_v3`) with mood tags such as `[excited]`, `[whispers]` and `[laughs]`, so each exchange is one natural take. Max is "Mark Munroe" and Poppy is "Vicky Cowan"; both are original characters, not impersonations.
- **Captions:** they follow each line's recorded timing (`public/duo-recordings.js`) and never show the mood tags.
- **Fallback:** if audio can't play, the device's British voices or timed captions take over.
- **Tools:** `scripts/generate-duo-voices.mjs` records (it skips existing takes and checks the month's characters first), and `scripts/check-duo-voices.mjs` transcribes every take and compares it with the script.

**Host reactions (Sound on):** during quiz rounds Max or Poppy drops in one short recorded line on the TV: nobody right, everybody right, only one right, a three-in-a-row streak, no answers, a knockout, the halfway point and the final question. The rules live in `reactionFor()` (`public/show-moments.js`). Lines never name players, never overlap another line, and rotate through variants.

**Guest commentators:** Max and Poppy hand two games over to original guest characters (not impressions of real commentators).
- **Knockout:** Baz and Clive call it from ringside as two-man exchanges ("And they're DOWN! That is a knockout!" / "Stay down, son. It's over.").
- **Quiz Race:** Vince calls it from the commentary box: the start, lead changes, close battles and the chequered flag.
- Scripts are `knockoutReactions` and `raceCalls` in `public/duo-scripts.js`.

**Quiz Race power-ups and cars:** every racer gets **one Boost** (a 3-second burst without answering) and **three Rams** per race. A ram slows the nearest rival for 2.5 seconds, only lands when someone is within range, and a miss costs nothing. The server decides charges, range and timing. Phones show who's in range and what's left, and the victim's phone shakes and names who hit them. Vince calls every hit and boost. The 3D cars are low, wide sports cars with a rear wing, rimmed wheels, a tail-light bar and twin exhausts.

**3D polish:**
- **Backdrop:** a live 3D backdrop (`public/stage-3d.js`) floats game pieces (dice, stars, hearts, gems, rings and pawns) in depth behind the landing page and the TV lobby, lit in the colours of the game in front. It loads three.js on demand, only on larger screens, pauses when hidden, and is off with reduced motion or data saver.
- **Transitions:** panels swing in with perspective, the header drops in, dialogs rise, and TV answer pads stand up.
- **Quiz Race:** a closer camera, and visible power-ups. A rammed car flashes red and fishtails; a boost glows white-hot with a long flame.

**Game stings:** each game has its own short musical sting on its title card (`public/audio/sfx/sting-<game>.mp3`), written in that game's style.

**TV sound (opt-in, phones silent):** original ElevenLabs sound effects (`public/audio/sfx/`: drum-roll, reveal sting, correct chime, lock-in pop, whoosh, wheel, boxing bell, sizzle, fanfare, cheer) and two original instrumental themes (`public/audio/music/`: a looping lobby theme that dips under the hosts, and a winners' theme). They only play when the TV host turns Sound on. Generated with `scripts/generate-sfx.mjs`; made on a paid ElevenLabs plan.

**Lobby first:** **Host game night** puts a lobby on the TV before any game is chosen. Everyone joins, then the captain swipes a carousel of game tiles on their phone. The TV's 3D shelf glides in step and takes on each game's look, and other phones show what's being browsed. **Play** chooses the game, and the TV introduces it out loud. **Browse all games** reopens the carousel from any lobby.

**Show artwork:** every game has its own original illustrated scene (`public/scenes/`, generated from `public/show-scenes.js` in that game's palette by `node scripts/build-show-scenes.mjs`). The scene is the game's home tile, with its own logo treatment and emblem crest and no tagline. The same scene sits behind that game's TV and phone panels, its lobby card, its title sting and its thumbnail in the setup picker, so each game looks like the tile that launched it.

**Show moments (quiz rounds):**
- **Lock-ins:** each player's face stamps onto the TV as they lock in; it never shows what they chose.
- **Reveal:** a short drum-roll, then the wrong answers drop out one by one before the right answer flares. Phones hold their verdict for the same beat, and right/wrong badges then flip onto the stamps.
- **Scoreboard:** each player's gain pops beside their new total, and streaks of three or more earn a 🔥.
- **Last five seconds:** the clock beats like a heart, with a red glow at the screen edges. With sound on, the TV ticks.
- **Reduced motion:** everything shows its final state at once.

For quiz modes, the TV counts up from last place to first. Larger rooms see several scores at a time until the podium. **Skip to full results** opens the full standings immediately. With reduced motion enabled, the app shows results immediately. Awards include the fastest and slowest submitted answers, most correct and incorrect answers, best streak, and correct answers after a miss.

After a quiz game, **Review questions** shows the answers and each player’s results. Phones get a personal scorecard with rounds won, best streak, and final rank. With **Answer controls only**, the TV retains the full prompts in the review.

After the final leaderboard, choose **Replay this game** to reopen the lobby with the same settings and players. Choose **Play again with this group** to open setup before the next game. Both options keep the room code. You can switch modes, categories, formats, and styles between games. Rematches use unseen questions whenever available. The host or captain can **Pause timer** in timed trivia or Hot Potato. The remaining time stays on screen, locked answers are kept, and speed bonuses use active play time. The host can switch sound cues on from the game screen. Turn on **Auto-reveal answers** during setup to reveal the answer once eligible players have submitted. The room gives temporarily disconnected phones a short grace period before advancing without them. The host can still reveal manually. The TV shows live submission progress and a vote breakdown after each reveal.

Keep the server running for the whole game. Rooms are stored in memory. If the join QR uses the wrong network address, set `PUBLIC_URL` to one all devices can reach. For example, `PUBLIC_URL=http://192.168.1.20:3000 npm start` on macOS or Linux.

## Large groups

The server pushes live updates and batches lobby and answer counts. The host can expand the full individual leaderboard. Players see the top ten and their own rank. Use a wired connection for the host computer if possible and test guest devices on the venue network. Guest Wi-Fi that isolates devices may require a shared hosted address instead of the laptop’s local address.


## Scoring and verification

Set base points, a maximum time bonus, and a double-points schedule for Classic Quiz, Spin the Wheel, Dice Rally, Knockout, and Team Showdown. The bonus decreases linearly as the timer runs down. Closest-number questions award equal base points to tied guesses. Double points multiply the base and its bonus. In Dice Rally, the roll multiplier also applies.

Run `npm test` to verify room sizes, reconnect behavior, protected avatars and live streams, playlists and normalized standings, scoring, awards, readiness, pause and replay, newer game-show rules, Board Race difficulty, and dice-tower clearances. The reconnect test waits for the server’s actual grace period. Automated passes are not a substitute for a real multi-phone group playtest; see `docs/RELEASE_READINESS_2026-11-23.md` for the current evidence and blockers.

### Jambaloop as an app on your phone (28 November 2026)

No app store: phones install Jambaloop straight from the browser, and it then opens full screen from its own home-screen icon, like any other app.
- **Android (Chrome, Edge, Samsung Internet):** tap **Install Jambaloop** on the phone's home screen, or the browser's ⋮ menu → **Install app** (some versions say **Add to Home screen**).
- **iPhone and iPad:** in Safari, tap the Share button, then **Add to Home Screen**. The phone's home screen shows these steps.
- The app is the website, so it never needs updating: new games appear by themselves. A QR code from the TV still opens the browser for guests who have not installed it.
- Files: `public/manifest.webmanifest` (name, icons, colours), `public/app-icons/` (cut from the supplied logo), `public/sw.js` (shows `public/offline.html` when there is no internet; games and the room API never come from a cache), `public/install-app.js` (the install button). The TV is never offered it: the Fire TV has its own app.
- Checked in Chrome: no installability errors, the button asks the browser, the offline page shows, the TV gets nothing. Not yet installed on a real phone.

### Playing on a TV stick (28 November 2026)

- A Fire TV Stick's browser (Silk) reports a small 960×540 page and a remote instead of a mouse, so the site used to take it for a phone. It is now recognised as the TV: by name (Fire TV models report an `AFT…` code, and common smart-TV browsers are recognised too), by having no touchscreen, or by choice.
- On a recognised TV the page is laid out at 1280 wide, the size every TV screen is designed and tested at, and the browser scales it to the screen. Hosting goes straight to the TV lobby, with no "made for a TV" prompt.
- If a TV is not recognised, open `jambaloop-family-test.onrender.com/?tv` once on it (or press **On a TV?** beside "No downloads" on the home page and choose **This is our TV**). The choice is remembered on that device; `?auto` clears it. The same page shows what the device reports.
- Phones that try to host still see the prompt, now with **This screen is our TV: host here**. On a touchscreen that choice lasts for that visit only, and opening a join link on a touchscreen is always the phone view.
- Not yet tested on a real Fire TV Stick: the exact browser identity Silk sends there is not documented by Amazon.
- Home tiles: the game type and player count are on a solid strip under the artwork, no longer printed over it; on narrow tiles "1+ players" shortens to "1+".

### Quiz Race additions (27 November 2026)

- **Three circuits**, one per race length: a short oval, the medium figure of eight with its bridge, and a long circuit with four ramps, two hairpins and a chicane. A crowd of little people bobs along both sides of the road, with trees, rocks, tyre stacks, floodlights and trackside boards that change with the track theme.
- **Symbol Dash** (a second race type, chosen in setup, added 28 November 2026): no questions. Each phone shows a target symbol and a grid of six, nine or twelve different symbols (by difficulty; Mixed grows through the race). Tap the match and the kart speeds up, more for a quick tap, and the grid reshuffles at once; the wrong square or four seconds of doing nothing slows it. Nudges, the shield, the tracks and the league are the same. A boost is earned at ten right in a row and the kart is on fire at fifteen. Above the grid the phone shows a small driver's-eye view of your own kart and anyone close by; the TV shows the whole track. Which square is right is never sent to a phone, and no grid is sent to the TV. Not playtested; the how-to-play guide and Vince's intro still describe the quiz race only.
- **League** (a setup option): three races, short then medium then long, each on the next track theme. Every place scores (10, 8, 6, 5, 4, 3, 2, then 1), the table is shown on the TV between races, and the most points wins; level on points, the better result in the latest race is ahead. Nudges, boosts and the shield are topped up for every race.
- **Nudge** (three per race): slows the nearest rival alongside for a moment. Tapped with nobody alongside, it is wasted and does not come back until the next race.
- **Boost** (two per race, up to three in hand): tap it before your next question. A right answer is worth double speed; a wrong answer, a pass or a timeout wastes it.
- **On fire**: five right answers in a row and flames pour out of the back of the kart on the TV until the run ends.
- **Shield** (one per race): blocks nudges for six seconds; the attacker's nudge is still spent.
- **Turbo**: three right answers in a row earn one more boost.
- **Slipstream**: a car tucked 0.4–3 track units behind a rival runs 12% faster.
- **Final sprint**: over the last 15% of the track a right answer's speed boost is worth half as much again.
- The TV standings show a shield, a fresh turbo and a slipstream beside each name; Vince calls a nudge, a wasted nudge, a boost, a blocked nudge, a turbo, a kart on fire and the final sprint.
- Not playtested with people; the numbers are provisional.

### Fork in the Tracks: After Dark (27 November 2026)

An adults-only (18+) deck of dark, morbid humour for the trolley game, in `fork-after-dark.js`: 50 things nobody could bear to hit, 50 things the world would not miss, and darker scene and stage prompts. The host switches it on in the game's settings ("After Dark cards · adults only"); it is off by default, labelled 18+ in the lobby and on the TV, and never mixed with the family deck. Other games are unaffected.

### After Hours (27 November 2026)

The adults-only setting now covers five games: Fork in the Tracks, Punchline Party, Fill the Blank, Spot the Bluff and Same Page. The host switches on "After Hours · adults only (18+)" in the game's settings; the lobby and every screen during play show an 18+ tag. Prompts are in `after-hours.js` (36 punchline set-ups, 34 blanks, 60 answer cards, 26 bluff prompts, 26 Same Page prompts) and `fork-after-dark.js`. A room uses either the family set or the After Hours set, never both.

### Selfies as avatars (27 November 2026)

A player's selfie (or their initial) now appears beside their name in every game, including the nine screens that previously showed names only. Views look a player up in the room's roster through `public/player-face.js`.
