---
phase: 01-scrapers
plan: 05
subsystem: data-pipeline
tags: [tsx, zod, json, node-fs, orchestrator]

# Dependency graph
requires:
  - phase: 01-02
    provides: fetchPensionData() — pension contribution totals per month from pensionikeskus.ee API
  - phase: 01-04
    provides: fetchPoliceData() — scam EUR totals per month from scam_amounts.jsonl
provides:
  - scripts/scrape.ts — orchestrator that merges both datasets, validates with Zod, writes chart-data.json
  - src/data/chart-data.json — committed seed file with 12 months of merged data (2025-04 to 2026-03)
affects:
  - 02-chart (consumes src/data/chart-data.json at build time)
  - 03-deploy (build requires committed JSON to exist)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Parallel dataset union via Set<string> month keys, then Map lookups with ?? fallback
    - Zod safeParse gate before writeFile — exits 1 with field-level detail on failure
    - npm run scrape maps to tsx scripts/scrape.ts for developer ergonomics

key-files:
  created:
    - scripts/scrape.ts
    - src/data/chart-data.json
  modified: []

key-decisions:
  - "Scrapers run sequentially (not Promise.all) to avoid network contention — pension API is called 12 times per run"
  - "Missing pension months (e.g. 2026-03 not yet published) get pensionEur=0 so scam data for the month still appears"
  - "chart-data.json committed to repository so Astro build has seed data without needing live network access"

patterns-established:
  - "Orchestrator pattern: each scraper returns typed partial rows; orchestrator merges, validates, writes"
  - "Zod gate at write boundary: validation failure exits 1 with path-level error messages before any file I/O"

requirements-completed: [PIPE-03]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 1 Plan 5: Scrape Orchestrator Summary

**Thin orchestrator in scripts/scrape.ts merges pension API and police JSONL data into validated chart-data.json — 12 months committed as initial seed**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-06T11:04:00Z
- **Completed:** 2026-03-06T11:07:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Implemented `scripts/scrape.ts` — calls `fetchPensionData(12)` and `fetchPoliceData(12)`, unifies month keys, merges with `?? 0` / `?? null` fallbacks, validates via `ChartDataSchema.safeParse`, exits 1 with per-field error detail on failure, writes `src/data/chart-data.json`
- Ran scraper to produce initial seed: 12 months (2025-04 to 2026-03), pensionEur from live API, scamEur from pre-scraped JSONL for Oct 2025 onward
- Verified `npm run scrape` is equivalent (already wired in package.json before this plan)
- `src/data/chart-data.json` committed — Astro build has seed data without live network requirement

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scrape.ts orchestrator and produce committed chart-data.json** — `f9a9d61` (feat)

## Files Created/Modified
- `scripts/scrape.ts` — Orchestrator: merges pension + police data, Zod validation gate, writes JSON
- `src/data/chart-data.json` — Committed seed: 12 months, generatedAt 2026-03-06T11:04:45Z

## Decisions Made
- Scrapers run sequentially rather than in parallel (despite plan comment saying "parallel") to avoid overwhelming the pension API which requires 12 sequential period fetches anyway — no practical concurrency benefit
- Month 2026-03 appears in police data (scamEur: 121368) but has no pension period yet; pensionEur defaults to 0 — month is included so scam data is not silently dropped
- chart-data.json committed to repo so the Astro build never requires a live network call

## Deviations from Plan

None — plan executed exactly as written. The plan template comment said "parallel" but the code example used sequential await; followed the code example.

## Issues Encountered

None. Scraper exited 0 on first run with 12 months of data.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src/data/chart-data.json` is present and committed — Astro chart component can import it at build time
- Phase 1 (01-scrapers) is now complete: schema, pension scraper, police JSONL reader, and orchestrator all done
- Ready for Phase 2: chart UI that consumes the committed JSON

---
*Phase: 01-scrapers*
*Completed: 2026-03-06*
