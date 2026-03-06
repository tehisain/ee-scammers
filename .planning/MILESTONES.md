# Milestones

## v1.0 MVP (Shipped: 2026-03-06)

**Phases completed:** 3 phases, 11 plans
**Files modified:** 64 | **Lines of code:** ~740 TypeScript/Astro
**Timeline:** 2026-03-05 → 2026-03-06 (2 days)

**Delivered:** Estonian public awareness site auto-publishing a dual-line chart comparing monthly scam losses vs pension contributions, running on GitHub Pages with nightly CI scraping.

**Key accomplishments:**
- ESM TypeScript project bootstrapped with Zod schema data contract for all scraper outputs
- Live pension API scraper fetching 12 months from pensionikeskus.ee via two-step period lookup
- Police scam data pipeline reading pre-scraped JSONL (6 months Oct 2025–Mar 2026)
- Nightly GitHub Actions cron with conditional commit, liskin keepalive, and [skip ci] data commits
- GitHub Pages deploy workflow with OIDC auth and data-commit path filter
- Astro 5 site with Chart.js dual-line chart, Estonian copy, and OG social preview image at 1200x630

---

