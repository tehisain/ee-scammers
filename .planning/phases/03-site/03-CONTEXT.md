# Phase 3: Site - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Astro-based Estonian awareness site: dual-line chart with tooltips, Estonian comparison sentence, attribution and methodology section, Open Graph meta with auto-generated preview image. Wire the deploy.yml build step. The scraper and GitHub Actions automation are already complete — this phase delivers the frontend only.

</domain>

<decisions>
## Implementation Decisions

### Chart library
- Use **Chart.js** — mature, ~60kb, built-in touch support, no React needed
- Shared y-axis (single EUR scale for both series) — the visual gap between scam losses and pension contributions IS the message; dual axes would hide it
- Tooltip shows **both series** in one tooltip: month name, scam EUR, pension EUR
- **Tap-to-show** tooltip on mobile: tap a data point, tooltip sticks until tap elsewhere (Chart.js `nearest` mode)

### OG preview image
- Auto-generate during build via **Playwright** (already a project dependency — no new install needed)
- Post-build approach: `astro build` first → serve `dist/` locally → screenshot → drop image into `dist/`
- Dimensions: **1200×630px** (Facebook/Telegram spec), Playwright viewport set to 1200×630, full-page screenshot of the chart

### Summary sentence
- Format: **"Petturid varastasid X% pensionimaksetest"** (short, punchy, percentage comparison)
- References the **most recent closed month** (last month with complete data, not the running current month)
- Full sentence includes the month name in Estonian: e.g. "Petturid varastasid 0.8% veebruari 2026 pensionimaksetest"
- Claude's discretion: exact Estonian grammar/declension adjustments

### Page structure
- Layout: **minimal above fold** — Estonian headline, chart, summary sentence; attribution + methodology visible below without collapse
- Headline: **"Kui palju petturid varastavad?"**
- Attribution section: links to politsei.ee and pensionikeskus.ee, always visible below the summary sentence
- Methodology section: plain-language Estonian explanation below attribution, no accordion
- Color scheme: **Claude's discretion** — clean and neutral (white/light grey background, distinct line colors for each series)

### Claude's Discretion
- Exact line colors for the two series
- Typography, spacing, font choices
- Exact Estonian wording of attribution text and methodology explanation
- Error/zero-data handling in the chart (e.g. months with no police data)
- Astro component structure (single page component vs split)

</decisions>

<specifics>
## Specific Ideas

- The shared y-axis visual gap is intentional — pension line dominates because the disparity IS the message
- Playwright is already installed (`"playwright": "^1.58.2"` in package.json) — OG screenshot generation reuses it without adding a dependency
- deploy.yml already has placeholder comments for Phase 3: `npm ci`, `npm run build`, artifact upload pointing to `dist/` — the plan just fills those in

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/data/chart-data.json`: Output from scrapers — monthly data with `month` (YYYY-MM), `scamEur` (number|null), `pensionEur` (number|null). Astro imports this at build time.
- `scripts/scrape.ts`: Already writes the data file; no changes needed in Phase 3.
- Playwright (`playwright@^1.58.2`): Already installed — use for OG screenshot generation without new dependencies.

### Established Patterns
- ESM project (`"type": "module"`) — Astro and Chart.js both support this natively.
- `tsx` in devDependencies — any build scripts can use TypeScript.
- `deploy.yml` build job has Phase 3 insert comments: setup-node, `npm ci`, `npm run build`, artifact path changing from `.` to `dist/`.

### Integration Points
- `deploy.yml` expects `npm run build` script and `dist/` output — Astro's default build output is `dist/`, and the default build command is `astro build`.
- `src/data/chart-data.json` is consumed by Astro at build time via a static import or `fs.readFileSync`.
- OG image must be placed at a stable path (e.g. `dist/og-preview.png`) and referenced in `<meta property="og:image">` in the Astro head.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-site*
*Context gathered: 2026-03-06*
