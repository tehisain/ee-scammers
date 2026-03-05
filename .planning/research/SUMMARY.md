# Project Research Summary

**Project:** Eesti petturite statistika (ee-scammers)
**Domain:** Static data visualization site with automated government data scraping
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

This is a single-page static awareness site that visualizes two Estonian public data series on a dual-line chart: monthly scam losses reported by the Estonian police vs. monthly pension (II pillar) contributions. The correct architectural pattern for this type of project is a commit-driven data pipeline ("git scraping"): a nightly GitHub Actions job scrapes both sources, writes a JSON data file to the repo, commits it, and a push-triggered Vercel deploy rebuilds the static Astro site with the fresh data baked in. No server, no database, no runtime API calls.

The recommended stack is Astro 5 (static site generator), Node.js 22 + TypeScript (scraper), Playwright + Cheerio (for the JS-rendered police news feed), native fetch (for the pension centre JSON API), and Chart.js 4 (dual-line chart on canvas). The most important pre-research finding is that the two data sources require fundamentally different scraping strategies: pensionikeskus.ee exposes a public JSON API at `/ws/et/stats/receipt-statistics` that requires no browser, while politsei.ee renders its news listing via JavaScript and embeds scam totals in Estonian prose across multiple articles — requiring Playwright for rendering and careful regex extraction for amounts.

The primary risks are scraper fragility (government sites change without notice), GitHub Actions cron suspension after 60 days of repo inactivity, and the unstructured nature of the police data. All three are preventable with upfront design choices: output validation assertions in scrapers, a keepalive workflow action, and a manual discovery pass through 6-12 months of police articles before writing any extraction code. The frontend risk surface is low — this is a well-trodden static chart pattern with no novel engineering.

## Key Findings

### Recommended Stack

The stack is deliberately minimal. Astro 5 compiles `.astro` components to plain HTML at build time and ships zero JavaScript by default; Chart.js initializes from an inline `<script>` tag with no framework coupling. Node.js 22 LTS ships native `fetch`, eliminating the need for Axios or node-fetch. TypeScript with `strict: true` across both scraper and site catches schema drift early. Playwright is used only for politsei.ee (where JS rendering is required); the pension API needs only native fetch, saving 30–60 seconds of browser startup per CI run.

**Core technologies:**
- **Astro 5**: Static site generator — zero-JS by default, build-time JSON import, official Vercel adapter
- **Node.js 22 LTS + TypeScript 5**: Scraper runtime — matches GitHub Actions runner, native fetch built in
- **Playwright 1.x + Cheerio 1.x**: politsei.ee scraping — Playwright renders JS listing, Cheerio parses individual article HTML
- **Native fetch**: pensionikeskus.ee API — plain HTTP GET to the public JSON endpoint, no browser needed
- **Chart.js 4**: Dual-line chart — canvas-based, no framework dependency, tooltip and responsive support built in
- **Zod 3**: Runtime schema validation of scraped data — prevents silent schema drift from breaking the chart
- **GitHub Actions + Vercel**: CI/CD — nightly cron, commit-driven deploy, free for public repos
- **date-fns 3**: Date normalization — handles Estonian month name parsing from politsei.ee articles

### Expected Features

All P1 features are low-implementation-cost. The chart itself is the product — there is no complex application logic. Trust signals (attribution, methodology, timestamp) are as important as the chart itself for an Estonian public data audience.

**Must have (table stakes):**
- Double-line chart (scam losses vs pension contributions, monthly, all available history) — core value proposition
- Interactive hover and touch tooltips with exact EUR values — line charts feel broken without them
- Labeled axes, series legend, Estonian-language chart title — chart is unreadable without these
- "Andmed uuendatud" timestamp injected at build time — prevents site from looking stale or abandoned
- Data source attribution with links to politsei.ee and pensionikeskus.ee — non-negotiable for trust with Estonian audience
- Methodology / explanation section in Estonian — preempts "is this real?" objections
- Open Graph meta tags + static preview image — required for social sharing to render correctly on Facebook/Messenger/Telegram
- `lang="et"` on `<html>` — correct browser and screen-reader behavior, one attribute

**Should have (competitive):**
- Plain-text summary paragraph below chart — accessibility and SEO, doubles as the emotional hook
- Downloadable CSV link — journalists and researchers expect raw data access, trivially available since CI already produces the file
- Chart annotation for notable months (`<ReferenceLine>`) — turns numbers into a story

