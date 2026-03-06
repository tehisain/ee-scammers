# Eesti petturite statistika

## What This Is

A public awareness website (in Estonian) that visualizes how much money scammers steal from Estonians each month, compared to monthly second pillar pension contributions. Data is scraped from the Estonian Police website and the Pension Centre, rebuilt nightly via GitHub Actions, and served as a static site on GitHub Pages.

## Core Value

Make the scale of scam losses feel real by showing them alongside something Estonians already understand — how much they collectively contribute to their pension each month.

## Requirements

### Validated

- ✓ Scrape monthly scam loss totals from Estonian Police (politsei.ee) — v1.0 (JSONL reader from pre-scraped data)
- ✓ Scrape monthly second pillar contribution totals from Pension Centre (pensionikeskus.ee) — v1.0 (live API)
- ✓ Display a double line graph with monthly data points for both series — v1.0 (Chart.js in Astro)
- ✓ Site is in Estonian — v1.0
- ✓ Automated nightly rebuild via GitHub Actions (static site) — v1.0
- ✓ Deploy to GitHub Pages — v1.0 (switched from Vercel/Netlify to keep everything in one platform)
- ✓ Data source attribution with links to politsei.ee and pensionikeskus.ee — v1.0
- ✓ Methodology section explaining how data is collected — v1.0
- ✓ Open Graph meta tags with chart preview image for social sharing — v1.0
- ✓ Chart tooltips show exact EUR values on hover and touch — v1.0
- ✓ Plain-text summary statement in Estonian — v1.0
- ✓ Chart is responsive on mobile — v1.0
- ✓ CI keepalive prevents cron suspension after 60 days — v1.0

### Active

- [ ] Email or webhook alert when nightly scraper job fails (RELY-01)
- [ ] Scraper self-tests validate output shape before committing (RELY-02)
- [ ] Chart annotations mark notable months with spikes or zero-data gaps (ENRICH-01)
- [ ] CSV download of the underlying data (ENRICH-02)

### Out of Scope

| Feature | Reason |
|---------|--------|
| English translation | Focus on Estonian audience; adds content overhead |
| Real-time data | Nightly rebuild is sufficient for monthly data |
| User accounts or comments | Not relevant to an awareness/visualization site |
| Other comparison metrics | Pension pillar is the right frame; others dilute the message |
| Animated chart entrances | Adds complexity, no awareness value |
| Year-over-year summary view | Nice-to-have, not core |

## Context

Shipped v1.0 with ~740 LOC TypeScript/Astro over 2 days (2026-03-05 to 2026-03-06).
Tech stack: Astro 5, Chart.js 4, TypeScript ESM, Zod 4, GitHub Actions, GitHub Pages.
Police data: pre-scraped JSONL (Oct 2025–Mar 2026). Pension data: live API (12 months).
Site live at: https://maidok.github.io/ee-scammers/

## Constraints

- **Hosting**: GitHub Pages (static) — no server, scraping runs in CI
- **Language**: Estonian only
- **Data freshness**: Nightly rebuild acceptable; not real-time
- **Scope**: Single chart awareness site — not a dashboard

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GitHub Pages over Vercel/Netlify | Keeps everything in one platform (repo + CI + hosting) | ✓ Good |
| Nightly GitHub Actions for scraping | Static hosting requires build-time data; Actions are free | ✓ Good |
| Single double line graph as core visual | Shows trend and comparison together; user's explicit intent | ✓ Good |
| Estonian only | Site is for Estonian public; bilingual adds content overhead | ✓ Good |
| JSONL reader over Playwright scraper | Pre-scraped data provided; eliminates browser automation need | ✓ Good |
| Zod schema-first data contract | Catches bad scraper output before it reaches the site | ✓ Good |
| chart-data.json committed to repo | Astro build has seed data without live network access | ✓ Good |
| base: '/ee-scammers' in astro.config.mjs | Repo is a project page, not username.github.io | ✓ Good |
| JSON via application/json script tag (not define:vars) | define:vars breaks ESM imports in Astro script blocks | ✓ Good |
| liskin/gh-workflow-keepalive@v1 | gautamkrishnar/keepalive-workflow is ToS-suspended | ✓ Good |
| [skip ci] on nightly data commits | Prevents deploy triggering on data-only changes | ✓ Good |
| og:image with hardcoded /ee-scammers base path | Astro.site lacks trailing path segment for project pages | ✓ Good |

---
*Last updated: 2026-03-06 after v1.0 milestone*
