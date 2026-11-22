# Jambaloop — a Rookie Quest Games production

Jambaloop is an original multiplayer browser-game product within the planned **Rookie Quest Games** publishing label, part of the wider **Rookie Quest** family (Keeper, Forge, Worlds and the planned RPG). It remains its own game with distinct branding, code, domain and TV/phone experience. Other planned Games titles can share the publisher label later.

This is an active development project. Draft pull requests are not necessarily deployed to the live website; always check the branch and GitHub Actions before assuming a feature is published. See [the publisher and brand guide](docs/ROOKIE_QUEST_GAMES_JAMBALOOP_BRAND.md).

Jambaloop currently supports a big-screen host and phone controllers, with mode-specific capacity limits. The general server can host up to 300 participants for suitable modes. Includes more than 560 questions in 16 categories, with multiple-choice, true-or-false, closest-number, and put-in-order formats. Mixed formats rotate through all four. Choose from Quiz Club, Christmas, Neon Arcade, and Winter Lodge visual styles. Christmas is a selectable category. Turn on **Include Christmas questions** to add it to Mixed Bag, Spin the Wheel, or Board Race.

## Play at home

1. Install Node.js 18 or later on a laptop. Run `npm ci` and then `npm start` from this folder.
2. Open http://localhost:3000 on the laptop. Show it on the TV with HDMI or screen mirroring. A compatible TV browser can also open the laptop’s local network address.
3. Connect the laptop and phones to the same network. Host a game and have players scan the room’s QR code. Players can also enter the six-digit code or paste the full invite link into the code box.
4. Start when everyone is in the lobby. Players answer on their phones and the host advances after each reveal. Use **Quiz scoring** to set base points, the largest possible timed bonus, and double-point rounds.

## Play on a phone

Quiz Club fits a phone or small touch screen one page at a time. When a view needs more room, use **Back** and **Next** below it. This works for game and category browsing, captain settings, ballots, quiz editing and results. Use **Games** or **Topics** from the mobile home screen to jump directly to those sections.

## Game styles and effects

Every mode has its own stage palette, display font and animated backdrop. The fonts are bundled, so the game can load them over your local network. Turn on **Sound** on the TV for mode-specific transition cues and swooshes. Quiz Club follows your device’s reduced-motion setting for background and transition effects.

The game modes have distinct cover identities, with newer formats also using original typographic cover designs. Board Race has a brass and hardwood tower, a felt board, and four pawn silhouettes that match the standings. The die drops through opening gates, strikes four ramps and bounces onto the board. The timed animation settles on the number drawn by the room server. With TV sound on, the tower plays a clack at each impact. The camera moves closer for the drop and pulls back for the pawn’s route. Dice Rally uses a copper-trimmed tray and two separate bounce paths. Both games carry the roll result into the question screen. Reduced motion displays the settled result, and TV browsers without WebGL show a flat view.

## Browse and present

Filter categories by group or search by name. The four new categories are **Art & Design**, **Games & Puzzles**, **Animals**, and **Space & Astronomy**. Each adds 20 questions across the four answer formats. They support up to 15 questions with mixed formats or five when you choose a single format.

On the TV, **TV focus** hides host controls while the phone captain operates the game. Select **Exit TV focus** to bring them back. The shared screen shows round progress, a large countdown, live answers, and a top-three score panel after the reveal. The full leaderboard remains available below the question.

## Party lobby and phone display

Choose **Open party lobby** on the TV for an immediate room code and QR code. The first person to join becomes captain. On their phone, the captain can choose the game and question source, start it, advance rounds, and set up a rematch. The TV host also has controls and can transfer captaincy in the lobby. The TV shows who is connected, away, or ready. Players can tap **I’m ready** as a signal to the captain. The host or captain can still start as soon as the minimum number of players is connected. Refresh, open the join link again, or use **Resume a room** on the same browser to return with your name, avatar, and locked answers. Late arrivals can scan **Room** on the TV during a game and will be added when the next lobby opens.

## Leaderboard checkpoints

In quiz setup, choose **Leaderboard reveal** to show scores after **Every question**, **Every 3 questions**, **Every 5 questions**, or **Final scores only**. New quizzes in the browser start with every three questions. The answer reveal still tells players how they did. When a checkpoint is due, choose **Show leaderboard** to pause between questions.