**Defer (v2+):**
- Date range filter / zoom — adds JS complexity, dilutes the narrative in v1
- Dynamic OG image generation (Satori) — static screenshot sufficient for v1
- Additional comparison metrics (salary, budget) — validate pension framing first

### Architecture Approach

The system has three layers: a CI scraping layer (GitHub Actions cron), a build layer (Astro reading committed JSON), and a browser layer (Chart.js hydrating a canvas element). The key architectural decision is that data is committed to the repo as JSON and consumed at build time — no runtime fetch, no loading state, no server. Vercel's git integration handles deploys automatically on push. The scraper is separated into one file per source plus a transform layer that owns the output schema; this boundary is critical for maintainability when sources inevitably change.

**Major components:**
1. **`scripts/scrape.ts`** (pension) — calls pensionikeskus.ee JSON API, iterates monthly periods, aggregates per-fund amounts
2. **`scripts/scrape.ts`** (police) — Playwright renders politsei.ee news listing, Cheerio + regex extracts EUR totals from prose
3. **Transform layer** — merges both sources by calendar month, fills gaps with `null`, validates output shape with Zod, writes `src/data/chart-data.json`
4. **`.github/workflows/nightly.yml`** — cron trigger, runs scraper, commits data if changed, push triggers Vercel redeploy
5. **`src/pages/index.astro`** — imports JSON at build time, passes to chart component, renders Estonian layout shell
6. **`src/components/LineChart.tsx`** (or `.astro`) — Chart.js dual-line chart, `client:load` island, responsive container

### Critical Pitfalls

1. **pensionikeskus.ee page is AJAX-only; use the JSON API directly** — the statistics page HTML contains only a loading placeholder. Call `GET /ws/et/stats/receipt-statistics` directly; sum `data.stats[].amount` across all funds per period. Verified live.
2. **politsei.ee scam totals are in prose, not structured fields** — manually read 6-12 months of articles before writing extraction code. Document the actual Estonian phrasing patterns. Plan for months with no explicit total.
3. **GitHub Actions cron suspends after 60 days of repo inactivity** — add `gautamkrishnar/keepalive-workflow` to the workflow from day one. Add Healthchecks.io monitoring for the nightly run.
4. **Scrapers break silently on HTML structure changes** — assert non-empty output before committing; validate pension API response shape with Zod; alert if JSON entry count drops below historical minimum.
5. **politsei.ee listing uses "show more" lazy loading, not static pagination** — either programmatically load all pages or use year/month archive sidebar URLs for deterministic monthly fetches.

## Implications for Roadmap

Based on research, the natural build order follows the data dependency chain: scrapers must work before the site can show real data, and the architecture explicitly suggests building in that order to avoid blocking frontend on scraper uncertainty.

### Phase 1: Data Source Discovery and Scraper Implementation

**Rationale:** Both data sources were verified live but the police data format (prose articles) is the highest-risk unknown in the project. Discovery must happen before code. This phase produces working scrapers and a validated JSON data file — which unblocks all frontend work. The pension scraper is lower-risk (structured API) and should be built first to validate the pipeline end-to-end.
**Delivers:** Working `scripts/scrape.ts` for both sources; validated `src/data/chart-data.json` with real historical data; Zod schema for the data contract
**Addresses:** Table stakes data pipeline; pensionikeskus.ee API integration; politsei.ee prose extraction
**Avoids:** Silent scraper failures (add assertions from the start); wrong pension totals (sum across all funds, not one); pagination miss on police listing

### Phase 2: GitHub Actions CI/CD Pipeline

**Rationale:** Wire the automation before the frontend, not after. Testing the commit-and-deploy loop early surfaces integration issues (Vercel deploy hook timing, Actions permissions for git push) while the project is simple. The keepalive workflow must be added here, not retrofitted.
**Delivers:** Nightly cron workflow that scrapes, commits data if changed, and triggers a Vercel redeploy; keepalive mechanism; Healthchecks.io monitoring
**Uses:** GitHub Actions cron, `gautamkrishnar/keepalive-workflow`, Vercel git push integration
**Implements:** Commit-driven data pipeline pattern; idempotent scraper runs
**Avoids:** 60-day cron suspension pitfall; silent stale data; non-deterministic timing issues (set cron to 03:00 UTC)

### Phase 3: Static Site and Chart

