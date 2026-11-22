# Jambaloop deployment and testing

## Local development

Use Node.js 22 and npm.

```bash
npm ci
npm test
npm start
```

Open `http://localhost:3000` on the host computer. Phone controllers on the same Wi-Fi can use the LAN address displayed next to the QR code. The host's firewall must allow incoming connections on the selected port. Networks that isolate wireless clients may block local play.

## Initial hosted setup

Run `npm start` as one long-lived Node.js process behind an HTTPS reverse proxy. Use one replica and one worker process. Route the homepage and the entire API to that process. Set `PUBLIC_URL` to the public origin, for example `https://games.example.com`. Set `PORT` to the port used between the proxy and Node. Keep the Node port private.

Disable response buffering for `/api/rooms/*/live` so NDJSON updates reach phones promptly. The proxy's idle read timeout should exceed the server's 12-second heartbeat. Configure the proxy to overwrite incoming forwarding headers before forwarding the request. If Express needs the client address for rate limits, set `TRUST_PROXY` to the immediate proxy's exact IP address or trusted CIDR. With that setting unset, limits use the address of the direct connection. Invite URLs use the configured public origin independently of forwarding headers.

| Setting | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port the Node process listens on |
| `PUBLIC_URL` | Local interface and port | Public join-link and QR origin |
| `TRUST_PROXY` | Unset | Trusted forwarding hop addresses for client IP detection |
| `MAX_ROOMS` | `128` | Total live or retained rooms in memory |
| `ROOMS_PER_MINUTE` | `12` | Room creation requests per source IP |
| `JOINS_PER_ROOM_PER_MINUTE` | `360` | Join requests per source IP and room |
| `ROOM_IDLE_MS` | `14400000` | Idle retention when all live streams are closed, plus up to one cleanup interval |

Room codes, score state, and uploaded photos live in memory. A restart or rollout ends every active room. Participants can reconnect to the same process while the room is retained. Closing a browser tab does not revoke membership immediately, so that a player can reconnect to their existing seat. Photos are optional, accessible to authenticated members of the same room, and removed when the room expires or the process restarts.

Serverless requests and multiple Node processes would see different in-memory rooms. Before adding replicas, measure load and define a single owner or transactional shared store for game state and clocks, a cross-instance event channel, and durable membership and expiration. Validate reconnects and rollout behavior under load before adopting that design.

## Verification

- Run `npm test` on Node.js 22. The integration tests launch their own local servers.
- Follow [the browser test instructions](../test/browser/README.md) for the opt-in Chromium checks.
- On a real TV or laptop and two phones, create a room, scan the QR code, and confirm that the public hostname matches the address opened on the TV.
- Test starting from the phone captain, making a selection, losing Wi-Fi temporarily, and resuming with the same nickname and answer.
- Confirm the staging reverse proxy streams updates without buffering and accepts reconnects after the original connection drops.
- Treat 300 registered players as a configured room limit. The current automated multiplayer checks exercise up to 30 players. Test concurrent streams, answer bursts, repeated rooms, and memory on deployment-class hardware before advertising measured capacity.
