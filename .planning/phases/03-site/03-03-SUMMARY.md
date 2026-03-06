---
phase: 03-site
plan: "03"
subsystem: ui
tags: [astro, og-meta, seo, github-pages]

# Dependency graph
requires:
  - phase: 03-site-03-01
    provides: Astro site with og:image meta tag and base path configuration
provides:
  - Correct og:image absolute URL https://maidok.github.io/ee-scammers/og-preview.png in built dist/index.html
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Hardcode /ee-scammers base path in URL constructor for og:image — Astro.site lacks trailing path segment"]

key-files:
  created: []
  modified:
    - src/pages/index.astro
    - dist/index.html

key-decisions:
  - "Option A chosen: new URL('/ee-scammers/og-preview.png', Astro.site) — clearest explicit fix, consistent with base path decision in STATE.md"

patterns-established:
  - "og:image URL: use absolute path starting with base prefix in URL constructor, not relative filename"

requirements-completed: [SITE-04]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 03 Plan 03: Fix og:image Base Path Summary

**One-line og:image URL fix: added /ee-scammers base path so social media crawlers receive correct absolute image URL on GitHub Pages project page deployment**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T18:41:22Z
- **Completed:** 2026-03-06T18:44:00Z
- **Tasks:** 1
- **Files modified:** 3 (src/pages/index.astro, dist/index.html, dist/og-preview.png)

## Accomplishments
- Fixed og:image URL from `https://maidok.github.io/og-preview.png` (404 on deploy) to `https://maidok.github.io/ee-scammers/og-preview.png`
- Rebuilt dist/index.html with corrected og:image meta tag
- All 7 vitest tests continue to pass (regression check clean)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix ogImage URL to include /ee-scammers base path** - `24b51ef` (fix)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/pages/index.astro` - Changed `new URL('og-preview.png', Astro.site)` to `new URL('/ee-scammers/og-preview.png', Astro.site)`
- `dist/index.html` - Rebuilt output now emits `og:image content="https://maidok.github.io/ee-scammers/og-preview.png"`
- `dist/og-preview.png` - OG screenshot regenerated as part of build

## Decisions Made
- Used Option A (`new URL('/ee-scammers/og-preview.png', Astro.site)`) — hardcoded base path is intentional and explicit, consistent with existing STATE.md decision to hard-code `/ee-scammers`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Plan documentation references `tehisain.github.io` but `astro.config.mjs` uses `maidok.github.io` — the fix is correct regardless; the base path `/ee-scammers` is what matters, and it is now included. No action required.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SITE-04 gap from VERIFICATION.md is closed
- og:image URL is correct for GitHub Pages project page deployment
- All planned phases for 03-site complete

---
*Phase: 03-site*
*Completed: 2026-03-06*
