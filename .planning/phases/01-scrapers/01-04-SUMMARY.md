---
phase: 01-scrapers
plan: "04"
subsystem: scrapers
tags: [police, jsonl, scraper, data-pipeline]
dependency_graph:
  requires: [01-01, 01-03]
  provides: [scripts/scrape-police.ts, fetchPoliceData]
  affects: [pipeline, chart-data]
tech_stack:
  added: []
  patterns: [jsonl-reader, readline-interface, month-aggregation]
key_files:
  created:
    - scripts/scrape-police.ts
  modified: []
decisions:
  - "JSONL reader instead of Playwright scraper — pre-scraped data provided in scam_amounts.jsonl"
  - "Math.round() applied to totals to handle fractional cents (e.g. 229908.76)"
  - "scamEur returned as integer (rounded), not null, for all months present in JSONL"
metrics:
  duration: "3 min"
  completed_date: "2026-03-06"
---

# Phase 1 Plan 4: Police Scraper (JSONL Reader) Summary

**One-liner:** JSONL reader aggregating pre-scraped police scam amounts into monthly EUR totals via readline streaming.

## What Was Built

`scripts/scrape-police.ts` implements `fetchPoliceData()` as a JSONL reader instead of a Playwright scraper. The function reads `scam_amounts.jsonl` from the project root line by line using Node.js `readline`, parses each record as `{ date: string, amount: number }`, groups amounts by the YYYY-MM prefix of the date field, and sums them per month. The result is a `Pick<MonthEntry, 'month' | 'scamEur'>[]` array sorted ascending by month.

## Deviation from Plan

### Key Deviation: JSONL reader instead of Playwright scraper

The plan originally called for a Playwright pagination scraper hitting politsei.ee with Cheerio + EUR regex parsing. The user pre-scraped all data into `scam_amounts.jsonl` (97 incident records, Oct 2025 – Mar 2026). The implementation reads that file directly — no Playwright, no Cheerio, no regex needed.

**Tracked as:** [User-Directed] JSONL reader substituted for Playwright scraper per objective directive and 01-DISCOVERY-PASS.md.

## Verification Output

```
[police] Fetched 6 months
[police] 2025-10: 2,636,999 EUR
[police] 2025-11: 2,474,494 EUR
[police] 2025-12: 1,629,348 EUR
[police] 2026-01: 900,824 EUR
[police] 2026-02: 1,998,685 EUR
[police] 2026-03: 121,368 EUR
```

All 6 months present in the JSONL file are returned with plausible EUR totals. Exit code 0.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement police scraper as JSONL reader | dcb6a2d | scripts/scrape-police.ts |

## Decisions Made

1. **JSONL reader over Playwright** — Pre-scraped data eliminates the need for browser automation and regex parsing; simpler, faster, no network dependency.
2. **Math.round() for totals** — Some amounts have fractional cents (e.g. 229908.76); rounding to integer keeps scamEur consistent with integer EUR display.
3. **readline streaming** — Used Node.js built-in `createInterface`/`createReadStream` for line-by-line parsing without loading entire file into memory.
4. **scamEur non-null for present months** — Every month with at least one JSONL record returns a non-null scamEur; null would only apply to months with zero records (none in current dataset).
