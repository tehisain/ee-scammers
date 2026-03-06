---
plan: 01-03
status: complete
approach: data-provided
---

# Summary: 01-03 Police EUR Pattern Discovery

## What Was Done

Scam amount data was pre-scraped by the user and provided as `scam_amounts.jsonl`
(97 incidents, Oct 2025 – Mar 2026). No manual article reading or regex derivation needed.

## Key Files

- `scam_amounts.jsonl` — source of truth for all police scam amounts
- `.planning/phases/01-scrapers/01-DISCOVERY-PASS.md` — documents the data format and aggregation approach

## Impact on 01-04

`scripts/scrape-police.ts` will be a JSONL reader, not a Playwright scraper:
- Read `scam_amounts.jsonl`
- Group by YYYY-MM month
- Sum amounts per month
- Return `MonthEntry[]`

## Deviations

Original plan: manually read 10+ live politsei.ee articles and derive regex patterns.
Actual: user provided pre-scraped data as structured JSONL — simpler and more reliable.
