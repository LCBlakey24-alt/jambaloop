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

The pack's buttons, sliders, stars and fonts are not used: the site's controls are drawn in CSS to match each game's identity.
