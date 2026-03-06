---
phase: 02-automation
plan: 01
subsystem: infra
tags: [github-actions, cron, workflow, keepalive]

# Dependency graph
requires:
  - phase: 01-scrapers
    provides: npm run scrape script and src/data/chart-data.json output file
provides:
  - Nightly GitHub Actions workflow that runs scrapers, conditionally commits data, and prevents cron suspension
affects:
  - 03-frontend

# Tech tracking
tech-stack:
  added: [github-actions, liskin/gh-workflow-keepalive@v1]
  patterns: [conditional-git-commit, schedule-only-guard, skip-ci-on-data-commit]

key-files:
  created:
    - .github/workflows/scrape.yml
  modified: []

key-decisions:
  - "Used liskin/gh-workflow-keepalive@v1 (not gautamkrishnar/keepalive-workflow which is ToS-suspended)"
  - "Keepalive job guarded by `github.event_name == 'schedule'` so it only runs on cron, not workflow_dispatch"
  - "Data commit includes [skip ci] to prevent deploy.yml from triggering on each nightly scrape"

patterns-established:
  - "Conditional commit pattern: git add + git diff --cached --quiet || git commit"
  - "Schedule-only job guard: if: github.event_name == 'schedule'"

requirements-completed: [PIPE-04]

# Metrics
duration: 1min
completed: 2026-03-06
---

# Phase 2 Plan 01: Nightly Scrape Workflow Summary

**GitHub Actions cron workflow running `npm run scrape` nightly at 03:00 UTC with conditional data commit and liskin keepalive to prevent 60-day cron suspension**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-06T12:44:11Z
- **Completed:** 2026-03-06T12:44:43Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `.github/workflows/scrape.yml` with two jobs: `scrape` and `keepalive`
- Scrape job runs `npm run scrape` at 03:00 UTC via cron with `workflow_dispatch` fallback for manual testing
- Conditional commit prevents empty commits when data unchanged (`git diff --cached --quiet` idiom)
- Keepalive job uses `liskin/gh-workflow-keepalive@v1` scoped only to schedule triggers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create .github/workflows/scrape.yml** - `d4db5d5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `.github/workflows/scrape.yml` - Nightly scrape cron workflow with conditional commit and keepalive job

## Decisions Made
- Used `liskin/gh-workflow-keepalive@v1` instead of `gautamkrishnar/keepalive-workflow` — the latter is ToS-suspended by GitHub Staff as of early 2025 and fails at action download time
- Added `[skip ci]` to data commit message so nightly data updates do not trigger a frontend deploy
- Keepalive job guarded with `if: github.event_name == 'schedule'` so it is skipped on `workflow_dispatch` manual runs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The workflow uses the built-in `GITHUB_TOKEN` (implicit via `contents: write` and `actions: write` permissions).

## Next Phase Readiness
- Nightly automation is in place; scraper output will flow into `src/data/chart-data.json` automatically
- Phase 3 (frontend) can rely on `src/data/chart-data.json` being kept fresh via nightly commits

---
*Phase: 02-automation*
*Completed: 2026-03-06*
