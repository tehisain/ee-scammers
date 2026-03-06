---
phase: 02-automation
plan: 02
subsystem: infra
tags: [github-actions, github-pages, ci-cd, deploy]

# Dependency graph
requires: []
provides:
  - ".github/workflows/deploy.yml — GitHub Pages deploy workflow skeleton wired with build+deploy jobs"
  - "pages: write + id-token: write permissions on deploy job via OIDC"
  - "paths-ignore guard preventing data-only commits from triggering deploys"
affects: [03-site]

# Tech tracking
tech-stack:
  added: [actions/checkout@v4, actions/upload-pages-artifact@v4, actions/deploy-pages@v4]
  patterns: [GitHub Actions OIDC deploy via actions/deploy-pages, paths-ignore for data-commit filtering]

key-files:
  created: [.github/workflows/deploy.yml]
  modified: []

key-decisions:
  - "Used actions/deploy-pages@v4 (not deprecated v3) — v3 deprecated January 30 2025"
  - "Workflow-level permissions: contents: read; deploy job overrides with pages: write + id-token: write"
  - "Temporary artifact path is repo root (.) — Phase 3 replaces with dist/ after adding Astro build"
  - "paths-ignore: src/data/** prevents nightly scraper commits from triggering unnecessary deploys"
  - "Phase 3 insertion comments embedded in build job marking exact location for npm ci + npm run build"

patterns-established:
  - "Pattern 1: OIDC-based GitHub Pages deploy via environment: github-pages (no deploy keys or tokens)"
  - "Pattern 2: Workflow skeleton with commented insertion points for future phases"

requirements-completed: [SITE-05]

# Metrics
duration: 1min
completed: 2026-03-06
---

# Phase 2 Plan 02: Deploy Workflow Skeleton Summary

**GitHub Pages deploy workflow skeleton using OIDC auth (actions/deploy-pages@v4) with paths-ignore guard for data commits and Phase 3 insertion comments**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-06T12:44:37Z
- **Completed:** 2026-03-06T12:45:17Z
- **Tasks:** 1 of 2 (Task 2 is a human-verify checkpoint — paused)
- **Files modified:** 1

## Accomplishments
- Created `.github/workflows/deploy.yml` with full deploy skeleton — build job + deploy job wired
- All 6 smoke checks pass (pages permission, deploy-pages v4, upload-artifact v4, paths-ignore, data filter, pages environment)
- Phase 3 insertion comments embedded so Phase 3 only needs to add 3 lines (setup-node, npm ci, npm run build) and change artifact path

## Task Commits

Each task was committed atomically:

1. **Task 1: Create .github/workflows/deploy.yml** - `c088c86` (feat)

**Plan metadata:** (pending final metadata commit after Task 2 checkpoint)

## Files Created/Modified
- `.github/workflows/deploy.yml` — GitHub Pages deploy workflow: triggers on main push (excluding src/data/**), build job uploads Pages artifact, deploy job deploys via OIDC

## Decisions Made
- Used `actions/deploy-pages@v4` (v3 was deprecated January 30, 2025)
- Temporary artifact `path: .` (repo root) for the skeleton — Phase 3 replaces with `dist/`
- Workflow-level `permissions: contents: read`; deploy job overrides with `pages: write + id-token: write`
- `environment: github-pages` is required for OIDC token exchange

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Manual configuration required.** Repository Settings > Pages > Build and deployment > Source must be set to "GitHub Actions":

1. Go to repository Settings > Pages (left sidebar, under "Code and automation")
2. Under "Build and deployment" > "Source" — change from "Deploy from a branch" to "GitHub Actions"
3. Click Save if prompted
4. Confirm the Source now shows "GitHub Actions"

This cannot be done by Claude — it requires a logged-in browser session with admin access to the repository.

## Next Phase Readiness
- `.github/workflows/deploy.yml` skeleton is ready — Phase 3 only needs to insert the Astro build steps
- Site won't actually be served until: (1) Pages source is "GitHub Actions" in repo settings AND (2) Phase 3 adds the Astro build step + `dist/` artifact path
- All structural decisions locked: no changes to deploy job structure needed in Phase 3

---
*Phase: 02-automation*
*Completed: 2026-03-06*
