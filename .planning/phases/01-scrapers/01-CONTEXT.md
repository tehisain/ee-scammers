# Phase 1: Scrapers - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build and validate both data scrapers; produce a committed `src/data/chart-data.json` with real historical monthly data. Covers the initial seed (up to 12 months back) and the incremental daily update logic. GitHub Actions automation and the frontend site are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Data history scope
- Both scrapers go back **12 months** on the initial seed run — police and pension data start from the same point
- The pension API has 272 months available (back to 2003) but is capped at 12 months to match police data coverage
- Pension data beyond 12 months would show no police comparison on the chart — not useful

### Daily update behavior
- The nightly job re-aggregates the **current month's running total** from all police articles found so far
- Updated daily — chart shows a growing number until the month closes
- Does not wait for month-end before writing current month data

### Police article structure
- Police reports are **daily**, with one report covering multiple days for weekends
- Monthly total = sum of all individual report amounts within that calendar month
- Not a pre-aggregated figure — scraper must sum per-report EUR amounts by calendar month

### Police pagination
- Use **programmatic "show more" clicking** until the oldest loaded article is >12 months ago
- Approximately 250 articles for 12 months (~20-25 per month), requiring ~10-15 button clicks
- No need to discover archive URLs — straightforward to implement

### Police discovery pass (required pre-step)
- Before writing any extraction code, open ~10 police articles manually and document the actual Estonian phrasing patterns for scam EUR amounts
- Write regex only after confirming the real patterns — do not guess
- This is a required plan task, not optional

### Police missing amounts
- Daily reports with no EUR amount are **skipped silently** — not all days have reported scam incidents, this is normal
- Only warn if an entire month has zero articles (possible data gap)
- No hard failures on missing amounts per article

### Police month attribution
- Use the **article's publish date** to assign the daily report's EUR total to a calendar month
- Simple and deterministic — documented in the site methodology section so users understand the heuristic

### Pension API approach
- Call `GET https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics` directly — no browser needed
- Sum `data.stats[].amount` across all funds per period
- The aggregation logic (which `type` values to include) must be verified against a live API call before implementing the monthly loop

### Output validation
- Zod schema validation on the output JSON before committing — no missing fields, no wrong types
- Assert non-empty output; warn if entry count drops below expected minimum

### Claude's Discretion
- Exact script file structure (one combined `scrape.ts` vs separate per-source files with orchestrator)
- Pension fund `type` filter logic (verify live, then implement)
- Retry/timeout handling for network calls
- Temp file handling during scraper run

</decisions>

<specifics>
## Specific Ideas

- Scrape history once (initial seed, up to 12 months back), store as committed JSON, then update daily incrementally
- Police data requires summation of many small daily reports into monthly totals — not a single monthly figure

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — project is starting from scratch

### Established Patterns
- None yet — this is the first phase

### Integration Points
- Output file: `src/data/chart-data.json` — consumed by the Astro site in Phase 3 at build time
- Script entry point expected at `scripts/scrape.ts` (from research architecture notes)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-scrapers*
*Context gathered: 2026-03-05*
