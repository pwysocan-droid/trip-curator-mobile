# STATUS — Trip Curator 2.0

Last updated: April 27, 2026

## What this is

A parallel rebuild of Trip Curator 1.0 with the same engine but an Airbnb-faithful mobile design language. 1.0 still exists in its own folder, untouched. This 2.0 folder is independent and does not share `node_modules` or any runtime state with 1.0.

## Working end-to-end

The full flow runs in mobile DevTools and on real devices:

1. Open the app — Trips tab, empty state, floating + button bottom-right
2. Tap the +, pick a photo from the system picker
3. Image is resized client-side, sent to `/api/analyze`
4. Haiku 4.5 detects the region; Opus 4.6 composes three trip concepts
5. Redirect to `/results` — your photo, the analysis, a duration stepper, and three trip cards
6. Adjust the stepper (3–14 nights) and prices update live
7. Tap any listing inside a trip card → stay/experience/service detail page (single-column mobile, sticky bottom Reserve bar)
8. Back arrow returns to results

The TypeScript build is clean (`npx tsc --noEmit` — no errors). Production build completes in under 30 seconds, all 7 routes prerender, total first-load JS is 82.5 KB shared and Results adds 10.5 KB on top.

## Engine inheritance from 1.0 (zero changes)

These files were copied byte-for-byte from 1.0 and not modified:

- `src/lib/types.ts` — `Stay`, `Experience`, `Service`, `TripOption`, `MockData` interfaces
- `src/lib/utils.ts` — `distance()` (Haversine), `assembleTrips()`, `curateTripOptions()`, `TRIP_NARRATIVES` editorial copy
- `src/lib/regions.ts` — Provence + Kyoto region config, `resolveRegion()` aliases
- `src/pages/api/analyze.ts` — Anthropic API integration (Haiku region detection → Opus trip composition)
- `public/data/airbnb-mock-data.json` — 27 Provence listings with full Airbnb structure
- `public/data/kyoto.json` — Kyoto listings
- `public/data/regions.json` — region metadata
- `src/pages/stay/[id].tsx`, `experience/[id].tsx`, `service/[id].tsx` — JSX unchanged; only the shared CSS module is new

## Newly built for 2.0

- `src/pages/_app.tsx` — viewport meta, theme color, globals import
- `src/pages/index.tsx` — Trips tab empty state with FAB upload
- `src/pages/results.tsx` — mobile feed with reference image, analysis, stepper, three cards
- `src/components/TripCard.tsx` — image-led carousel, listing rows, map block, total + CTA footer
- `src/components/TabBar.tsx` — fake Airbnb bottom navigation with custom SVG icons
- `src/components/DurationStepper.tsx` — +/− stepper replacing the slider
- `src/components/MapWidget.tsx` — Airbnb price-bubble pins (Rausch for stay, white-with-shadow for others)
- All 8 CSS modules in `src/styles/` — Airbnb design tokens (`#FF385C` Rausch, Inter font, 4-point grid, 8/12/16/24/pill radii)

## Intentionally stubbed (deferred for POC speed)

- The Reserve buttons (on trip cards and detail pages) don't open a booking sheet
- The Share icon on the Results top bar is decorative
- Tab bar items other than Trips don't navigate
- The heart-save state on trip cards is local React state, not persisted across reload or between devices
- The carousel dot indicator on trip cards doesn't auto-advance when the user swipes — it stays on dot 1
- The "guests" and "dates" UI from 1.0's desktop sidebar is collapsed entirely on mobile (the design pattern is: tap Reserve → opens a date/guest sheet; the sheet itself isn't built yet)
- No real photo gallery on detail pages — photos scroll-snap horizontally as a single strip; tapping doesn't open a fullscreen viewer
- No skeleton state on detail pages while data loads (just "Loading…" text inherited from 1.0)

## Known constraints

- The mobile frame is capped at 430px max-width. On desktop viewports it centers with a soft shadow as a phone-shaped canvas. This is intentional but means the app does not have a "real" desktop layout — if a desktop view is needed for v3, it would be a separate consideration.
- The `+` FAB position uses `right: calc(50% - min(var(--frame-max), 100vw) / 2 + var(--sp-5))` to track the right edge of the centered frame on desktop and the viewport edge on mobile. Worth eyeballing on a couple of widths.
- Map pins now show `$298`-style price labels for stays and experiences and `$$` for services. If the price field is missing or zero, the bubble will say `$0` — consider falling back to the type label in that case.

## Open questions before a real launch

- Do we need a real Reserve flow, or is the visual placeholder enough for the POC's intended audience?
- Should the FAB get more narrative dressing (a small caption like "Tap to start a trip from a photo") for first-time users?
- Is Inter close enough to Cereal for stakeholder review, or should we license Cereal-family alternatives?
- Multi-region: 1.0's engine already supports Provence and Kyoto, but the app currently shows whichever the analyzer detects. No region picker UI exists.
