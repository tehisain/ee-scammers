---
phase: 01-scrapers
verified: 2026-03-06T12:00:00Z
status: passed
score: 4/4 success criteria verified
re_verification: false
human_verification:
  - test: "Confirm chart-data.json values match the actual pensionikeskus.ee UI totals for a recent month"
    expected: "A randomly chosen month's pensionEur value (e.g. 2026-02 = 49,546,839) agrees with the pensionikeskus.ee displayed figure for that period"
    why_human: "Cannot call live API in verification; value correctness depends on type F+P summation being right — the SUMMARY notes a verification was done but a spot-check confirms trust"
  - test: "Confirm scam_amounts.jsonl amounts were sourced accurately from politsei.ee articles"
    expected: "A spot-checked article date and amount in the JSONL matches the EUR figure stated in the corresponding politsei.ee daily crime report"
    why_human: "The JSONL is user-provided pre-scraped data; its accuracy cannot be verified programmatically without live scraping"
---

# Phase 1: Scrapers Verification Report

**Phase Goal:** Real monthly data from both sources is captured in a validated, committed JSON file
**Verified:** 2026-03-06
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Scraper produces chart-data.json with at least 6 months of pension contribution data (EUR values) | VERIFIED | 11 of 12 months have pensionEur > 0; 2026-03 is correctly 0 (month not yet published by API) |
| 2  | Scam loss entries exist for months where police data is present; null for months with no data | VERIFIED | 6 months have scamEur non-null (Oct 2025 – Mar 2026); earlier 6 months are null (no JSONL records) |
| 3  | JSON passes Zod schema validation — no missing fields, no wrong types | VERIFIED | scrape.ts runs ChartDataSchema.safeParse() before writeFile; exits 1 with per-field errors on failure |
| 4  | Both scrapers complete without error and the output file is committed to the repo | VERIFIED | git commit f9a9d61 commits chart-data.json; both scraper functions called sequentially in scrape.ts main() |

**Score:** 4/4 success criteria verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | npm project with scrape script and all dependencies | VERIFIED | ESM, scrape script maps to `tsx scripts/scrape.ts`, playwright/cheerio/zod/tsx/typescript present |
| `scripts/schema.ts` | Zod schema and TypeScript types | VERIFIED | Exports ChartDataSchema, MonthEntrySchema, ChartData, MonthEntry; self-test passes |
| `src/data/.gitkeep` | Committed placeholder for output dir | VERIFIED | File exists on disk |
| `scripts/scrape-pension.ts` | Pension API scraper exporting fetchPensionData() | VERIFIED | Substantive implementation: two-step API lookup, period map, per-month fetch loop, CLI smoke-test |
| `scripts/scrape-police.ts` | Police data reader exporting fetchPoliceData() | VERIFIED | Reads scam_amounts.jsonl, groups by YYYY-MM, sums amounts, exports fetchPoliceData() |
| `scripts/scrape.ts` | Orchestrator merging both sources, validates, writes JSON | VERIFIED | Imports both scrapers, unifies month set, Zod gate before writeFile, exits 1 on failure |
| `src/data/chart-data.json` | Committed seed with real monthly data | VERIFIED | 12 months, generatedAt ISO string, committed in git at f9a9d61 |
| `.planning/phases/01-scrapers/01-DISCOVERY-PASS.md` | Confirmed EUR patterns or data substitution documented | VERIFIED | Documents the JSONL substitution approach; no regex needed since amounts are numeric in JSONL |

---

## Key Link Verification

### From 01-01-PLAN.md

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| scripts/schema.ts (future consumers) | schema.ts | `import { MonthEntry } from './schema'` | WIRED | Both scrape-pension.ts and scrape-police.ts import `type { MonthEntry } from './schema.js'` |
| scripts/scrape.ts | schema.ts | `import { ChartDataSchema } from './schema.js'` | WIRED | Line 4 of scrape.ts: `import { ChartDataSchema } from './schema.js'` |

### From 01-02-PLAN.md

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| scrape-pension.ts | pensionikeskus.ee API | two-step fetch, periodMap.get | WIRED | buildPeriodMap() fetches period list; fetchMonthTotal() fetches per-period stats via hashed ID |
| scrape-pension.ts | schema.ts | `import type { MonthEntry }` | WIRED | Line 1: `import type { MonthEntry } from './schema.js'` |

### From 01-04-PLAN.md

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| scrape-police.ts | scam_amounts.jsonl | readline streaming, JSONL_PATH | WIRED | readJsonl() streams scam_amounts.jsonl; JSONL_PATH resolves relative to script location |
| scrape-police.ts | schema.ts | `import type { MonthEntry }` | WIRED | Line 5: `import type { MonthEntry } from './schema.js'` |

