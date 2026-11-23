# Jambaloop release-readiness review — 23 November 2026

## Current scope

This review covers the 17-game development stack through Rare Find, based on
`feature/17-rare-find-answer-review`, plus the release-readiness changes in
`codex/18-game-night-release-readiness`.

The product has a coherent TV-and-phone journey, distinct presentations for all
17 modes, preserved player sessions between games, and automated coverage for
the server-authoritative multiplayer core. It is a credible release-candidate
foundation, but it is not yet proven production-ready for the advertised
maximum room size or for multi-instance hosting.

## Verified in this review

- The complete Node test suite passes, including gameplay, content validation,
  room security, live-stream handling, Rare Find adjudication and normalized
  games-night standings.
- All 17 modes render without JavaScript errors at 1280×720 and 1920×1080 in
  automated Chromium journeys.
- The launcher was exercised at desktop, TV, tablet and 390×844 phone sizes,
  including previews, narration controls and reduced motion.
- Complete browser journeys were exercised for Rare Find, Spotlight Wheel,
  Brain Ladder, Top Answers, Same Page, Fork in the Tracks and Board Race.
- Protected player photos load for authenticated room members and are rejected
  for anonymous requests.
- Room creation/join limits, idle expiry and duplicate stream limits now have
  regression coverage.
- Rare Find handles disconnected non-responders, 3/5/7-round configurations,
  tied winners, rematches and a simulated 30-player room.
- Games-night standings use normalized 3/2/1 stars by competition rank rather
  than adding incompatible raw game scores. Team modes award the appropriate
  team result.

These checks are automated evidence. They are not a substitute for a real
group playtest on a representative mix of televisions and personal phones.

## Content evidence

- Rare Find contains 34 curated prompts spanning seven categories, with 217
  canonical answers and 32 accepted aliases. Twenty-two prompts cite official
  or authoritative references; twelve use finite, manually reviewed answer
  sets. URL availability was checked, but that is not equivalent to independent
  editorial sign-off of every fact.
- Top Answers contains 80 original prompts and derives rarity/popularity from
  the current room's genuine answers. It does not claim fabricated public
  survey data.
- Brain Ladder contains 180 deterministic logic and arithmetic puzzles that
  are checked by content QA.
- Older factual banks predate the newer source-metadata standard. A complete
  editorial audit of those banks remains a release-readiness task.

## Capacity evidence

| Area | Implemented limit | Evidence in this review |
| --- | ---: | --- |
| Quiz Race | 12 individual racers | automated gameplay tests |
| Board Race | 4 individual racers | browser journey; larger team rooms supported |
| Spotlight Wheel | 20 players | configured and tested gameplay paths |
| Brain Ladder | 30 players | configured and tested gameplay paths |
| Top Answers | 30 players | configured and tested gameplay paths |
| Rare Find | 30 players | automated 30-player simulation |
| General trivia rooms | up to 300 configured | smaller regression scenarios only |

The 300-player ceiling is a configuration limit, not a verified load-test
result, and must not be advertised as proven capacity.

## Security and privacy improvements

- Player-photo reads require a valid room membership key.
- Photo payloads are size-limited and validated as decodable JPEG data.
- User nicknames are normalized and control characters are rejected.
- Room creation and joining are rate-limited, with configurable global room
  limits and idle-room expiry.
- Duplicate live connections are bounded and older connections are closed.
- Private game state remains filtered by the existing per-player serializers;
  browser and gameplay tests cover recent typed-answer games.

Rooms and audit trails remain in process memory. The reliable initial deployment
model is one long-running Node server with sticky connections; horizontal or
serverless scaling requires a shared authoritative state and pub/sub layer.

## Design review

The shared navy Jambaloop shell, high-contrast typography and mode-specific
palettes now read consistently across TV and phone. The strongest newer modes
use broadcast-scale stage headings, private controller states, concise reveals
and restrained motion. The launcher keeps all 17 games discoverable without an
unbounded wall of cards.

The next design pass should focus on depth rather than adding another visual
system: consolidate duplicated game metadata, give older games the same complete
intro/reveal/results treatment as newer modes, improve Board Race token overlap
and camera framing, and run moderated usability sessions to identify unclear
instructions that screenshots cannot reveal.

## Release blockers and next priorities

1. Merge and validate the stacked pull-request chain in dependency order.
2. Run a real 8–12-person games night across mixed iPhone and Android devices,
   recording reconnect, keyboard and pacing problems.
3. Load-test realistic 30-, 100- and 300-player trivia rooms before publishing
   capacity claims.
4. Complete the source-backed editorial audit of legacy factual questions.
5. Add end-to-end journey coverage for the older Wheel, Dice Rally, Knockout,
   Spot the Bluff, Fill the Blank and Hot Potato expiry paths.
6. Decide on shared room storage before any multi-instance deployment.
7. Consolidate duplicated mode registration data and progressively split the
   largest client/server modules without replacing working gameplay.

No deployment or production hosting change is included in this review.
