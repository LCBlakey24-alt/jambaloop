# Spot the Bluff — complete multi-round game rules

**Jambaloop / Rookie Quest Games**  
**Status:** Proposed in draft PR, not merged or deployed.

## Objective

Spot the Bluff is an original room-based game for **at least three players**, with **3, 5 or 7 rounds**.

Each round, exactly one active player is selected to bluff. All other players secretly see the same light-hearted prompt. Everyone writes one short response from their own phone. The bluffer sees no prompt and must invent something that sounds plausible.

The TV does not reveal the secret prompt during writing. When writing closes, the prompt and submitted responses are shown and all players vote for another player's response. No player can vote for themselves. Responses from absent players who did not submit a reply are not eligible for votes.

## Rounds and scoring

- **Writing:** players privately submit one response of up to 100 characters; the TV only shows how many have replied.
- **Voting:** the original prompt and submitted responses are revealed. The identity of the bluffer is **not** revealed yet. Everyone votes privately for a different person.
- **Reveal:** the bluffer's identity, genuine vote counts, correct voter count and any earned points are revealed. The bluffer is **caught** if their response receives a strictly larger number of votes than any other response.
- **Correct identification:** each player who voted for the bluffer receives **100 points**, even if the bluffer ultimately escapes due to a tie.
- **Escape:** if at least one person voted, the bluffer submitted a reply and the bluffer is not caught, the bluffer receives **100 points**.
- **No fabricated votes or extra bonuses.** Scores persist between rounds. The highest total at the end wins, with shared first place for ties.

A tie for the highest vote count lets the bluffer escape. If nobody votes or the bluffer never submits an answer, no escape bonus is awarded. Correct voter points are applied once, as part of the server's transition into the reveal phase.

## Fairness and connection recovery

Bluff duties cycle through a shuffled queue of connected participants before the same person can bluff a second time (assuming that the active roster remains the same). When a new round begins, a disconnected person cannot be chosen as the bluffer. If fewer than three players are connected at the transition to the next round, the match finishes with the scores already earned.

Players who join partway through are held in the waiting room until the next game lobby, matching Jambaloop's general room behaviour. The existing 18-second reconnection grace still applies.

The server rejects stale submissions from old rounds and votes for oneself, non-participants or people who never submitted a response. The bluffer's role and the underlying prompt remain private until the intended phases.

## Content and presentation

Twenty-eight original family-friendly prompts, with per-room history to favour unseen prompts. A dedicated teal-and-gold TV layout separates writing, voting, reveal and final results, while phones have larger text and voting controls. No existing television-show branding, copyrighted graphics or audio are required.

## Quality requirements

- End-to-end 3/5/7-round configuration, scoring and replay validation.
- Tests for all players' secret prompts, role rotation, correct and incorrect guesses, tie handling, stale submissions and final standings.
- Browser verification for TV at **1280×720** and **1920×1080**, and player phone at **390×844**.
- The game should be considered for merging only after cumulative tests pass and someone has reviewed the draft PR. No production deployment is implied by a merge.
