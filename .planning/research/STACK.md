# Stack Research

**Domain:** Static data visualization site with automated web scraping (Estonian public sector data)
**Researched:** 2026-03-05
**Confidence:** HIGH — both data sources verified live, framework capabilities verified against official docs

---

## Critical Pre-Research Finding

Both target websites were fetched directly during research. Key findings that shape the entire stack:

**pensionikeskus.ee** exposes a public JSON API at `/ws/et/stats/receipt-statistics` that accepts plain HTTP GET with a `?period=YYYY-MM` query parameter (no authentication, no cookies required). It returns structured per-fund data with euro amounts. No browser needed.

**politsei.ee** loads daily incident reports dynamically via JavaScript. The listing page (`/et/uudised/oeoepaeevainfo`) renders entries in `<h4><a>` elements after JS execution — individual articles must be fetched to extract euro amounts from text. Playwright is required here.

This means: two different scraping strategies in the same pipeline. One HTTP client, one headless browser.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Astro | 5.x (latest ~5.17) | Static site generator | Zero-JS by default, ships only what you import. A single-chart site needs no React or Vue — Astro's `.astro` components compile to plain HTML at build time. Excellent Vercel/Netlify support with official adapters. Content Layer API reads local JSON files at build time, which is exactly the data pipeline pattern needed here. |
| Node.js | 22 LTS | Runtime for scraper scripts | GitHub Actions runners ship Node 22 LTS. The scraper runs as a standalone Node script before the Astro build step — no framework entanglement. |
| TypeScript | 5.x | Language for both scraper and site | Astro has built-in TypeScript support. Strongly typing the scraped data shape (monthly records with `date`, `scamLoss`, `pensionContrib`) catches schema drift early. Use `strict: true`. |

### Data Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| node-fetch (or native `fetch`) | native in Node 22 | HTTP client for pension data API | Node 22 includes native `fetch`. No additional dependency needed to call `https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics`. A simple loop over known monthly periods is sufficient. |
| Playwright | 1.x (latest ~1.50) | Headless browser for politsei.ee | politsei.ee renders article listings via JS. Playwright (Chromium) is required to render the page, extract article links from `<h4><a>` elements, then fetch and parse individual article text for euro loss amounts. Playwright is better than Puppeteer for this use case: actively maintained by Microsoft, stronger TypeScript types, and the `playwright install chromium --with-deps` GitHub Actions integration is well-documented. |
| cheerio | 1.x | HTML parsing of individual articles | After Playwright navigates to each politsei.ee article and returns `page.content()`, use Cheerio to parse the static HTML. This is the hybrid approach: Playwright handles JS rendering of the listing, Cheerio handles fast DOM traversal of individual article pages once their HTML is in hand. Faster and less fragile than using Playwright's full selector API on every article. |

### Visualization

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Chart.js | 4.x (latest ~4.5.1) | Double line chart rendering | Chart.js renders on `<canvas>` (not SVG), which is fast and works without a framework. For a single chart in a no-JS-framework Astro site, Chart.js is the correct choice. It initializes with a `<script>` tag and JSON data embedded in the page — no hydration framework needed. Observable Plot 0.6 is excellent but is grammar-of-graphics oriented and adds complexity for what is a single, well-defined chart type. Recharts requires React. D3 is low-level and over-engineered for this use case. |

### Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| GitHub Actions | — | Nightly scrape + rebuild CI/CD | Free for public repos. Cron syntax (`0 3 * * *` = 03:00 UTC nightly) is native. The workflow: run scraper → write `src/data/chart-data.json` → run `astro build` → push dist/ or trigger deployment. Both Vercel and Netlify support push-triggered deploys, meaning a commit to main from the Actions runner is enough to redeploy. |
| Vercel (preferred) or Netlify | — | Static hosting | Both are zero-config for Astro static output. Vercel is preferred: faster edge network, instant cache invalidation on push, and `vercel --prebuilt` allows the Actions runner to deploy the pre-built `dist/` directory directly without rebuilding on Vercel's servers. This gives you explicit control over what gets deployed. |

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 3.x | Date parsing and formatting for Estonian months | Required in scraper to normalize date strings from both sources into `YYYY-MM` keys. politsei.ee uses Estonian month names ("märts", "aprill") in article timestamps; date-fns handles locale parsing. |
| `zod` | 3.x | Runtime schema validation of scraped data | Validate the shape of the pensionikeskus.ee API response and parsed politsei.ee data before writing to JSON. Prevents silent schema drift (e.g., API field rename) from producing a broken chart with no error. |

