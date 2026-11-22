# Rookie Quest Games — Jambaloop product architecture

## Agreed brand positioning

**Rookie Quest** is the umbrella brand.

Within that umbrella, the distinct product areas are:

| Product/division | Role |
| --- | --- |
| Rookie Quest Keeper | Run and manage tabletop campaigns and characters |
| Rookie Quest Forge | Build and print tabletop terrain and accessories |
| Rookie Quest Worlds | Publish and sell adventures, settings and lore |
| Rookie Quest RPG | The planned original tabletop game system |
| **Rookie Quest Games** | Studio/publishing label for playable digital games |
| **Jambaloop** | The first proposed Rookie Quest Games title: multiplayer TV-and-phone party games |

This does **not** merge the game website with Keeper, Forge or Worlds. Games is the maker/publisher identity; Jambaloop is the actual game product that users find and play. Other digital titles (the planned basketball and wrestling simulations) can later share the publisher label while retaining separate names, design styles, codebases and domains.

## Public presentation hierarchy

1. **Primary product name:** `Jambaloop` — lead with it in the masthead, logo, app title, game menu, room QR screens and invitations.
2. **Small supporting publisher credit:** `A Rookie Quest Games production` — homepage eyebrow, website footer and TV lobby/results only.
3. **Parent context:** `Rookie Quest` — shown via the publisher name, not as a competing second masthead. Do not replace the Jambaloop logo with a Keeper or Forge mark.
4. **Do not move domains, rename GitHub repos, change room codes or sharing URLs** as part of a cosmetic branding change. These are separate migration projects that require explicit review.
5. **Do not claim Rookie Quest Games is a separate incorporated company, registered trademark, platform partnership or broadcaster.** It is a proposed creative publishing identity until the owner finalises legal/trademark and trading-name review.

## Visual and product rules

- Keep Jambaloop bright, social, playful, legible on TVs and easy to operate on phones.
- Retain its existing infinity-style brand identity, product wordmarks, icon, palettes, mode-specific TV-show treatments and optional narrator recordings.
- A subtle violet/pink/teal hint may connect the parent label to Rookie Quest, but don't apply Keeper's navy hexagon badge or RQK monogram to Jambaloop.
- The publisher credit must stay small and must never cover, shrink or delay the live question, timer, answer buttons, QR code, player names or results.
- Avoid title-screen delays, unskippable publisher-logo animations, or new modals requiring users to learn the company structure.
- Support `prefers-reduced-motion`, phone portrait, landscape tablet and 720p/1080p TV.
- Do not silently add links to a hypothetical parent homepage. Add only a verified, approved public Rookie Quest website when that site and destination are ready.
- Keep age-appropriate party content and the question verification/replayability policy independent of the publishing brand.

## House-style credits for future game releases

**Jambaloop**  
*A Rookie Quest Games production*

Future products can use the same formula:

**[Individual game title]**  
*A Rookie Quest Games production*

This lets the publisher grow a library of original games without forcing all games to share a visual genre or gameplay design.

## Relationship to other Rookie Quest roadmaps

Rookie Quest Games was previously a longer-term roadmap idea. Treat Jambaloop as the **first proposed Games title**, not a claim that a separate Rookie Quest Games storefront or company is launched. Do not add unfinished games to a public Rookie Quest homepage as playable/available until they actually exist.

## This implementation

The initial publisher-credit code is intentionally small, in a separate pull request:
- Page title and description identify the publisher while keeping Jambaloop first.
- The Jambaloop launcher has a small 'A Rookie Quest Games production' eyebrow.
- A footer credit appears when a relevant footer is present.
- TV lobby and game results carry a subtle publisher label. The active game stage is not interrupted.
- New CSS keeps the label responsive and deliberately hides the TV label when it would compete with gameplay.
- No external links, redirects, new tracking, passwords, purchases or legal claims have been added.

Before a public commercial launch: verify rights and availability of the **Rookie Quest Games** and **Jambaloop** brand names, finalise the actual business legal entity/trading disclosures, and update terms/privacy/contact information for the correct operator. The publisher name alone is not a substitute for these.