### From 01-05-PLAN.md

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| scrape.ts | scrape-pension.ts | `import { fetchPensionData }` | WIRED | Line 2: `import { fetchPensionData } from './scrape-pension.js'` — called with monthCount=12 |
| scrape.ts | scrape-police.ts | `import { fetchPoliceData }` | WIRED | Line 3: `import { fetchPoliceData } from './scrape-police.js'` — called with monthCount=12 |
| scrape.ts | schema.ts | `ChartDataSchema.safeParse` | WIRED | Lines 4 + 37: imported and used as validation gate |
| scrape.ts | src/data/chart-data.json | `writeFile` after safeParse | WIRED | Line 47: `await writeFile(outputPath, ...)` only reached after result.success |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PIPE-01 | 01-03, 01-04 | Nightly job scrapes politsei.ee news articles | PARTIAL — see note | Police data in committed JSON is real; but live scraping of politsei.ee not implemented |
| PIPE-02 | 01-02 | Nightly job fetches pensionikeskus.ee JSON API | SATISFIED | fetchPensionData() calls live API; 11 months of real pension totals in chart-data.json |
| PIPE-03 | 01-01, 01-05 | Scraper writes combined monthly data to committed JSON | SATISFIED | chart-data.json committed at f9a9d61 with 12 months, Zod-validated |

### Note on PIPE-01

PIPE-01 as written in REQUIREMENTS.md describes a live Playwright + Cheerio scraper of politsei.ee articles. The implemented police scraper (`scripts/scrape-police.ts`) is a JSONL reader, not a live web scraper. This is a **user-directed deviation** explicitly documented in 01-DISCOVERY-PASS.md and 01-04-SUMMARY.md: the user pre-scraped scam data and provided it as `scam_amounts.jsonl` (97 records, Oct 2025 – Mar 2026).

For the Phase 1 goal ("real monthly data captured in a validated, committed JSON file"), PIPE-01 is satisfied: the JSON contains real scam figures sourced from politsei.ee. However, the **nightly update** aspect of PIPE-01 will require Phase 2 to either:
  - Wire the JSONL reader to a regularly updated data file, or
  - Build the Playwright scraper that PIPE-01 originally described

REQUIREMENTS.md marks PIPE-01 as complete. This is accurate for the seed data, but the live-scraping capability that would enable nightly updates is not yet built. Phase 2 planning should account for this.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/schema.ts` | 17–31 | Self-test runs unconditionally on import | Info | When scrape.ts imports schema.ts, the self-test executes and prints "Schema self-test passed: 6 months" to stdout every run — noise in production output |

The self-test prints on every import because there is no `isMain` guard (unlike the scraper files which use `process.argv[1]?.endsWith()` checks). This does not block functionality — the self-test passes and exits normally — but produces spurious console output when schema.ts is imported. Not a blocker for Phase 1.

---

## Human Verification Required

### 1. Pension EUR value spot-check

**Test:** Look up one month in pensionikeskus.ee (e.g. February 2026) and compare the displayed total against chart-data.json `pensionEur` for 2026-02 (49,546,839)
**Expected:** Values agree within rounding (the scraper uses Math.round on the API float totals)
**Why human:** Cannot call the live API in verification; correctness of the F+P type summation can only be confirmed against the official UI display

### 2. Police JSONL source accuracy

**Test:** Pick 2-3 date entries from scam_amounts.jsonl and locate the corresponding politsei.ee daily crime report article to confirm the amount matches
**Expected:** The EUR amount in the JSONL matches the figure stated in the article text for that date
**Why human:** scam_amounts.jsonl is user-provided pre-scraped data; no programmatic way to verify its accuracy without live article fetching

---

## Deviation Summary

The most significant deviation from the original plan is the replacement of a live Playwright/Cheerio politsei.ee scraper (as specified in 01-04-PLAN.md) with a JSONL file reader. This was user-directed: the user provided `scam_amounts.jsonl` with pre-scraped incident data. The deviation:

- Is fully documented in 01-DISCOVERY-PASS.md, 01-03-SUMMARY.md, and 01-04-SUMMARY.md
- Does not prevent Phase 1's goal (committed JSON with real data from both sources)
- Does create a forward dependency: Phase 2 nightly automation must decide how police data stays fresh

---

## Commit Verification

Key commits verified in git log:

| Commit | Description |
|--------|-------------|
| `139e0eb` | Initialize npm project with scraper dependencies |
| `b73b44a` | Add Zod schema and TypeScript types |
| `aa575f3` | Implement pension API scraper |
| `dcb6a2d` | Implement scrape-police.ts as JSONL reader |
| `f9a9d61` | Implement scrape.ts orchestrator and commit initial chart-data.json |

All commits present in git log. chart-data.json traced to f9a9d61.

---

_Verified: 2026-03-06_
_Verifier: Claude (gsd-verifier)_
