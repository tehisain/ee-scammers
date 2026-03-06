# Requirements: Eesti petturite statistika

**Defined:** 2026-03-05
**Core Value:** Make the scale of scam losses feel real by showing them alongside monthly second pillar pension contributions on a single chart.

## v1 Requirements

### Data Pipeline

- [x] **PIPE-01**: Nightly GitHub Actions job scrapes politsei.ee news articles and extracts monthly scam loss totals (via Playwright + Cheerio)
- [x] **PIPE-02**: Nightly job fetches pensionikeskus.ee JSON API and aggregates monthly pension contribution totals across all funds
- [x] **PIPE-03**: Scraper writes combined monthly data to a committed JSON file in the repo
- [x] **PIPE-04**: CI keepalive action prevents GitHub Actions cron from being silently disabled after 60 days of no commits

### Visualization

- [ ] **VIZ-01**: Double line chart displays monthly data points for both scam losses and pension contributions on one chart
- [ ] **VIZ-02**: Chart tooltips show exact euro values on hover and touch (mobile)
- [ ] **VIZ-03**: Plain-text summary statement in Estonian shows the comparison (e.g. "Petturid varastasid [X]% pensionimaksetest sel kuul")
- [ ] **VIZ-04**: Chart is responsive and usable on mobile

### Site / Trust

- [ ] **SITE-01**: All UI text, labels, and explanations are in Estonian
- [ ] **SITE-02**: Data source attribution with links to politsei.ee and pensionikeskus.ee
- [ ] **SITE-03**: Methodology section explains in plain language how data is collected, parsed, and aggregated
- [ ] **SITE-04**: Open Graph meta tags with a static chart preview image for social sharing (Facebook, Telegram, Messenger)
- [x] **SITE-05**: Site deployed to GitHub Pages via GitHub Actions

## v2 Requirements

### Reliability

- **RELY-01**: Email or webhook alert when nightly scraper job fails
- **RELY-02**: Scraper self-tests validate output shape before committing data

### Enrichment

- **ENRICH-01**: Chart annotations mark notable months (e.g. spikes or zero-data gaps)
- **ENRICH-02**: CSV download of the underlying data
- **ENRICH-03**: Year-over-year summary view

## Out of Scope

| Feature | Reason |
|---------|--------|
| English translation | Focus on Estonian audience; adds content overhead |
| Real-time data | Nightly rebuild is sufficient for monthly data |
| Vercel/Netlify hosting | GitHub Pages keeps everything in one platform |
| User accounts or comments | Not relevant to an awareness/visualization site |
| Other comparison metrics | Pension pillar is the right frame; others dilute the message |
| Animated chart entrances | Adds complexity, no awareness value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 1 | Complete |
| PIPE-02 | Phase 1 | Complete |
| PIPE-03 | Phase 1 | Complete (01-01) |
| PIPE-04 | Phase 2 | Complete |
| SITE-05 | Phase 2 | Complete |
| VIZ-01 | Phase 3 | Pending |
| VIZ-02 | Phase 3 | Pending |
| VIZ-03 | Phase 3 | Pending |
| VIZ-04 | Phase 3 | Pending |
| SITE-01 | Phase 3 | Pending |
| SITE-02 | Phase 3 | Pending |
| SITE-03 | Phase 3 | Pending |
| SITE-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 after roadmap creation*
