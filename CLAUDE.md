# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A static Estonian-language website comparing monthly scam losses to second pillar pension contributions. Built with Astro, visualized with Chart.js, deployed to GitHub Pages. Data refreshed nightly via GitHub Actions.

## Commands

- `npm run dev` — local dev server
- `npm run build` — Astro build + OG image screenshot (requires Playwright Chromium)
- `npm run preview` — preview production build
- `npm run scrape` — fetch pension API + read police JSONL, merge, validate, write `src/data/chart-data.json`
- `npx vitest` — run all tests
- `npx vitest src/utils/summary.test.ts` — run a single test file

## Architecture

**Data pipeline:** `scam_amounts.jsonl` + pensionikeskus.ee API → `scripts/scrape.ts` (orchestrator) → Zod validation (`scripts/schema.ts`) → `src/data/chart-data.json` (committed to repo).

**Build pipeline:** Astro imports `chart-data.json` at build time (no runtime API calls) → renders `src/pages/index.astro` → `scripts/og-screenshot.ts` uses Playwright to screenshot the rendered chart for OG image.

**CI:** Two workflows in `.github/workflows/`:
- `scrape.yml` — nightly at 03:00 UTC, commits updated `chart-data.json` to main
- `deploy.yml` — triggers on push to main (except data-only changes), builds and deploys to GitHub Pages

## Key Details

- Site base path is `/ee-scammers` (configured in `astro.config.mjs`, also hardcoded in `og-screenshot.ts`)
- All UI text is in Estonian — month names use genitive case (`src/utils/summary.ts`)
- Chart.js sets `data-chart-ready="true"` on canvas after animation — OG screenshot waits for this sentinel
- Zod schema requires minimum 6 months of data; scraper exits with code 1 on validation failure
- `page.test.ts` smoke tests require a build first (reads from `dist/`)
- Police scam data comes from a pre-scraped JSONL file; pension data is fetched live from API
