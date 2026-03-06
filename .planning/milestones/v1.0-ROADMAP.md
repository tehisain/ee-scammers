# Roadmap: Eesti petturite statistika

## Overview

Three phases deliver the site end-to-end. First, scrapers are built and validated against both live data sources, producing a committed JSON file with real historical data. Second, the GitHub Actions automation is wired: nightly cron runs the scrapers, commits changes, and triggers a GitHub Pages deploy — with a keepalive mechanism to prevent cron suspension. Third, the Astro static site is built with the dual-line chart, all Estonian copy, trust signals, and social sharing metadata, producing the complete live site.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Scrapers** - Build and validate both data scrapers; produce real committed JSON (completed 2026-03-06)
- [x] **Phase 2: Automation** - Wire nightly GitHub Actions pipeline and GitHub Pages deploy (completed 2026-03-06)
- [x] **Phase 3: Site** - Build the Astro site with chart, Estonian copy, and all trust signals (completed 2026-03-06)

## Phase Details

### Phase 1: Scrapers
**Goal**: Real monthly data from both sources is captured in a validated, committed JSON file
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-03
**Success Criteria** (what must be TRUE):
  1. Running the scraper script locally produces a `src/data/chart-data.json` with at least 6 months of pension contribution data, all values in EUR
  2. Running the scraper script locally produces scam loss entries for the months where police articles exist, with null for months with no article
  3. The JSON file passes Zod schema validation — no missing fields, no wrong types
  4. Both scrapers complete without error when run in sequence and the output file is committed to the repo
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Bootstrap project: package.json, Zod schema, src/data/ directory
- [ ] 01-02-PLAN.md — Pension API scraper: fetchPensionData() with two-step period lookup
- [ ] 01-03-PLAN.md — Police discovery pass: read 10+ live articles, document EUR patterns
- [ ] 01-04-PLAN.md — Police scraper: Playwright pagination, Cheerio extraction, fetchPoliceData()
- [ ] 01-05-PLAN.md — Orchestrator + committed JSON: scrape.ts merges data, writes chart-data.json

### Phase 2: Automation
**Goal**: The data pipeline runs nightly without manual intervention and the site is reachable at a public URL
**Depends on**: Phase 1
**Requirements**: PIPE-04, SITE-05
**Success Criteria** (what must be TRUE):
  1. A GitHub Actions cron job runs at 03:00 UTC nightly, executes both scrapers, and commits updated data if it changed
  2. Every commit to main triggers an automatic GitHub Pages rebuild and the site is reachable at its public URL within 5 minutes
  3. The keepalive workflow is present and prevents the cron from being suspended after 60 days of no pushes
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — scrape.yml: nightly cron + conditional commit + keepalive job (PIPE-04)
- [ ] 02-02-PLAN.md — deploy.yml: Pages deploy skeleton + repository Pages source setup (SITE-05)

### Phase 3: Site
**Goal**: A complete, live Estonian-language awareness site displays the dual-line chart with all trust signals and is ready to share
**Depends on**: Phase 2
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, SITE-01, SITE-02, SITE-03, SITE-04
**Success Criteria** (what must be TRUE):
  1. The live site displays a dual-line chart with monthly scam loss and pension contribution data, readable on a 375px mobile screen
  2. Hovering or tapping a data point shows a tooltip with the exact EUR value for both series
  3. A plain-text Estonian summary sentence below the chart states the current month's comparison (e.g. percentage of pension contributions lost to scams)
  4. The page includes attribution links to both source sites and a methodology section in Estonian explaining how data is collected
  5. Sharing the URL on Facebook, Telegram, or Messenger renders a chart preview image via Open Graph meta tags
**Plans**: 3 plans

Plans:
- [ ] 03-W0-PLAN.md — Test scaffold: vitest install, summarySentence() pure function + tests, page smoke test stub
- [ ] 03-01-PLAN.md — Astro site: index.astro with Chart.js dual-line chart, Estonian copy, attribution, methodology, OG head
- [ ] 03-02-PLAN.md — OG screenshot + deploy.yml: og-screenshot.ts post-build step, complete deploy workflow, human visual check

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scrapers | 5/5 | Complete   | 2026-03-06 |
| 2. Automation | 2/2 | Complete   | 2026-03-06 |
| 3. Site | 4/4 | Complete   | 2026-03-06 |
