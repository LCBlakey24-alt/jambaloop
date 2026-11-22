# Board Race branch paths and shared Solo / Teams setup

**Status:** Implemented and automated-tested in draft PR #8, not yet manually deployed to the family Render server. This is a gameplay expansion for the existing one-screen Jambaloop site.

## Solo vs Teams (game setup)

The host selects **Individual** or **Teams** before creating/configuring/rematching a room. Teams choices: **2, 3 or 4**. Everyone who joins is assigned round-robin by join order: e.g., 7 people and 3 teams → 3 Ruby, 2 Sapphire, 2 Jade. The lobby previews the groups. Assignment happens when the match starts; no separate team signup is required. A rematch resets assignments using the people currently in the lobby.

**Nine supported modes:** Classic Quiz, Spin the Wheel, Board Race, Dice Rally, Knockout, Punchline Party, Fill the Blank, Quiz Race and Team Showdown. The following modes remain individual-only until their distinct winning rules can be designed safely: **Spot the Bluff**, **Hot Potato**, **Fork in the Tracks**. No false Team option is enabled in their setup. All modes still work individually.

**Scores:** In most score-based team games, each player answers/submits individually, and the team score is the **average member score** (rounded to 2 decimal places), so unbalanced team sizes remain fair. No shared answer is exposed before reveals. Punchline Party and Fill the Blank calculate scores from voting as before, and publish the team scoreboard after the reveal. Knockout ends when only one team has living members; players still lose their own lives.

**Quiz Race:** Phones still race individually, but the first member across the finish wins **for their team**. Host sees a compact progress strip comparing the leading member on each team; no slow network-side voice generation is involved.

**Board Race Individual:** One separate pawn per player, maximum **four** because the current 3D board has four distinct pawn models/colours. Solo mode has no team-sharing, while Teams mode allows larger families to share 2–4 pieces. Larger solo groups must select Teams for Board Race. Solo Board Race's scoreboard uses player names.

## Forked Board Race paths

The physical board includes a shared route until the first quarter, then a fork on the right side, then a shared route again after halfway.

- **Power Lane:** the original, shorter perimeter with **three or more lane-dependent special tiles** (depending on board size), distinguished by **gold**. When the active team lands on a gold-only lane tile and answers correctly, **its own player's awarded answer points are doubled**; other teams answering the same shared trivia question earn their normal points. It can be a quick route to victory but offers fewer question turns.
- **Question Trail:** a separate visible **turquoise branch**, with **four extra spaces** compared with the Power Lane. Every dice roll still triggers a question, so the longer route creates *more chances for question turns on average*, not an extra question automatically every time the pawn passes a tile. No automatic ×2 bonus.
- **Same finish:** both lanes rejoin the original perimeter at halfway. A team cannot switch routes after passing the junction. The host or the active team's player(s) chooses the path before the first die that may cross the fork. The backend validates the choice and rejects rolling without one.
- Dice roll still controls the movement and question difficulty. A question's category follows the landing square. Power x2 only applies if landing in its special zone, rather than all turns.
- **Scoring/winner:** Board Race still ends when any piece reaches its own route's finish (which is the same physical finish), or the turn cap is reached. Standings compare **geographic progress**, not raw tile count, so the Question Trail's additional tiles cannot make a pawn look ahead despite being further from the real finish.

## Browser and game-engine checks

- Two-dimensional fallback shows shared board positions and a lane legend. Three.js board displays both physical lanes and interpolates each team's pawn along its selected route.
- Tests cover all board sizes 16, 24, 32, 40; branch geometry, rejoin and final tile, fair path progress, route-choice server permissions, lobby team assignments, board moves and response scoring, and Quiz Race team grouping.
- Chromium tests have passed at **1366×768 (2 teams/4 people)**, **1920×1080 (3 solo racers)**, **1024×768 (3 teams/3 people)**, with no outer page scrolling. An interactive physical TV/Android phone test is still recommended before public release.
- No new hosted services, storage, subscriptions or per-game API charges.

## Family website deployment

- **Live family site remains unchanged** while PR #8 is reviewed: https://jambaloop-family-test.onrender.com
- The deployment is deliberately manual. Merging PR #8 into the family branch alone does **not** redeploy the Free Render service.
- No changes to the existing narrator. The 3 ElevenLabs Mark Munroe clips remain recorded, and 9 other game intros use browser speech until the free provider's concurrency limit clears.
