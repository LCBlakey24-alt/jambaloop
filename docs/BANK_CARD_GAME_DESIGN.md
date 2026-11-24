# Bank — creator's Higher or Lower card game

**Status:** planning only; not implemented or released.  
**Origin:** a card game created by the Jambaloop project owner. **Working title:** Bank.  
**Tracker:** [GitHub issue #46](https://github.com/LCBlakey24-alt/jambaloop/issues/46).

## Rules supplied by the creator (preserve these)

1. The main action is predicting **higher or lower** than the visible card.
2. Players can **bank their cards after two cards**. The exact eligibility count must be clarified rather than assumed.
3. **A Joker appearing makes you lose all cards you already have in your bank.** Banking is therefore not a permanent safe zone; this is a defining feature, and must not silently become ordinary push-your-luck banking.
4. A player has the **choice to change the first card at the start of their turn**. The number of free changes and resulting Joker interaction are not yet specified.

**These four statements are the only confirmed rules.** Any full rules, scoring or digital interactions below are proposed until the original creator decides.

## Unresolved rules (ask before building the engine)

- What counts as 'two cards': the initial face-up card plus one guessed card, or two successful predictions after the starting card?
- After becoming eligible to bank, can players continue predicting to accumulate more cards in the current run? Is banking optional on every subsequent step?
- On an incorrect prediction, does the current run vanish, does the turn end, and are previously banked cards unaffected? This is different from the clearly specified Joker penalty.
- Are cards worth one point each, their face values, or something else? When and how does the overall game end?
- Can the player change the first card once or any number of times? Is a Joker possible as a replacement?
- What happens if the next card has the same rank? Is Ace always high, always low, or selectable?
- Does a Joker also remove the player's *unbanked* run, or only the cards already in their bank?
- Number of decks and Jokers, shared deck vs individual decks, reshuffle and deck-exhaustion policy, multiplayer turn order and tied outcomes.

Record confirmed answers on [#46](https://github.com/LCBlakey24-alt/jambaloop/issues/46) before treating this as a completed ruleset.

## Proposed Jambaloop version: TV stage + simple phone controller

| TV | Player phone |
| --- | --- |
| Current player and face-up card on a large animated card table | Two large touch buttons: **Higher** and **Lower** |
| Current unbanked cards and each player's bank (not the secret future card) | **Change first card** appears only when eligible at start of turn |
| Dramatic Joker reveal and clearly visible bank being wiped | **Bank cards** appears only when eligible; brief action confirmation |
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
