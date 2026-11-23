# Hot Potato — disconnected-holder recovery (draft)

**Jambaloop / Rookie Quest Games**  
**Branch:** `feature/19-hot-potato-recovery-legacy-qa` (based on merged 17-game `main`). This is a proposed change, not yet merged or deployed.

## Why this exists

Previously, if the current Hot Potato holder lost phone connectivity, they kept the potato for the remainder of the two-minute round unless they reconnected. With other players unable to answer in their place, the game could stall while everyone waited.

We retain the **two-minute shared clock** and **existing 18-second reconnect grace period**. Once the current holder has genuinely disconnected for longer than the grace period, the **TV host** receives a labelled recovery button.

## Exact mechanics

- The button appears on the **TV host only**. It never appears while the holder is connected or inside the 18-second reconnection grace.
- Only a host credential may use the `POST /api/rooms/:code/potato-rescue` action. It requires the current game ID and question-step number.
- A recovery is allowed only while Hot Potato is active, unpaused, before time expiry, the holder is genuinely disconnected, and at least one other participant is currently online.
- The potato is reassigned randomly to one of the **currently connected players other than the absent holder**.
- The next person gets a fresh private question. The original holder's stale answer cannot be submitted for the new question.
- **The 120-second clock is not restarted or extended.**
- A rescue counts separately from a successfully answered pass (`rescues` versus `passes`); host recovery is not misrepresented as a correct answer.
- After the host rescues a round, the disconnected player may still reconnect to their original room seat for future games and turns.

## Fairness and limitations

This is a **host-discretion recovery tool** rather than an automatic pass. It is deliberately unavailable during normal reconnection grace, while paused, or if no other player remains online. This avoids punishments during a momentary network blip and prevents a player from submitting a request to skip their own turn.

An intentionally disconnected holder could still benefit from a host rescue. Hosts should use the control for genuine lost connections and agree on a group rule if someone deliberately disconnects to avoid being caught. We have **not** added a new disqualification or penalty rule unilaterally.

## Test coverage

- Unit tests simulate an offline holder, active grace, paused/expired rounds and the absence of alternative online players.
- API tests enforce host-only access, stale question-step rejection, and inability to reassign a connected player.
- A Chromium TV-and-phone acceptance test verifies that the rescue button only appears after the reconnect grace, then checks a real reassignment, private phone question, unchanged timer, no horizontal/vertical TV overflow at 1280×720, and phone display at 390×844.
- A separate full five-round **Fill the Blank** test verifies private hands, real vote tallies and cumulative final scores as part of the older-game release-readiness audit.

This draft requires green GitHub Actions and a real-device playtest before it should be accepted for release.
