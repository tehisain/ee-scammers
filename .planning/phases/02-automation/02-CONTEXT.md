# Phase 2: Automation - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the nightly GitHub Actions cron that runs both scrapers, commits updated chart-data.json if changed, and triggers a GitHub Pages rebuild. Add a keepalive mechanism to prevent cron suspension. The Astro site itself is Phase 3 — this phase only sets up the automation infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Pages deploy seam
- Deploy workflow skeleton only in Phase 2 — no placeholder page needed; the workflow exists but doesn't need to succeed until Phase 3 adds the Astro site
- Pages deploy method: GitHub Actions artifact (actions/deploy-pages) — no gh-pages branch
- Two separate workflow files: `scrape.yml` (nightly cron + data commit) and `deploy.yml` (triggers on push to main, builds and deploys site)

### Scraper failure behavior
- Fail loudly: if the scraper errors, the workflow job fails and GitHub's native failure notifications fire
- Skip commit if no change: only commit chart-data.json when it actually changed (check git diff before committing)
- Commit author: github-actions[bot] using the workflow's built-in GITHUB_TOKEN — no custom identity needed

### Keepalive mechanism
- Use `gautamkrishnar/keepalive-workflow` action (third-party, no commit needed, re-enables via GitHub API)
- Runs on a monthly schedule to prevent cron suspension after 60 days of repo inactivity

### Claude's Discretion
- Exact cron syntax and schedule timing (roadmap specifies 03:00 UTC — use that)
- Specific step names, job names, and workflow YAML structure
- Node.js version and runner OS selection

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard GitHub Actions patterns apply.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/scrape.ts`: Entrypoint — runs both scrapers sequentially, validates via Zod, writes `src/data/chart-data.json`. Called via `npm run scrape`.
- `src/data/chart-data.json`: The output file the scraper commits. Already in repo as seed data.

### Established Patterns
- `package.json` `"scrape"` script: `tsx scripts/scrape.ts` — the workflow simply runs `npm run scrape`
- Scraper exits with `process.exit(1)` on validation failure — workflow will naturally fail loud without extra handling
- ESM project (`"type": "module"`) — workflow Node.js setup must support this (tsx handles it)

### Integration Points
- Scraper writes to `src/data/chart-data.json` — the commit step targets this file
- No `.github/workflows/` directory exists yet — starting from scratch
- Phase 3 will add the Astro build; `deploy.yml` must be structured so adding `npm run build` + artifact upload in Phase 3 completes it

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-automation*
*Context gathered: 2026-03-06*