**Rationale:** With real data flowing and CI wired, the frontend is straightforward. Astro + Chart.js is a well-documented pattern. All P1 features are low-implementation-cost. Build the shell first with sample data, then wire to the real JSON. Mobile testing must happen before this phase closes.
**Delivers:** Production-ready Astro site with dual-line chart, all P1 features: tooltips, labeled axes, Estonian copy, methodology section, data attribution, last-updated timestamp, Open Graph meta
**Uses:** Astro 5, Chart.js 4, TypeScript, `client:load` island pattern
**Implements:** Build-time JSON consumption, browser-side Chart.js hydration
**Avoids:** Runtime fetch anti-pattern; chart breaking on mobile (test at 375px); English labels on Estonian site; no data-gap handling (`spanGaps: true` for null months)

### Phase 4: Trust Signals and Social Sharing

**Rationale:** The awareness mission depends on the site being shared. OG meta tags and a static preview image are P1 but can be completed independently of chart wiring. This phase also adds the plain-text summary and downloadable CSV — features that multiply impact once real data is live.
**Delivers:** Custom OG image with chart preview; plain-text Estonian summary paragraph below chart; CSV download link; `lang="et"` and accessibility attributes
**Addresses:** Social sharing on Facebook/Messenger/Telegram; accessibility; journalist/researcher data access

### Phase Ordering Rationale

- Scrapers before site: the frontend is blocked on real data. A hand-crafted sample JSON can unblock chart styling but the scraper must validate before launch.
- CI before frontend completion: the deploy loop must work before the site is "done" — testing it late risks discovering Vercel/Actions integration issues at the worst time.
- Police scraper is the highest-risk component: it requires the most discovery work and is most likely to need iteration. It should not block pension scraper work.
- All P1 features are low-cost: there is no reason to defer them. Phase 3 delivers the complete MVP.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (police scraper):** politsei.ee article phrasing patterns for monetary amounts are undocumented. Manual article review required before writing extraction code. Pagination strategy (lazy load vs archive URLs) needs verification against the live site.
- **Phase 1 (pension API):** The `period` parameter semantics and fund aggregation logic need verification against a live API call before implementing the monthly loop.

Phases with standard patterns (skip research-phase):
- **Phase 2 (GitHub Actions):** Well-documented cron + commit + push pattern; keepalive action is off-the-shelf.
- **Phase 3 (Astro + Chart.js):** Established static chart island pattern; official docs are comprehensive.
- **Phase 4 (OG/trust signals):** Standard HTML meta tags; no novel engineering.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Both data sources verified live; Astro/Chart.js capabilities confirmed against official docs; pension API confirmed public JSON |
| Features | HIGH | Core chart features and accessibility standards are well-documented; MEDIUM on data freshness UX patterns (enterprise-focused sources) |
| Architecture | HIGH | Commit-driven git scraping is a well-established pattern (Simon Willison); Astro build-time JSON import confirmed in official docs |
| Pitfalls | HIGH | Critical pitfalls confirmed by direct site inspection; GitHub Actions cron suspension confirmed by community discussions |

**Overall confidence:** HIGH

### Gaps to Address

- **Police article extraction patterns:** The exact Estonian phrasing used for scam totals in politsei.ee articles is unknown. Must do a manual discovery pass (read 6-12 months of articles) before writing any regex. This is the project's primary uncertainty.
- **Pension fund aggregation:** The pensionikeskus.ee API returns one entry per pension fund in `data.stats`. The correct aggregation (sum all `type == "F"` entries?) needs to be verified against the API response before assuming correctness.
- **politsei.ee lazy load strategy:** Whether year/month archive sidebar URLs exist and are stable needs to be confirmed on the live site during Phase 1.
- **Data availability window:** How many months of reliable police scam data are actually available is unknown until articles are read. The chart date range depends on this.

## Sources

### Primary (HIGH confidence)
- Live API: `GET https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics` — confirmed public JSON endpoint, 272 monthly periods, per-fund amounts in EUR
- Live page: `https://www.politsei.ee/et/uudised/oeoepaeevainfo` — confirmed JS-rendered listing, article links in `<h4><a>`, "show more" pagination
- Astro official docs — static export, Vercel/Netlify deploy, Content Layer API
- Playwright official docs — GitHub Actions `npx playwright install chromium --with-deps` pattern
- Chart.js official docs — responsive, spanGaps, tooltip API
- GitHub Actions official docs — schedule event cron syntax and limitations

### Secondary (MEDIUM confidence)
- GitHub community discussions — 60-day cron suspension behavior, timing delays
- DataSense / Smashing Magazine — mobile data visualization UX patterns
- Simon Willison "git scraping" pattern — commit-driven data pipeline

### Tertiary (LOW confidence)
- Chart.js vs Observable Plot vs Recharts comparison (2025 WebSearch) — framework-coupling distinctions

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