---

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@astrojs/check` | TypeScript checking for `.astro` files | Run as part of CI before build. `astro check` catches type errors in `.astro` component frontmatter. |
| ESLint + `eslint-plugin-astro` | Linting | Optional for this project size, but the `eslint-plugin-astro` is the official plugin if added. |
| `prettier` + `prettier-plugin-astro` | Formatting | The official Prettier plugin handles `.astro` file formatting correctly. |

---

## Installation

```bash
# Bootstrap Astro project (select "Empty" template, TypeScript: strict)
npm create astro@latest

# Scraper dependencies
npm install playwright cheerio date-fns zod

# Install only Chromium (not Firefox/WebKit — saves ~400MB on CI)
npx playwright install chromium

# Dev dependencies
npm install -D @astrojs/check typescript prettier prettier-plugin-astro
```

```bash
# GitHub Actions runner: install Chromium with OS dependencies
npx playwright install chromium --with-deps
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Astro | Next.js (static export) | Next.js static export is appropriate when the site already uses React and needs client-side routing across many pages. For a single-page chart site with no React, Next.js adds unnecessary weight and a more complex static export config. |
| Astro | SvelteKit (static adapter) | SvelteKit is excellent but has a steeper zero-to-static learning curve than Astro for a content-first site. Choose SvelteKit if you plan to add interactive Svelte components beyond a single chart. |
| Astro | Plain HTML + Vite | Viable for a project this small. The benefit of Astro is build-time JSON import, TypeScript in component frontmatter, and trivial Vercel/Netlify deploys with official adapters. Plain HTML would require manual wiring of all of this. |
| Chart.js | Observable Plot | Plot is better for exploratory analysis and grammar-of-graphics composition. For a single, fixed chart type (double line) with known axes, Chart.js is less code. Plot would be preferable if the chart design were still evolving or if you needed faceting, transforms, or statistical marks. |
| Chart.js | Recharts | Recharts requires React. Do not introduce React as a dependency for one chart. |
| Chart.js | D3.js | D3 is the right choice when you need custom SVG geometry, transitions, or chart types that libraries don't support. A double line chart is not that case. D3 would be 3-5x more implementation effort for identical output. |
| Playwright (for politsei.ee) | Puppeteer | Playwright has better TypeScript types, is more actively maintained, and `playwright install --with-deps` handles Linux CI dependencies cleanly. Puppeteer and Playwright are functionally equivalent here — the distinction matters only for team familiarity. |
| node-fetch / native fetch (for pensionikeskus.ee) | Playwright | Playwright is unnecessary for the pension data source. The pensionikeskus.ee API responds to plain HTTP GET. Using Playwright for both scrapers would waste 30-60 seconds of browser startup time in CI for no reason. |
| Vercel | Netlify | Netlify is a valid choice. The only practical difference is that Vercel's `vercel --prebuilt` CLI allows deploying a pre-built artifact from the Actions runner, making the data-scrape → build → deploy pipeline more explicit. Netlify's equivalent is `netlify deploy --dir=dist --prod`. Choose whichever platform the team already has an account on. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Puppeteer | Overlaps entirely with Playwright. Playwright is a superset with better TypeScript support and first-class GitHub Actions documentation. Having both in a project adds confusion with zero benefit. | Playwright |
| Axios | Node 22 has native `fetch`. Axios adds a dependency and a layer of abstraction over an API that is now built in. | Native `fetch` |
| `react-chartjs-2` | A React wrapper around Chart.js. Introduces React as a dependency when the Astro site has no React. Chart.js initializes directly from a `<script>` tag. | Chart.js directly |
| Gatsby | Gatsby's GraphQL data layer and plugin ecosystem are oriented toward large content sites. It would add significant config overhead for a project that needs: one JSON file, one chart, one page. | Astro |
| Jekyll / Hugo | Ruby/Go static generators have no native Node.js ecosystem integration. The scraper is Node — sharing toolchain with the site generator simplifies CI. | Astro |
| Puppeteer-Cluster / Apify | Distributed scraping frameworks designed for scale. This project scrapes two URLs nightly. The overhead of a scraping framework is not justified. | Standalone Playwright script |

---

## Stack Patterns by Variant

