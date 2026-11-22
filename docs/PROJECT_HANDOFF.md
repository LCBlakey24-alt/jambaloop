# Quiz Club — GitHub handoff and technical baseline

**Source reviewed:** `Quiz-Club.zip`, provided 22 November 2026.

## Existing application

Quiz Club is an Express/Node.js web application with browser-based host and phone-controller interfaces. The uploaded source contains:

- 11 games: Classic Quiz, Spin the Wheel, Board Race, Dice Rally, Knockout, Punchline Party, Fill the Blank, Fork in the Tracks, Spot the Bluff, Hot Potato, and Team Showdown.
- 16 named trivia topics plus Mixed Bag, with more than 560 questions documented in README.
- Six-digit rooms and QR/invite links; hosts and phone captains; participant presence and reconnection; scores, checkpoints and playlists.
- Saved custom quizzes (stored in the author's browser), four quiz answer formats, themes, animations, and 3D dice visuals.
- Node.js/Express backend and vanilla-browser JavaScript frontend; `three`, `lucide-static`, and `qrcode` npm packages.

## Review findings

- Archive contains 118 ZIP entries (including directories and static assets).
- 34 `.js` files passed Node 22 `node --check` syntax validation.
- The 7 tests that do not require the missing npm dependencies passed (`scoring`, `room-clock`, `tower-motion`).
- Full integration tests (`test/game-night.test.js`) were **not** run because `npm ci --offline` could not retrieve uncached dependencies. Run `npm ci && npm test` in a networked development environment.
- Rooms and player state currently reside in an in-memory `Map()` inside `server.js`. For public, always-on multiplayer hosting, use a persistent long-running Node process initially; a serverless deployment that restarts or distributes requests across instances cannot be assumed to preserve rooms. Consider shared storage / pub-sub later.
- A 300-player limit is configured, but the integration tests visible in the upload exercised groups of 4, 12 and 30, not a 300-device load test.
- No `.env` file or obvious private key file was included in the archive; perform a full secret scan before making any repository public.

## Recommended source control setup

1. Create a **private** GitHub repository named `Quiz-Club` (or `Games-Night`, if using the umbrella product name).
2. Import the **contents** of the original ZIP into the repository root (do not put everything inside an extra `Quiz-Club/` directory).
3. Add `.gitignore` to ignore at least `node_modules/`, `.env`, `.env.*`, `.DS_Store`, local logs, coverage output, and build caches. Do not commit secrets.
4. Keep the original working baseline unchanged in the first commit. Use branches and pull requests for subsequent modifications.
5. In a Node.js 22 environment with network access: `npm ci`, `npm test`, `npm start`; test a host plus at least two real phone browsers on the same network.
6. Preserve all quiz content and licensed media/asset notices. Do not remove files merely because they are not referenced by one mode.
7. Configure `PUBLIC_URL` for hosted deployments so QR/invite links use the correct origin. Verify secure HTTPS and trustworthy forwarded headers.
8. Later add automated test checks on every pull request, then assess durable rooms, abuse controls and large-group performance before public release.

## Codex instruction (copy into the project)

> I am migrating my existing Quiz Club multiplayer games website into a private GitHub repository. The uploaded Quiz-Club.zip is the current baseline and must be preserved. Create or use a separate private repository called `Quiz-Club` (or `Games-Night` if that is the final product name), never a Rookie Quest or StageFlow repository. Import the archive contents into the root with no nesting. Add a safe `.gitignore`, check for secrets, retain all game modes and static assets, and commit the working baseline without a redesign. Install dependencies with `npm ci`, run `npm test` and `npm start`, then document any failures or deployment constraints. Use a new branch and PR for fixes after the baseline commit; do not replace existing functionality merely to make tests pass. Report the GitHub URL, first commit and remaining issues.

## First development priorities

1. Confirm project starts and a real TV/laptop and phones can join through code and QR.
2. Validate all 11 game modes and reconnect behavior on actual phones.
3. Check host/captain control security and protect public rooms against flooding/abuse.
4. Choose hosting that supports the existing in-memory multiplayer architecture; later consider persistent room state and multi-instance scaling.
5. Improve accessibility, error handling and mobile usability based on real playtesting without rewriting the core.
