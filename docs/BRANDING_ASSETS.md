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
