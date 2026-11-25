# Individual Game Show Redesign Programme
Owner-approved direction, 24 November 2026. One Jambaloop platform, independently recognisable original game shows. This is a staged programme, not a claim that every screen has been redesigned.

## Acceptance contract for each show
- Original wordmark and cover artwork; independently identifiable palette, typography, stage architecture, motion language and sonic identity. Not a recoloured shared template.
- TV: deliberate compositions for lobby/introduction, gameplay, timer, transitions, answer reveal, checkpoint, winner ceremony and replay. Readable at 1280×720 and 1920×1080 without outer scrolling.
- Phone: private role/answer information only, clear game-specific controller, visible errors and locked answers, no pagination of live controls, one-handed targets, keyboard-safe 320px/390×844/844×390 layouts. Keep the full-question accessibility option.
- Respect reduced motion, focus, readable contrast, long names/prompts, different room sizes, all existing theme choices, reconnection, private payloads and existing game rules. Do not animate every stream update.
- Original/cleared graphics and sounds only; use shared audio scheduling with distinct recorded introductions and phase scripts later. No paid services or generated audio unless approved.
- Maintain shared authoritative room/game state, controls and network contracts. Isolate visuals by mode ID. New visual presentation must not fork scoring or duplicate game engines.
- Every major release adds source-reviewed factual content and/or original relevant prompts, with duplicate and suitability checks. Keep content changes reviewable.
- Run npm ci, npm test, full browser suite, plus screenshots and real TV/phone playtest before marking complete. Reconcile open gameplay PRs #53–58 first or rebase after integration. No auto-merge or deployment during active rooms.

## Sequence and creative direction
| Batch | Mode | Original environment and central visual device |
|---|---|---|
| 1 | Classic Quiz | Midnight-blue and gold broadcast studio; rectangular illuminated answer panels and trophy finale |
| 1 | Spin the Wheel | Purple/gold carnival marquee; giant category wheel and circular controller language |
| 1 | Knockout | Industrial red/charcoal elimination arena; life counters and survival rows |
| 2 | Board Race | Felt and hardwood tabletop, miniature board and brass tower |
| 2 | Dice Rally | Art Deco dice salon, copper/red velvet tray and multiplier reveal |
| 2 | Quiz Race | Arcade circuit, vehicles, speedometer, boost and chequered finish |
| 3 | Punchline Party | Comedy club, brick stage and microphone reveal |
| 3 | Fill the Blank | Collage and scrapbook, cards physically completing sentences |
| 3 | Fork in the Tracks | Miniature railway junction, two tracks and mechanical lever |
| 4 | Spot the Bluff | Noir investigation, dossiers and evidence boards |
| 4 | Hot Potato | Cartoon kitchen, temperature gauge and frantic handoffs |
| 4 | Same Page | Pastel connected thought bubbles and match animations |
| 5 | Team Showdown | Esports arena, opposing banners and team scoreboard |
| 5 | Spotlight Wheel | Theatre, focused contestant spotlight and expert selection |
| 5 | Top Answers | Retro survey studio, flip-board reveal and popularity bars |
| 6 | Brain Ladder | Puzzle laboratory, ascending platforms and holograms |
| 6 | Rare Find | Treasure vault and gemstone rarity reveals |
| 6 | Sketch Sprint | Artist studio with live canvas, supplies and drawing tools |

## Batch 1 implementation status
- First CSS pass: three distinct stage environments, panels, countdown appearances, answer buttons, and reveal motion, with shared palette tokens.
- Second pass: original vector marks (trophy, carnival wheel, survival shield) in launcher tiles, previews and setup; individual host lobby studio labels; game-specific ceremony frame styling and finale labels. Generic scoring, standings, skip controls and server timings remain unchanged.
- Added 16 original, mathematically checkable Maths & Numbers questions: four each of multiple choice, true/false, closest number and put in order. Appended to existing packs without shifting existing question indices. Exact prompt duplication checked against the primary question banks. These are self-contained calculations, not externally sourced factual claims. No change to selectable round limits.
- Static regression checks cover style integration, original marks, finale identity and the other 15 games. Prior first-pass commit 8bd7fb5 passed the Node and gameplay/question QA workflows; its browser workflow was still running at last inspection. New commits need their own fresh CI and real device checks.
- Outstanding: fully bespoke screen compositions and winner animations, custom sound assets, recorded narration, full phase-specific visual treatment and real multi-device playtesting. No merge or deployment. Do not mark Batch 1 complete until the acceptance contract passes.

