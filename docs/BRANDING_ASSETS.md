# Jambaloop branding assets

The two supplied logo designs are stored, unmodified, in `public/branding/originals/`:

- `jambaloop-logo-navy-original.png` — dark navy lettering on a transparent background.
- `jambaloop-logo-white-original.jpg` — white lettering on a black background (uploaded image had JPEG contents).

The site loads display-ready transparent WebP files:
- `/branding/jambaloop-logo-navy.webp` on light backgrounds.
- `/branding/jambaloop-logo-white.webp` on dark and Arcade backgrounds.
- `/branding/jambaloop-icon.png` as the browser favicon / touch icon.

The wordmarks are shown in the global header and footer. `branding.css` chooses the correct variant based on the existing `body.playing` and `data-theme` switches. Do not apply CSS colour inversion to the colourful artwork.

These are image assets, not editable vector source files. If rebuilding or refining them, retain the source files as archival references. The brand name is still provisional pending trademark clearance.

The original application's internal Quiz Club identifiers, README descriptions and existing game modes were intentionally left unchanged by this asset-only integration.

## Third-party assets

| Asset | Used for | Source | Licence |
|---|---|---|---|
| `public/audio/sfx/ui-tap.mp3`, `ui-click.mp3`, `ui-switch.mp3` | Soft interface clicks on the TV (browsing games, turning sound on) | Kenney UI Pack 2.0, kenney.nl (owner supplied the download, 27 November 2026) | Creative Commons Zero (CC0); licence text kept at `public/audio/licences/kenney-ui-pack-CC0.txt` |
| `public/audio/sfx/dice-shake.mp3`, `dice-throw-1.mp3`, `dice-throw-2.mp3`, `card-place-1.mp3`, `card-place-2.mp3`, `card-slide.mp3` | Dice rolls in Board Race and Dice Rally; cards going down in the trolley and card games (TV only) | Kenney Boardgame Pack, kenney.nl (owner supplied, 27 November 2026) | CC0; text at `public/audio/licences/kenney-boardgame-pack-CC0.txt` |
| `public/icons/kenney/*.svg` (36 icons) | Game icons, recoloured through CSS (`currentColor`) | Kenney Board Game Icons, kenney.nl (owner supplied, 27 November 2026). Converted on import: view box added, white fill replaced by `currentColor`. | CC0; text at `public/icons/kenney/LICENCE-CC0.txt` |
| `public/models/cars/kart-*.glb` (5 models) and `Textures/colormap.png` | Quiz Race cars on the TV: each racer drives a kart, tinted and badged in their colour | Kenney Car Kit, kenney.nl (owner supplied, 27 November 2026) | CC0; text at `public/models/cars/LICENCE-CC0.txt` |
| `public/models/sprites/gravestone-*.webp`, `character-vampire.webp` | Bloodmoon TV: gravestones for fallen players and the vampire on the count | Renders of Kenney Graveyard Kit 5.0 models made with `scripts/render-model-sprites.mjs` (owner supplied the kit, 27 November 2026) | CC0; text at `public/models/sprites/LICENCE-graveyard-kit-CC0.txt` |
| `public/models/sprites/train-tram-round.webp`, `track-tile.webp` | The tram and the rails in Fork in the Tracks | Render of a Kenney Train Kit model, same script | CC0; text at `public/models/sprites/LICENCE-train-kit-CC0.txt` |
| `public/qr/jsQR.js` | Reads a room's QR code from the phone camera where the browser has no built-in reader (iPhones) | jsQR 1.4.0 from npm, unmodified | Apache-2.0; text at `public/qr/LICENSE-jsQR-Apache-2.0.txt` |
| `public/three-addons/*.js` | Loads the 3D models | three.js example modules, import paths adjusted for this site | MIT; text at `public/three-addons/LICENSE-three-MIT.txt` |

Also supplied and not used yet (all CC0): Kenney Playing Cards Pack, Board Game Info, Monster Builder Pack and UI Pack Space Expansion.

The pack's buttons, sliders, stars and fonts are not used: the site's controls are drawn in CSS to match each game's identity.

## Voices

Bloodmoon is narrated by **Count Vesper**, an original character. The voice is the ElevenLabs library voice "Paul – Engaging, Friendly and Mysterious" (a Romanian speaker, tagged Transylvanian accent), used under the account's paid plan. It is not an impression of any actor or film character. A second library voice, "Matthew Schmitz – Ancient Vampire Lord", was auditioned and not used.

## Music

Every game has its own 45-second looping theme (`public/audio/music/game-<mode>.mp3`), made on 27 November 2026 with ElevenLabs Music on the owner's paid plan from the prompts in `scripts/generate-game-music.mjs`. Each prompt describes a mood and instruments only; none names a song, an artist or a show. The theme plays on the TV when the carousel lands on that game and carries on quietly during the game. `lobby.mp3` is the waiting-room music and the fallback. Nobody has listened to these on a real TV yet.

## How-to-play guides

Each game has a recorded, captioned guide (`public/audio/duo/guide-<mode>.mp3`, scripts in `public/guide-scripts.js`, animated scenes in `public/guide-show.js`), recorded on 27 November 2026 with the same ElevenLabs voices as the rest of the show. Max and Poppy hand over to Baz and Clive (Knockout), Vince (Quiz Race) and Count Vesper (Bloodmoon). Every rule in the scripts was checked against the game code, and every recording's transcript was checked against its script. Nobody has listened to them or watched them on a real TV yet.

## Shade (added 27 November 2026)

Shade is an original colour-clue game: its name, board (30 by 16 squares generated in code by `public/shade-grid.js`), rules text and look are ours, not a copy of any published game's board, name or artwork. Its typeface is Fredoka (SIL Open Font License, `public/fonts/fredoka-OFL.txt`). Its theme, title sting, intro and guide were made with the same ElevenLabs tools and voices as the other games.