On the shared screen, the checkpoint starts at the previous standings and reveals updated scores from the bottom of that board to the top. The rows then move to their new positions, with arrows and the number of places gained or lost. In larger rooms, scores are revealed in groups and you can page through the full standings once the animation ends. Players see their own standing on their phones. In Team Showdown the checkpoint ranks teams by score. Board Race ranks teams by spaces travelled and breaks position ties with points. Choose **Continue quiz** when the room is ready for the next question.

## Game Night playlists

Choose **Build a playlist** in the lobby to line up the games that follow the current one. Add your own choices or start with an approximate 15-, 30-, or 60-minute preset. The host and captain can reorder or skip upcoming games. Select **Load next game** from results to open the next lobby with the same room code, players, and avatars. Each game starts with fresh scores. Set a different quiz or time limit in the next lobby before starting it.

The captain or host chooses **Phone display** in game setup. **Show question and answers** puts the question and controls on each phone. **Answer controls only** keeps the question prompt on the TV and sends the buttons, number scroller, or ordering list to the phones.

## Private questions and party games

- **Team Showdown** defaults to **Private questions** when you select the mode. Each phone receives a different question in the same round. The TV shows the shared countdown and submissions, with team scores on the chosen leaderboard schedule. The player can review only their own questions. Turn the option off to play shared questions or use a saved custom quiz.
- **Spot the Bluff** needs at least three players. One randomly chosen player never receives the prompt during writing. Everyone submits a short reply, then the TV displays all replies and phones vote privately. The bluff is caught only if they get strictly more votes than anyone else. A tie lets them escape.
- **Hot Potato** needs at least two players. The room shares one two-minute countdown. Only the holder gets a multiple-choice question. A correct answer sends the potato to a randomly selected connected phone. Skips and wrong answers give the holder a new question and keep the potato with them. Whoever holds it at zero loses.
- **Selfies** are optional at join. Use the front-camera picker or choose a photo. The app crops and resizes it before sending it to the room. The server keeps avatars in memory for the room’s lifetime.

## Family games and the dice tower

- **Punchline Party** needs at least three players. Write a short reply to a funny prompt and vote for another player’s anonymous entry. Each vote is worth 100 points across three rounds. If more than six entries come in, six are randomly shortlisted for the ballot.
- **Fill the Blank** needs at least three players. Choose a phrase from your private six-card hand to complete the sentence. Vote for the best anonymous combination. Each vote is worth 100 points across three rounds. If more than six entries come in, six are randomly shortlisted for the ballot.
- **Fork in the Tracks** needs at least two players. Pick between two silly outcomes on your phone. The TV reveals the room’s choice across three dilemmas.
- **Board Race** shows a 3D dice tower on compatible TV browsers. On their turn, an active teammate taps **Roll the dice**, or the TV host can roll for them. The die tumbles down the tower and lands on the board before the pawn advances by the face value, stopping at the finish if fewer spaces remain. The face value is the base score and the difficulty level from 1 to 6. The landing tile chooses the genre. Timed rounds can add a speed bonus worth up to 25%, 50%, or 100% of the roll. Players on other teams can predict whether the roll will be high or low for fun.

## Create your own quizzes

Open **My quizzes** to write and save quizzes with any of the four answer types. Each quiz can have up to 40 questions. Saved quizzes are stored in the browser where you authored them. Use **Export** and **Import JSON** to move a quiz to another device or back it up.

Choose **Use quiz** from the library or select it as the **Question source** for Classic Quiz, Dice Rally, Knockout, or Team Showdown. A captain can also load a saved quiz from their phone into the live lobby.

## Answering questions

Open **Practice answers** for the four quiz formats or **Try a practice round** for the dice, wheel, and party games. Each mode also has a short captioned explainer video in its setup panel. Choose **Family mix · ages 8+** or **Challenge mix** for curated multiple-choice games from the standard trivia setup. These mixed-topic packs are separate options from the general question bank and saved quizzes.

- **Multiple choice and true or false** submit immediately when you tap an answer.
- **Closest number** uses the right-hand scroller, plus/minus buttons, or typed entry. Tap **Lock in number** to submit. The smallest absolute difference wins. Tied guesses all get the same base points. In Knockout, only the closest guesses keep their lives.
- **Put in order** uses the up and down buttons to reorder the list. Tap **Lock in order** to submit. The entire sequence must match to earn points.

