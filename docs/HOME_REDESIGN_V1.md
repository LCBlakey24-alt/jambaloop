# Jambaloop homepage and game discovery — visual pass 1

This work was started after Codex paused. It follows `docs/JAMBALOOP_CODE_AUDIT_AND_DESIGN.md` and deliberately leaves the in-progress security/reliability PR #2 untouched.

## What changed

- Updated default **Club** homepage to a dark navy party-arcade theme with teal, mango, coral and violet accents pulled from the supplied Jambaloop logo. Christmas, Arcade and Lodge remain selectable, and gameplay views are unchanged.
- Rewrote the old quiz-only hero into a multiplayer games-night introduction with direct Host / Join actions and a link to game discovery. Existing `data-action` handlers are reused.
- Replaced the obsolete Quiz Club cover in the default landing hero with existing Board Race, Hot Potato and Spot the Bluff artwork in a static visual showcase. No extra WebGL renderer, video autoplay or external media added.
- Reworded the existing three-item quick guide to **Host → Join → Play**.
- Improved game cards with a category label, original artwork, legible description, minimum player count and responsive spacing. The 11 modes and all filtering behaviour remain unchanged.
- Reworded headings and labelled the default display theme **Jambaloop**. The underlying `club` identifier and existing local storage keys remain untouched for backward compatibility.
- Added a scoped stylesheet `public/jambaloop-home.css` loaded after existing theme and mobile rules to avoid altering game screens.
- Kept keyboard-visible focus, small-phone adaptations, and `prefers-reduced-motion` support. Ambient loops only animate for pointer devices when reduced motion is not requested.

## Validation

- Node 22 syntax checks passed for the changed JavaScript files.
- Seven dependency-free unit tests passed offline.
- Static Chrome layout inspection at 1440, 1024, 390 and 320 pixels showed no horizontal overflow. The screenshots are visual-only mocks with manually populated mode cards; they do **not** replace live multiplayer/browser testing.
- GitHub Actions should run all server-backed tests when this PR is opened.

## Work deliberately deferred

- Multiplayer and privacy fixes remain in PR #2. Do not merge or overwrite its branch in the course of this design PR.
- No existing game rules, room payloads, API endpoints or backend code changed.
- Game setup dialogs, full game UIs, leaderboard, 3D dice and the interactive preview experience will be addressed in later PRs after functional baseline checks.
- Test with real phones, TV displays, all optional themes and the existing mobile-deck pagination before merging. Visual layouts have not been validated on physical devices.
