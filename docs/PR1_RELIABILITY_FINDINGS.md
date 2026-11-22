# PR 1 reliability findings

Reviewed `0a00f97` against [Issue #1](https://github.com/LCBlakey24-alt/jambaloop/issues/1) and the [design audit](JAMBALOOP_CODE_AUDIT_AND_DESIGN.md). Reproductions ran against local Express processes or Chromium contexts.

## Confirmed and fixed

| Priority | Confirmed baseline behavior | Regression coverage |
| --- | --- | --- |
| High | A supplied forwarding host and scheme changed the room invite origin when `PUBLIC_URL` was unset. | Canonical config wins, malformed origins are rejected, and local invites ignore forwarding headers. |
| High | A photo URL returned bytes without room membership. The join endpoint accepted plain text labeled as JPEG. | Same-room host and player keys can read a JPEG. Anonymous and cross-room requests are denied. Chromium verifies the authenticated image renders in the TV roster. |
| High | Local room-creation requests all succeeded beyond the new per-IP limit. An anonymous read of a room updated its idle timestamp. | Creation and join budgets return a retry time, room capacity is bounded, and anonymous requests allow idle rooms and their photos to expire. |
| High | The same key opened multiple live streams. An older connection's close callback could change the active connection record. | Each key has one NDJSON stream, retains access to a REST snapshot, and can reopen after disconnecting. Old closes preserve the newer connection. |
| Medium | A stale Start or setup draft still succeeded after a different controller changed the lobby version. | Current versions succeed. Stale versions receive a conflict without changing lobby settings. Legacy clients may omit the version. |
| Medium | Fill the Blank accepted coerced card indices or threw on certain malformed choices. | Invalid choices return 400 and a valid selection can still be submitted afterward. |
| Medium | Invalid JSON got the default Express HTML error page. Nicknames could contain control characters or bypass duplicate detection by using an equivalent Unicode spelling. | Bad requests return short JSON errors. Nicknames are normalized and tested for duplicates and control characters. |
| Medium | A roster update replaced a focused lobby button. A malformed saved session threw before startup registered reconnect handlers. | Chromium verifies keyboard focus and Enter through roster changes, and recovery from a corrupt session without removing unrelated storage. |

## Verification and open risks

- Reviewed authorization on the join, ready, advance, timer, answer, rematch, playlist, and captain-transfer paths. Verified the first captain and host workflows and that a former captain cannot control the room after transfer. Per-player prompts, hidden answers, and anonymous ballots were exercised in local browser or API tests.
- Completed and rematched all 11 modes using localhost API clients. Chromium exercised a host and separate phone contexts across all 11 modes, including narrow portrait, landscape, and reduced-motion dice fallbacks. These are browser emulations. Physical devices, TV browsers, a deployed proxy, and unstable wireless networks remain unverified.
- A single synthetic localhost run opened 301 streams, submitted answers from 300 players, and reached the reveal. It sampled about 81 MiB server RSS at the reveal. Concurrent rooms, sustained traffic, photos, different device classes, and WAN behavior need separate measurement. The 300-player configuration is not a validated production capacity claim.
- Repeated joins from an abusive source across many IPs, authenticated request floods, edge limits, and overall server sizing still need review before public access. Run a single long-lived Node process as described in the [deployment notes](DEPLOYMENT_AND_TESTING.md).
- A disconnected Hot Potato holder can retain the potato until reconnecting or the existing round clock expires. That behavior was observed and remains a gameplay decision. The reconnect grace for other games is covered by integration tests.
- The reviewed exercise checked that tag-like text in player names and party replies displays as text. It did not substitute for testing every custom quiz field or for an independent security review.
- The UI still contains broad HTML rerenders and periodic timers. The lobby focus fix addresses the reproduced regression. Phone/TV accessibility, animation timing, asset transfer, and session update frequency need their own stages and measurements.
