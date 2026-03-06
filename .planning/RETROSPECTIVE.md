# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-06
**Phases:** 3 | **Plans:** 11

### What Was Built

- ESM TypeScript project with Zod schema data contract for scraper output validation
- Pension API scraper: two-step period lookup, live pensionikeskus.ee data, 12 months
- Police JSONL reader: streaming aggregator over pre-scraped incident records, 6 months
- Scrape orchestrator: merges both datasets, Zod gate at write boundary, committed seed JSON
- GitHub Actions nightly cron with conditional commit, liskin keepalive, [skip ci] guard
- GitHub Pages deploy via OIDC with paths-ignore filtering data-only commits
- Astro 5 site: dual-line Chart.js chart, Estonian copy, responsive layout, summary sentence
- OG screenshot: post-build Playwright capture (1200x630) via canvas sentinel

### What Worked

- Schema-first approach caught the nullable scamEur distinction early — downstream code never had to guess
- Plan-level research phases (01-03 discovery pass) surfaced the JSONL substitution before any Playwright code was written
- Phase 2 skeleton with insertion comments made Phase 3 deploy.yml wiring trivial (3-line change)
- `data-chart-ready` sentinel on Chart.js `animation.onComplete` made OG screenshot deterministic

### What Was Inefficient

- og:image URL required a follow-up fix plan (03-03) because Astro.site lacks the trailing project page path — could have been caught in Phase 3 planning
- `set:text` vs `set:html` bug in index.astro caused a Plan 02 deviation; worth adding to future Astro checklist
- Police scraper was originally planned as Playwright + regex; pivot to JSONL was correct but the original plan was spec'd without confirming data availability

### Patterns Established

- JSON data injection in Astro: use `<script type="application/json">` + `set:html`, never `define:vars` with ESM modules
- OG screenshot: minimal static Node server + `waitForSelector` on sentinel attribute + `page.screenshot` clip
- GitHub Pages project page: hardcode `/repo-name/` prefix in og:image URL constructor; `Astro.site` alone is insufficient
- Keepalive: use `liskin/gh-workflow-keepalive@v1`; avoid `gautamkrishnar/keepalive-workflow` (ToS-suspended)

### Key Lessons

1. Confirm data source format before writing a scraper — the JSONL substitution saved significant Playwright complexity
2. For GitHub Pages project pages, test og:image URL end-to-end in planning; the base path trap is easy to miss
3. Astro's `set:text` HTML-escapes content — any JSON blob embedded in HTML must use `set:html`
4. Two-step API patterns (period list → per-period fetch) work well for time-series APIs that use opaque period IDs

### Cost Observations

- Model mix: balanced profile (Sonnet 4.6) throughout
- Sessions: ~1 day of active work across multiple sessions
- Notable: All 11 plans completed same day as project init — efficient due to clear requirements and schema-first design

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | LOC |
|-----------|--------|-------|------|-----|
| v1.0 MVP | 3 | 11 | 2 | ~740 |
