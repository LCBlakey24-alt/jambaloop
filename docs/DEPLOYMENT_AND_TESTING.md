# Jambaloop deployment and testing notes

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

The HTTP boundary has conservative in-process limits which can be tuned with positive integer environment variables:

- `MAX_ROOMS` (default `128`)
- `ROOM_IDLE_MS` (default four hours)
- `ROOMS_PER_MINUTE` (default `30` per resolved client address)
- `JOINS_PER_ROOM_PER_MINUTE` (default `360` per room and resolved client address)

Leave Express proxy trust disabled unless the exact reverse-proxy hop is understood. When a deployment requires the real client address for rate limiting, set `TRUST_PROXY` to an Express-compatible trusted proxy value; do not blindly use a permissive value. `PUBLIC_URL` remains the source of truth for public QR links.

Evaluate proxy and forwarded-host trust before a public launch, and never commit passwords, environment files or API tokens. If deploying beyond private testing, add durable rooms, capacity/load testing, rate limits/abuse protection, and client reconnect checks.

## Verification checklist

- `npm ci` installs cleanly with Node.js 22
- `npm test` runs all tests (including integration tests that launch the Express server)
- A host can create a six-digit room; a second device can join by code and QR
- Try each available game mode end to end, including phone controls and scoring
- Try reconnecting and refreshing host and player devices
- Try 4, 12, and 30 players before separately testing larger groups under realistic conditions
- Verify games hosted on a public HTTPS URL and `PUBLIC_URL` invite links

## Known limitations

Rooms, rate-limit buckets and player photos remain process-local and disappear on restart. Multiple Node replicas still cannot share one room. Automated 4-, 12- and 30-client regressions are useful correctness checks, but are not a production load test and do not validate the configured 300-player ceiling.
