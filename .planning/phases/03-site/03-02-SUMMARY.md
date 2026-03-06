---
phase: 03-site
plan: "02"
subsystem: infra
tags: [playwright, og-image, github-actions, astro, deploy]

requires:
  - phase: 03-site-01
    provides: "Astro index.astro with Chart.js dual-line chart and summary sentence"

provides:
  - "scripts/og-screenshot.ts: post-build Playwright screenshot producing dist/og-preview.png at 1200x630"
  - "deploy.yml build job complete with Node setup, npm ci, playwright install chromium, dist/ upload"
  - "package.json build script: astro build && tsx scripts/og-screenshot.ts"
  - "Human-verified: site renders correctly at desktop and 375px mobile"

affects: [deploy, ci, og-image]

tech-stack:
  added: [tsx (runtime for og-screenshot.ts)]
  patterns:
    - "Post-build Playwright screenshot: minimal Node HTTP server over dist/ + page.waitForSelector sentinel + page.screenshot clip"
    - "Canvas readiness sentinel: canvas[data-chart-ready=true] set by Chart.js animation.onComplete"
    - "GitHub Actions OIDC deploy: environment: github-pages, upload-pages-artifact path: dist/"

key-files:
  created:
    - scripts/og-screenshot.ts
  modified:
    - package.json
    - .github/workflows/deploy.yml
    - src/pages/index.astro

key-decisions:
  - "Strip /ee-scammers base path in og-screenshot server so Astro project-page assets load correctly under the local static server"
  - "Fix set:text → set:html in index.astro to prevent JSON HTML-entity encoding bug (ampersands escaped as &amp;)"
  - "Serve JS files with application/javascript Content-Type so ES module imports succeed in the local server"

patterns-established:
  - "OG screenshot pattern: start static server, goto localhost, wait for chart sentinel, screenshot clip, close server"
  - "deploy.yml artifact path must be dist/ (not .) for GitHub Pages to serve correct content"

requirements-completed: [SITE-04]

duration: 8min
completed: 2026-03-06
---

# Phase 3 Plan 02: OG Screenshot + Deploy Wiring Summary

**Playwright post-build OG screenshot (1200x630) wired into the build chain, deploy.yml completed with Node/Chromium/dist setup, and human-verified at 375px mobile**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-06T18:14:00Z
- **Completed:** 2026-03-06T18:19:36Z
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 4

## Accomplishments

- Created `scripts/og-screenshot.ts`: minimal static Node HTTP server over dist/, waits for `canvas[data-chart-ready="true"]` sentinel, captures 1200x630 Playwright screenshot to `dist/og-preview.png`
- Updated `package.json` build script to `astro build && tsx scripts/og-screenshot.ts` — OG image generated on every build
- Completed `.github/workflows/deploy.yml` build job: Node LTS setup, npm ci, `npx playwright install chromium --with-deps`, `npm run build`, artifact upload from `dist/`
- Human approved site at desktop and 375px mobile: dual-line chart, summary sentence, attribution links, methodology section all confirmed correct
- `dist/og-preview.png` produced at 48KB (non-blank, chart visible)
- All 7 vitest tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create og-screenshot.ts, update build script, update deploy.yml** - `14c6b89` (feat)
2. **Task 2: Human visual verification approved** - `4a85168` (chore)

## Files Created/Modified

- `scripts/og-screenshot.ts` - Post-build Playwright screenshot script: static server, canvas sentinel, 1200x630 clip
- `package.json` - Build script updated to run og-screenshot after astro build
- `.github/workflows/deploy.yml` - Build job completed with Node, Chromium, dist/ artifact upload
- `src/pages/index.astro` - Fixed set:text → set:html (HTML-entity encoding bug)

## Decisions Made

- Stripped `/ee-scammers` base path in the local static server so Astro project-page assets (prefixed with `/ee-scammers/`) load correctly when served from the root of the minimal server.
- Fixed `set:text` → `set:html` in index.astro: Astro's `set:text` HTML-escapes content so the JSON `chartData` blob was rendered with `&amp;` entities, causing JSON.parse to fail client-side.
- JS files served as `application/javascript` explicitly — necessary for ES module `<script type="module">` imports to work in the local static server.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Astro set:text → set:html to prevent JSON entity-encoding bug**
- **Found during:** Task 1 (og-screenshot build verification)
- **Issue:** `set:text` HTML-escapes content; the embedded `chartData` JSON blob was rendered with `&amp;` in the DOM, causing `JSON.parse` to throw at runtime
- **Fix:** Changed `<script type="application/json" id="chart-data" set:text={...}>` to `set:html`
- **Files modified:** `src/pages/index.astro`
- **Verification:** `npm run build` produced valid og-preview.png (48KB), chart rendered in screenshot
- **Committed in:** `14c6b89` (Task 1 commit)

**2. [Rule 1 - Bug] Stripped Astro base path in og-screenshot static server**
- **Found during:** Task 1 (og-screenshot serving assets)
- **Issue:** Astro builds project-page assets prefixed with `/ee-scammers/` but the minimal Node server served files by stripping only the leading `/`, causing 404s for all assets
- **Fix:** Added base-path stripping in server request handler: `rel.replace(/^ee-scammers\//, '')`
- **Files modified:** `scripts/og-screenshot.ts`
- **Verification:** Chart rendered correctly in Playwright screenshot
- **Committed in:** `14c6b89` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs)
**Impact on plan:** Both fixes necessary for og-preview.png to contain actual chart content rather than a broken/blank page. No scope creep.

## Issues Encountered

None beyond the two auto-fixed bugs above.

## User Setup Required

None - no external service configuration required. GitHub Actions OIDC permissions were already in place from Phase 2.

## Next Phase Readiness

- Phase 3 complete. All three phases (scrapers, automation, site) are done.
- Site ships to GitHub Pages on next `git push` via the completed deploy.yml.
- Nightly scraper runs via cron, updates `src/data/chart-data.json`, commits with `[skip ci]` to avoid deploy triggers.
- OG image regenerates on every deploy (post-build step in build script).

---
*Phase: 03-site*
*Completed: 2026-03-06*