## Sofa-scale and visual consistency pass (25 November 2026, branch `design/sofa-scale-3d-board`)
Stacked on the immersive TV branch. Reviewed every TV mode at 1280×720 and 1920×1080, the phone answer screens and the 3D scenes for anomalies. **Built and tested locally only: not merged, not deployed.**
- **Answer colours.** One shared palette everywhere (A raspberry `#c8203f`, B blue `#1d5fd0`, C amber `#f2b01e`, D emerald `#0d8250`), with AA-contrast ink. Phones and TVs in Classic, Knockout, Showdown, Dice Rally, Brain Ladder, Spotlight Wheel and open Top Answers polls now show solid colour blocks with white letter discs, so colour is never the only cue. Picks get a white ring; on reveal the right answer keeps its colour and ring while the others fade, and TV vote shares draw as a light bar over the colour. Fixed: rules previously matched `<button>` only, so colours vanished once a player had locked in (answers then render as `<div>`s). Colours and letters only — no shape icons — to avoid another show's trade dress.
- **Sofa legibility.** `tv-legibility.js` raises any in-game TV text below 2.2% of screen height (24px at 1080p, 16px at 720p, 40px cap) after each render; wheels, canvases and the hidden host bar are excluded.
- **Wheels.** Category and Spotlight wheels are larger on the TV and use radial labels, so neighbouring segments no longer collide (category labels used to overlap at the top and bottom) and Spotlight names no longer sit on the hub ring at enlarged sizes.
- **Quiz Race 3D.** A figure-of-eight circuit whose second pass crosses on a bridge (minimum bend radius 3.59, so ribbons never fold or overlap), six lanes and two staggered rows for twelve cars clear of the line; a two-post start/finish gantry with FINISH boards on both faces and a chequered top (the old cantilever printed its text on the beam ends); and a grandstand backdrop behind the far loop instead of under the standings strip.
- **Board Race 3D.** A smooth centripetal Catmull-Rom route (pure maths in `board-layout.js`, Node-tested for overlaps, bounds and bend radius) with tiles inlaid flush with the painted path; Question Trail pulled inside the dice tower's exit chute so no tile sits under it; a rebuilt brass trophy with a two-tier plinth and a lidded cup (the finial used to float above an open cup).
- **Known and not done:** Quiz Race stays capped at 12 cars; stinger transitions and animated studio backgrounds are still to do; no real-device or TV-distance playtest yet.

## Show identities (25 November 2026, branch `design/game-identities`)
Every game now has its own display face, palette and surface style, defined once in `public/game-identities.js` and applied by `public/game-identities.css` on the TV, phones and lobby. Fonts are self-hosted under the SIL OFL (licence files beside each `.woff2`). Tests enforce a unique face and page colour per game, WCAG contrast (ink 7:1, muted 4.5:1, accent 3:1 on both surfaces) and that the CSS stays in step with the table. Shared answer colours (A–D) are deliberately the same in every game so phones stay easy to use. **Built and tested locally; not merged or deployed.**

| Game | Identity | Face | Page | Accent | Scheme |
|---|---|---|---|---|---|
| classic | Golden Hour | Outfit (was Abril Fatface; changed for TV legibility) | `#0b1d6b` → `#040b30` | `#ffc93c` | dark |
| wheel | Carnival Midway | Bungee | `#7412c4` → `#2b0548` | `#ffd23f` | dark |
| board | Games Table | Cinzel | `#0f5c3c` → `#05281a` | `#f0c060` | dark |
| dice | Deco Salon | Limelight | `#7d0f2b` → `#2c0410` | `#f2c14e` | dark |
| knockout | Fight Night | Anton | `#1a1a1f` → `#000000` | `#ff2a2a` | dark |
| bluff | Case Files | Courier Prime | `#1d232b` → `#0a0c0f` | `#c6ff00` | dark |
| punchline | Comic Strip | Bangers | `#ffe14d` → `#ffb703` | `#d81e23` | light |
| cards | Card Parlour | Fraunces | `#f6ecdc` → `#e3cfb2` | `#b8164f` | light |
| tracks | Junction Box | Russo One | `#2b2e33` → `#101113` | `#ffb300` | dark |
| potato | Hot Seat | Lilita One | `#ff6a1f` → `#a8220a` | `#ffd23f` | dark |
| showdown | Arena Lights | Unbounded | `#0a52ff` → `#001660` | `#ff7a1a` | dark |
| samepage | Lagoon | Baloo 2 | `#12b5a4` → `#08636e` | `#fff36b` | dark |
| spotlight | Velvet Theatre | DM Serif Display | `#86102a` → `#22020a` | `#ffd27a` | dark |
| brain | Neon Lab | Orbitron | `#04304f` → `#010d18` | `#2ef2ff` | dark |
| topanswers | Seventies Survey | Righteous | `#de5a20` → `#74270d` | `#ffc145` | dark |
| rare | Treasure Vault | Marcellus SC | `#0b6249` → `#022419` | `#e8c35a` | dark |
| sketch | Sketch Pad | Caveat | `#fdfcf7` → `#ebe6d8` | `#e0294c` | light |
| quizrace | Neon Grand Prix | Barlow Condensed | `#1a0838` → `#05010f` | `#ff2bd6` | dark |
| soclose | Measuring Studio | IBM Plex Mono | `#0f5457` → `#052a2d` | `#ffbf68` | dark |
