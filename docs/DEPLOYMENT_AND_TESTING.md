# Quiz Club deployment and testing notes

The original uploaded source (22 November 2026) is preserved in this repository. The initial GitHub migration adds only the gitignore, documentation and GitHub Actions checks; it intentionally makes no changes to game logic or UI.

## Local development

Requires Node.js 22 and npm, with an internet connection to install dependencies:

```bash
npm ci
npm test
npm start
```

Open `http://localhost:3000` on the host computer. To join from phones on the same Wi-Fi, use the LAN address shown by the host/invite URL. Ensure the computer's firewall allows access to the app, and that client isolation is disabled on the network.

## Hosting

This Express app must run as a long-lived Node.js service in its present architecture, because rooms are stored in a process-local `Map` and their state is lost on process restart. Do **not** assume a serverless deployment or multiple replicas will work correctly for one shared game session.

Set `PORT` to the port configured by the host, and set `PUBLIC_URL` to the canonical HTTPS origin (for example `https://games.example.com`) so QR and invite links have the correct trusted address.

Evaluate proxy and forwarded-host trust before a public launch, and never commit passwords, environment files or API tokens. If deploying beyond private testing, add durable rooms, capacity/load testing, rate limits/abuse protection, and client reconnect checks.

## Verification checklist

- `npm ci` installs cleanly with Node.js 22
- `npm test` runs all tests (including integration tests that launch the Express server)
- A host can create a six-digit room; a second device can join by code and QR
- Try each of the 11 game modes end to end, including phone controls and scoring
- Try reconnecting and refreshing host and player devices
- Try 4, 12, and 30 players before separately testing larger groups under realistic conditions
- Verify games hosted on a public HTTPS URL and `PUBLIC_URL` invite links

## Known limitations of initial migration verification

In the ChatGPT container used to prepare this handoff, network dependency installation did not complete. The 7 standalone tests passed; server-backed integration tests remain unverified. The README contains a 300-player product limit, but that is not equivalent to an audited load test.