Closest-number and put-in-order sessions offer five questions when you choose one category, or up to 15 in Mixed Bag.

## Game modes

- **Classic Quiz** has 5, 10, or 15 questions from a selected category or the Mixed Bag.
- **Spin the Wheel** has 5, 10, or 15 questions. The host spins before each question. The wheel uses each category once before drawing from all categories again.
- **Board Race** divides players into up to four balanced teams. On a team’s turn, a teammate or the host rolls a 3D die. The pawn moves to a category tile and everyone answers. The rolled number sets each correct answer’s base points and difficulty from 1 to 6. The bank has questions for each genre, grade, and answer format. Timed questions can award an optional speed bonus. Closest-number ties receive equal points. Choose a 16-, 24-, 32-, or 40-space route and two to four pieces. With fewer players than pieces, each player gets one piece. Every numbered tile has a genre, with genres repeating on longer boards. The first team to reach the finish wins after the question is scored. At the turn limit, the team that travelled farthest wins, with team points breaking a tie. Team points are the team's average points per player across the questions. The setup estimates time from the number of spaces, pieces and expected players, the turn limit, and the timer. Once players join, the lobby estimate uses the actual headcount. The range uses the 20th and 80th percentiles of first-finish dice odds with allowances for answering and advancing. Devices without WebGL use a flat board and dice faces. If the TV browser temporarily loses its graphics context during a game, the flat view appears until 3D recovers.

- **Dice Rally** rolls two 3D dice before each question. A total of 2–6 is worth ×1, 7–10 is worth ×2, and 11–12 is worth ×3. The same multiplier applies to every correct answer that round.
- **Knockout** gives each player three lives. Wrong and missed answers cost one life. Eliminated players can spectate and rejoin for the next game. Multiplayer games end when one or zero players remain, or when the questions run out. Players rank by lives first and points second. If the last players are eliminated together, points decide the winner.

- **Team Showdown** lets the host or captain choose two, three, or four balanced teams. Everyone answers on their own phone. Each round, a team earns the average of its players’ points, including misses. Highest team score wins, and players retain their individual scores.

For quiz modes, the TV counts up from last place to first. Larger rooms see several scores at a time until the podium. **Skip to full results** opens the full standings immediately. With reduced motion enabled, the app shows results immediately. Awards include the fastest and slowest submitted answers, most correct and incorrect answers, best streak, and correct answers after a miss.

After a quiz game, **Review questions** shows the answers and each player’s results. Phones get a personal scorecard with rounds won, best streak, and final rank. With **Answer controls only**, the TV retains the full prompts in the review.

After the final leaderboard, choose **Replay this game** to reopen the lobby with the same settings and players. Choose **Play again with this group** to open setup before the next game. Both options keep the room code. You can switch modes, categories, formats, and styles between games. Rematches use unseen questions whenever available. The host or captain can **Pause timer** in timed trivia or Hot Potato. The remaining time stays on screen, locked answers are kept, and speed bonuses use active play time. The host can switch sound cues on from the game screen. Turn on **Auto-reveal answers** during setup to reveal the answer once eligible players have submitted. The room gives temporarily disconnected phones a short grace period before advancing without them. The host can still reveal manually. The TV shows live submission progress and a vote breakdown after each reveal.

Keep the server running for the whole game. Rooms are stored in memory. If the join QR uses the wrong network address, set `PUBLIC_URL` to one all devices can reach. For example, `PUBLIC_URL=http://192.168.1.20:3000 npm start` on macOS or Linux.

## Large groups

The server pushes live updates and batches lobby and answer counts. The host can expand the full individual leaderboard. Players see the top ten and their own rank. Use a wired connection for the host computer if possible and test guest devices on the venue network. Guest Wi-Fi that isolates devices may require a shared hosted address instead of the laptop’s local address.


## Scoring and verification

Set base points, a maximum time bonus, and a double-points schedule for Classic Quiz, Spin the Wheel, Dice Rally, Knockout, and Team Showdown. The bonus decreases linearly as the timer runs down. Closest-number questions award equal base points to tied guesses. Double points multiply the base and its bonus. In Dice Rally, the roll multiplier also applies.

Run `npm test` to verify room sizes, reconnect behavior, playlists, scoring, awards, readiness, pause and replay, Board Race difficulty, and dice-tower clearances. The reconnect test waits for the server’s actual grace period.
