# Jambaloop family test — free public hosting

This file documents the proposed **zero-plan-cost Render Free web service** for Jambaloop. **Source preparation is not a live deployment**. Use the existing `feature/04-quiz-race-mvp` branch and `render.yaml` for the free-family test.

## What this enables

- One `https://...onrender.com` link on a laptop, tablet, TV browser or phone.
- Everyone joins the **same cloud multiplayer server** using their own Wi-Fi or 4G/5G.
- The QR code uses the HTTPS URL provided by the hosting environment. No `192.168.x.x` address or Windows firewall configuration is required when using the cloud site.
- One small Node.js process running the existing Express website and multiplayer API. No separate database or paid add-on is included.

## Confirmed free-tier limits — Render (November 2026)

Official docs: https://render.com/docs/free

- Free web service compute plan exists at $0, with **750 free running instance hours per workspace/month**. A spun-down service does not use running hours.
- A Free service spins down after about **15 minutes without inbound traffic**. The first visitor may wait roughly a minute for it to wake up.
- Render may restart the service at any time. **All in-progress Jambaloop rooms currently live only in the Node process's memory and will be lost after a restart, redeploy or free-tier spin-down.**
- Free plan cannot attach a persistent disk, and free Postgres expires after 30 days. Do not add a database for a family demo without a separate decision.
- Bandwidth and pipeline/build minutes count against free monthly allowances. **Render's docs say overage may be billed when a payment method is on file; without one, service/build suspension may occur instead.** To avoid unexpected charges, check the workspace billing settings and spend limit *before* deployment; do not enable a paid plan or paid add-ons.
- Free web services have publicly reachable URLs. **An unlisted URL is not a privacy control.** Avoid uploading personal data or photos until multiplayer security PR #2 has been incorporated and tested.

## Technical configuration

See `render.yaml` in the repository root:

- `plan: free` — NEVER change without consent.
- `region: frankfurt` — nearest available to users in the UK.
- `runtime: node` and `NODE_VERSION: 22`.
- `buildCommand: npm ci`, `startCommand: npm start`.
- Deploy branch: `feature/04-quiz-race-mvp`. Later migrate to a tested release branch after PR reconciliation.
- `autoDeployTrigger: "off"` to prevent unreviewed feature-branch commits from automatically restarting family game sessions.
- Node binds to `process.env.PORT` on `0.0.0.0`, already supported in `server.js`.
- `room-invite.js` receives `process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL`. The latter is automatically supplied by Render and carries the HTTPS public origin.

## When ready to create the service

1. Confirm the Render workspace; do not deploy into an unrelated workspace.
2. Review free plan status and billing overage rules (payment method/spend limits).
3. Prefer the connected Render action to create ONE web service configured with **plan free**, Frankfurt, Node 22, public GitHub repo, `feature/04-quiz-race-mvp`, `npm ci`, `npm start`, `autoDeploy: no`.
4. Wait for service deployment to report success and obtain **the exact returned Render URL**; never assume it matches the proposed service name.
5. From a laptop open the actual HTTPS URL, create a room and scan the QR from a phone using **mobile data with Wi-Fi off**. Repeat with Wi-Fi, run a Quiz Race, test reconnect and start-over.
6. Check live browser dimensions: 1366×768 laptop, 1920×1080 TV, portrait phone and landscape tablet.
7. Do **not** merge draft PRs #2/#3/#5 automatically. The public test branch has known remaining security and device-testing tasks. Review those and update a separate deployment branch as needed.

## Testing checklist

- Laptop/TV can create a room and see the QR, room code and game without vertical page scrolling at common resolutions.
- QR decodes to `https://<the-real-host>/` with `?join=123456`.
- A second device on 4G/5G loads the site and joins. If the service was asleep, open the host page first and allow wake-up.
- Two players ready/start/answer/pass; race finishes and rematch works.
- Room resets after service restart/spin-down are expected in MVP. Warn the family of this limitation.
- Check usage and build minutes in Render dashboard during testing. Stop if the service would incur charges.
- If the site needs to be kept private to family, add optional access control before sharing outside the family; a public link alone is not restricted.

## No unnecessary extras

Do not provision paid PostgreSQL, Redis, a domain name, storage buckets, workers, cron jobs, or additional replicas. They aren't needed for a small family test.