**If the pensionikeskus.ee API requires session cookies in the future:**
- Add Playwright to fetch the pension data page first (to establish session), then intercept the XHR response via `page.route()` — no HTML parsing needed, just capture the JSON directly.
- This avoids needing to reverse-engineer cookie generation manually.

**If politsei.ee switches to a structured data format (e.g., publishes a JSON feed):**
- Drop the Playwright scraper for politsei.ee entirely and use native fetch, matching the pension scraper pattern.
- The JSON data contract (`{ date: string, scamLoss: number, pensionContrib: number }[]`) in `src/data/chart-data.json` would not change.

**If the chart needs to be interactive (tooltips, zoom):**
- Chart.js supports tooltips natively with zero additional configuration — this is already available in the recommended setup.
- For zoom/pan, add `chartjs-plugin-zoom` (which depends on `hammerjs`) — this is an additive change, not an architectural one.

**If the site grows to multiple pages:**
- Astro's file-based routing handles this naturally. No architectural change needed.

---

## Data Pipeline Architecture

The scraper is a standalone Node.js script (`scripts/scrape.ts`), not part of the Astro build. The CI workflow separates concerns:

```
[GitHub Actions cron: 03:00 UTC]
         |
         v
scripts/scrape.ts
  ├── fetch pensionikeskus.ee /ws/et/stats/receipt-statistics (native fetch, loop months)
  └── Playwright → politsei.ee articles → Cheerio → parse euro amounts
         |
         v
src/data/chart-data.json  (committed or passed as artifact)
         |
         v
astro build  (Astro reads chart-data.json at build time, embeds in HTML)
         |
         v
dist/  → vercel deploy --prebuilt  (or: git push → Vercel auto-deploy)
```

The `chart-data.json` schema:
```json
[
  { "month": "2026-02", "scamLoss": 1500000, "pensionContrib": 52000000 },
  ...
]
```

Both values are integers (euro cents or full euros — choose at implementation time and document it).

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `astro@5.x` | Node 18+ | Node 22 LTS recommended for CI; Astro 5 dropped Node 16 support. |
| `playwright@1.50` | Node 18+ | Chromium bundled; `--with-deps` on Ubuntu 22.04 (default GitHub Actions runner) installs all system dependencies. Known occasional hang issue on `apt-get` during `--with-deps` install — pin `ubuntu-latest` to `ubuntu-22.04` in the workflow if this occurs. |
| `chart.js@4.x` | Any modern browser | Canvas-based; works in all browsers that support `<canvas>`. No IE11 support (not relevant for 2026). |
| `cheerio@1.x` | Node 16+ | v1.0.0 was a significant rewrite; ensure `^1.0.0` not `^0.22.0` (legacy API). |
| `zod@3.x` | Node 14+ | Stable API; Zod 4 is in preview as of early 2026 — stick with 3.x for now. |

---

## Sources

- Live API test: `GET https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics` — confirmed public JSON endpoint, no auth, monthly period data with `amount` field in euros. HIGH confidence.
- Live page fetch: `https://www.politsei.ee/et/uudised/oeoepaeevainfo` — confirmed JS-rendered, article links in `<h4><a>` elements. Playwright required. HIGH confidence.
- [Astro official docs — Deploy to Vercel](https://docs.astro.build/en/guides/deploy/vercel/) — confirmed static export default, no adapter config needed for static sites.
- [Astro official docs — Deploy to Netlify](https://docs.astro.build/en/guides/deploy/netlify/) — confirmed static export default.
- [Chart.js npm](https://www.npmjs.com/package/chart.js) — version 4.5.1 confirmed latest as of research date.
- [Playwright GitHub Actions docs](https://playwright.dev/docs/ci-intro) — `npx playwright install chromium --with-deps` workflow pattern confirmed.
- [Observable Plot npm](https://www.npmjs.com/package/@observablehq/plot) — version 0.6.17 confirmed latest.
- WebSearch: Chart.js vs Recharts vs Observable Plot comparison (2025) — MEDIUM confidence (multiple sources agree on framework-coupling distinctions).
- WebSearch: Playwright vs Cheerio for static vs dynamic pages — HIGH confidence (consistent across multiple sources, matches direct site observation).
- [Scheduled Playwright scraping with GitHub Actions](https://www.marcveens.nl/posts/scheduled-web-scraping-made-easy-using-playwright-with-github-actions) — cron pattern and commit-push-deploy loop confirmed.

---

*Stack research for: Eesti petturite statistika — static data visualization site with automated scraping*
*Researched: 2026-03-05*
