# Eesti petturite statistika

## What This Is

A public awareness website (in Estonian) that visualizes how much money scammers steal from Estonians each month, compared to monthly second pillar pension contributions. Data is scraped automatically from the Estonian Police website and the Pension Centre, rebuilt nightly via a CI/CD job, and served as a static site.

## Core Value

Make the scale of scam losses feel real by showing them alongside something Estonians already understand — how much they collectively contribute to their pension each month.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Scrape monthly scam loss totals from Estonian Police (politsei.ee)
- [ ] Scrape monthly second pillar contribution totals from Pension Centre (pensionikeskus.ee)
- [ ] Display a double line graph with monthly data points for both series
- [ ] Site is in Estonian
- [ ] Automated nightly rebuild via GitHub Actions (static site)
- [ ] Deploy to Vercel or Netlify

### Out of Scope

- English translation — focus on Estonian audience first
- Other comparison metrics (salary, state budget items) — pension pillar is the right frame
- Real-time data — nightly rebuild is sufficient
- User accounts or interactivity beyond the chart

## Context

- Data source 1: https://www.politsei.ee/et/uudised/oeoepaeevainfo — police publish periodic news about scam incidents with monetary totals; format and regularity unknown until scraped
- Data source 2: https://www.pensionikeskus.ee/statistika/ii-sammas/ii-samba-sissemaksete-ulevaade/ — pension centre publishes monthly contribution statistics in tabular form
- Both sources are Estonian-language; scraping will need to handle Estonian content
- Static site means scraping must happen at build time (GitHub Action) and output a data file consumed by the frontend
- Monthly granularity — data points align by calendar month

## Constraints

- **Hosting**: Static site (Vercel/Netlify) — no server, scraping must run in CI
- **Language**: Estonian only
- **Data freshness**: Nightly rebuild acceptable; not real-time
- **Scope**: v1 is a single chart — not a full dashboard

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nightly GitHub Action for scraping | Static hosting requires build-time data fetch; Actions are free and simple | — Pending |
| Single double line graph as core visual | User explicitly wanted this format; shows trend and comparison together | — Pending |
| Estonian only | Site is for Estonian public; bilingual adds content overhead | — Pending |

---
*Last updated: 2026-03-05 after initialization*
