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
