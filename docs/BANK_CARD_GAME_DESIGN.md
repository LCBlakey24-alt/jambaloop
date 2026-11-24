# Bank — creator's Higher or Lower card game

**Status:** planning only; not implemented or released.  
**Origin:** a card game created by the Jambaloop project owner. **Working title:** Bank.  
**Tracker:** [GitHub issue #46](https://github.com/LCBlakey24-alt/jambaloop/issues/46).

## Rules confirmed by the creator (preserve these)

1. **Win target: 20 cards.** The first player to reach 20 cards wins; cards in the current run also need to be considered during the compulsory finishing stretch (exact automatic win accounting to confirm below).
2. **Deck:** ordinary playing-card ranks/suits with Jokers included. Ace counts as **1**, the lowest rank.
3. **Start of each turn:** flip the starting card face-up. The player may **replace it once**, but **must keep the replacement**. If the first card is a Joker, the player may use this replacement option; if the replacement is a Joker, it is unlucky and the Joker consequence applies. Do not offer a second replacement.
4. **Predict Higher or Lower** for the next card against the current face-up card. Successful guesses allow the player to continue choosing whether to push onward or, when permitted, bank.
5. **Earliest banking:** after **two cards have been drawn**, the player may call **BANK** to move eligible run cards into their persistent bank. Confirm precise starting-card counting before implementing.
6. **Banking cut-off at 15 TOTAL:** when the player's **existing bank + cards currently earned in this turn** reaches **exactly 15**, they have a choice: **BANK now** (subject to the two-card minimum) or **keep going all the way to 20**. **Once that combined total passes 15, banking is no longer available during that run.** They must risk the remaining predictions and reach 20 to win; they cannot bank at 16, 17, 18 or 19. The decision at exactly 15 is the defining final-stretch fork.
7. **Rank tie/pair:** if the next drawn card has the **same rank/number** as the previous/current card (e.g. two different sevens), this is an automatic **failed turn**. They **get nothing new**, their turn ends immediately and play passes to the next player. No higher/lower success, no extra turn, and **no new banking**. Existing saved cards remain safe because only a Joker removes cards already banked.
8. **Joker:** a Joker causes the player to lose **all previously banked cards**, even when close to 20. This is different from a failed higher/lower guess or a matching-rank pair. If a Joker is the first card, the player may choose to replace it; if the replacement is another Joker, the risk remains.
9. **Normal failed guesses:** the creator has explicitly stated that **banked cards are only lost to a Joker**. Whether a wrong higher/lower guess ends the turn and discards all current unbanked progress should still be specified precisely.

**Do not replace these with an ordinary permanently-safe push-your-luck bank or allow a pair to be a push / draw.**

## Remaining rules to resolve before implementation

- For banking eligibility, do the **first face-up card and one guessed card** count as the two drawn cards, or must two higher/lower predictions succeed after the starter?
- **Clarified:** the 15-card rule applies to the **total of saved cards plus cards earned in the current run**, not solely to how many were banked before the turn. Thus 12 banked + 3 current = 15 offers BANK or KEEP GOING (once banking's two-card minimum is met); 12 banked + 4 current = 16 **cannot BANK** and must continue towards 20. No partial banking or over-15 banking option was described. Confirm how starting face-up/replacement cards count in the run.
- Does reaching **20** with 15 saved cards plus five cards in the current unbanked run trigger immediate victory without a Bank action? This is the natural interpretation of the compulsory last five, but confirm the exact counting of starting/replacement cards.
- On a **wrong non-pair** higher/lower guess, does the turn finish and the whole current run disappear? The old bank is safe unless a Joker appears.
- Does an **initial Joker** immediately wipe the bank before the player gets their one replacement choice, or is its penalty evaluated only if kept/replaced by another Joker? Is a Joker found on the **replacement** an immediate bank wipe and end of turn?
- Does the Joker also remove the current unbanked run? The saved bank definitely disappears.
- Does the deck contain two Jokers? Is there a shared deck or separate deck per player? What happens when it runs out, and how are exact simultaneous wins resolved? Confirm J/Q/K values (likely 11/12/13) and whether an Ace drawn after a King is the lowest possible card.

Record creator-confirmed answers on [#46](https://github.com/LCBlakey24-alt/jambaloop/issues/46). Do not substitute assumptions from other card games.

## Proposed Jambaloop version: TV stage + simple phone controller

| TV | Player phone |
| --- | --- |
| Current player and face-up card on a large animated card table | Two large touch buttons: **Higher** and **Lower** |
| Current unbanked cards and each player's bank (not the secret future card) | **Change first card** appears only once at start of turn; replacement is final |
| Dramatic Joker wipe, pair failure and final five-card run | **BANK** appears only after minimum eligibility and before passing 15 combined cards. At exactly 15 choose BANK or continue; at 16–19 there is no BANK action |
| Scores, countdown/turn order, win screen, optional British presenter | Small status: your turn / locked / wait; no long instructional text |

Use an accessible full-card-text fallback for players who cannot see the television. A normal action should fit entirely on one phone screen without horizontal navigation or page-swiping. Design the 390×844 portrait, 844×390 landscape and tablet player screens *before* building animations.

## Distinction and roadmap positioning

**Bank** combines classic higher/lower card probabilities, first-card choice, and a particularly interesting persistent Joker risk that can wipe an already accumulated bank. This is different from Dice Rally's dice multipliers. It may **replace or become an alternative to the speculative Risk Vault concept**, which was proposed as a generic bank-or-risk game; do not add two near-identical game tiles.

Other traditional card games to assess after Bank: **Chase the Ace** (swap/elimination), **Blackjack/21** (dealer hit/stand), **Cheat** (claim/challenge) and **Sevens** (shared suit-building). Keep Rummy/other card-hand games lower priority if they require text-heavy player phones; make only distinct, well-tested games.

## Build sequence once rules are confirmed

1. Write an exact turn-state diagram and point/win rules. Validate Joker, changing first card and banking edge cases with examples supplied by the creator.
2. Implement a server-side deck and hidden future cards, seedable shuffle for tests, single-action locking, reconnect safety and idempotent scoring.
3. Create original TV card visuals and a compact phone controller without hidden actions or extra pages. Add accessibility/non-graphic family mode.
4. Run unit/integration checks, full game-session browser tests and a real mixed-device playtest. Confirm no spoilers, duplicate bank actions, Joker score corruption or inaccessible controls.
5. Only then register Bank as an active game mode and merge through reviewed CI. Render currently auto-deploys `main`; avoid merges while a live room is active, because server rooms are not persistent across restarts ([#41](https://github.com/LCBlakey24-alt/jambaloop/issues/41)).

**Do not implement guessed rules or duplicate the existing planned Risk Vault game.** Prioritise the controller-first pass [#45](https://github.com/LCBlakey24-alt/jambaloop/issues/45) and multiplayer reliability before adding new public game tiles.
