---
phase: 03-site
plan: "01"
subsystem: ui
tags: [astro, chart.js, vitest, typescript, estonian]

# Dependency graph
requires:
  - phase: 03-site-W0
    provides: summarySentence() pure function, vitest test infrastructure
  - phase: 01-scrapers
    provides: src/data/chart-data.json with pension and scam monthly data

provides:
  - Astro single-page site at src/pages/index.astro serving Estonian awareness page
  - astro.config.mjs with site + base for GitHub Pages project page deployment
  - npm dev/build/preview scripts
  - dist/index.html produced by npm run build

affects: [03-02-PLAN, deploy.yml]

# Tech tracking
tech-stack:
  added: [astro@5.18.0, chart.js@4.5.1]
  patterns:
    - "JSON data injection via <script type=application/json id=chart-data> to avoid define:vars ESM conflict"
    - "animation.onComplete sentinel (data-chart-ready) for OG screenshot automation"
    - "Astro scoped CSS with responsive canvas height breakpoint"

key-files:
  created:
    - src/pages/index.astro
    - astro.config.mjs
  modified:
    - package.json (added dev/build/preview scripts)
    - src/utils/page.test.ts (case-insensitive methodology assertion fix)

key-decisions:
  - "base: '/ee-scammers' set in astro.config.mjs — repo is a project page, not username.github.io"
  - "OG image URL constructed with new URL('og-preview.png', Astro.site) for absolute URL with base path"
  - "Data injected via DOM JSON element, not define:vars — define:vars breaks ESM imports in Astro script blocks"
  - "page.test.ts methodology assertion uses html.toLowerCase() for case-insensitive match (Astro outputs 'Andmete' with capital A)"

patterns-established:
  - "Chart.js in Astro: inject JSON via application/json script tag, read in separate module script"
  - "animation.onComplete: set dataset.chartReady='true' as sentinel for headless screenshot"

requirements-completed: [VIZ-01, VIZ-02, VIZ-03, VIZ-04, SITE-01, SITE-02, SITE-03]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 3 Plan 01: Estonian Awareness Site Summary

**Astro 5 single-page site with dual-line Chart.js chart comparing pension contributions vs scam losses, full Estonian copy, and data-chart-ready sentinel for OG screenshot**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-06T18:06:34Z
- **Completed:** 2026-03-06T18:10:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed Astro 5 + Chart.js 4 and configured for GitHub Pages project page (`base: '/ee-scammers'`)
- Built complete `src/pages/index.astro`: headline, dual-line chart, summary sentence (4.0% veebruari 2026), attribution links (politsei.ee, pensionikeskus.ee), methodology section in Estonian
- All 7 vitest tests pass: 4 summary unit tests + 3 page smoke tests against `dist/index.html`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Astro + Chart.js, create astro.config.mjs** - `35b5e20` (chore)
2. **Task 2: Build src/pages/index.astro** - `0f7f492` (feat)

## Files Created/Modified

- `src/pages/index.astro` - Complete Estonian awareness page with Chart.js dual-line chart
- `astro.config.mjs` - Astro config with GitHub Pages project page site + base settings
- `package.json` - Added dev, build, preview scripts for Astro
- `src/utils/page.test.ts` - Case-insensitive fix for methodology smoke test (Rule 1)

## Decisions Made

- Set `base: '/ee-scammers'` since repo is a project page (not `<username>.github.io`)
- Used `new URL('og-preview.png', Astro.site).toString()` for absolute OG image URL with correct base
- Injected chart data via `<script type="application/json">` DOM element — `define:vars` breaks ESM import in Astro `<script>` blocks (documented in RESEARCH.md)
- Added `animation.onComplete` to set `data-chart-ready='true'` on canvas for Plan 02's OG screenshot automation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Case-insensitive methodology test assertion**
- **Found during:** Task 2 (building index.astro, running vitest)
- **Issue:** `page.test.ts` asserted `toContain('andmete kogumise')` (lowercase) but Astro outputs `Andmete kogumise` (capital A in running text)
- **Fix:** Changed assertion to `html.toLowerCase().toContain('andmete kogumise')`
- **Files modified:** `src/utils/page.test.ts`
- **Verification:** All 7 tests pass after fix
- **Committed in:** `0f7f492` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - case mismatch bug in pre-existing test)
**Impact on plan:** Minimal — test text casing mismatch, not a site content issue. No scope creep.

## Issues Encountered

None beyond the auto-fixed test casing issue above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `dist/index.html` builds successfully and passes all smoke tests
- `data-chart-ready` sentinel is implemented for OG screenshot capture (Plan 02)
- `astro.config.mjs` `base` is set — deploy.yml `artifact path` needs updating from `.` to `dist/` in Plan 02
- Plan 02 adds `og-screenshot.ts` to the build chain: `astro build && tsx scripts/og-screenshot.ts`

---
*Phase: 03-site*
*Completed: 2026-03-06*
