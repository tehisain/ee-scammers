# Phase 2: Automation - Research

**Researched:** 2026-03-06
**Domain:** GitHub Actions (cron scheduling, Pages deployment, keepalive)
**Confidence:** HIGH

## Summary

This phase wires two GitHub Actions workflow files: `scrape.yml` (nightly cron + conditional data commit) and `deploy.yml` (push-triggered Pages skeleton). Both workflows are well-understood, heavily documented problems with stable official actions. The only complication is the keepalive mechanism — the originally specified `gautamkrishnar/keepalive-workflow` action has been disabled by GitHub Staff due to a Terms of Service violation. A direct substitute (`liskin/gh-workflow-keepalive@v1`) exists and uses the same GitHub API approach without dummy commits.

The deployment workflow in Phase 2 is a skeleton only — no build step needed yet. It must be structured so Phase 3 can drop in `npm run build` + `actions/upload-pages-artifact` without restructuring the file.

**Primary recommendation:** Two workflow files, `scrape.yml` + `deploy.yml`. Use `liskin/gh-workflow-keepalive@v1` (not `gautamkrishnar/keepalive-workflow` which is ToS-suspended). Use `actions/upload-pages-artifact@v4` and `actions/deploy-pages@v4` — v3 was deprecated January 2025.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Pages deploy seam
- Deploy workflow skeleton only in Phase 2 — no placeholder page needed; the workflow exists but doesn't need to succeed until Phase 3 adds the Astro site
- Pages deploy method: GitHub Actions artifact (actions/deploy-pages) — no gh-pages branch
- Two separate workflow files: `scrape.yml` (nightly cron + data commit) and `deploy.yml` (triggers on push to main, builds and deploys site)

#### Scraper failure behavior
- Fail loudly: if the scraper errors, the workflow job fails and GitHub's native failure notifications fire
- Skip commit if no change: only commit chart-data.json when it actually changed (check git diff before committing)
- Commit author: github-actions[bot] using the workflow's built-in GITHUB_TOKEN — no custom identity needed

#### Keepalive mechanism
- Use `gautamkrishnar/keepalive-workflow` action (third-party, no commit needed, re-enables via GitHub API)
- Runs on a monthly schedule to prevent cron suspension after 60 days of repo inactivity

### Claude's Discretion
- Exact cron syntax and schedule timing (roadmap specifies 03:00 UTC — use that)
- Specific step names, job names, and workflow YAML structure
- Node.js version and runner OS selection

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-04 | CI keepalive action prevents GitHub Actions cron from being silently disabled after 60 days of no commits | `liskin/gh-workflow-keepalive@v1` uses GitHub API to re-enable; added as a job inside `scrape.yml` on schedule trigger |
| SITE-05 | Site deployed to GitHub Pages via GitHub Actions | `actions/upload-pages-artifact@v4` + `actions/deploy-pages@v4`; requires `pages: write` + `id-token: write` permissions and `github-pages` environment |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| actions/checkout | v4 | Clone repo in runner | Official GitHub action, required for all jobs that touch code |
| actions/setup-node | v4 | Install Node.js | Official action; v4 supports `lts/*` alias |
| actions/upload-pages-artifact | v4 | Package static dir as Pages artifact | Required by GitHub Pages Actions flow; v3 deprecated Jan 2025 |
| actions/deploy-pages | v4 | Deploy artifact to GitHub Pages | Official deploy action; v4 required (v3 deprecated) |
| liskin/gh-workflow-keepalive | v1 (latest: 1.2.1) | Re-enable scheduled workflows via API | Replaces disabled `gautamkrishnar/keepalive-workflow`; API-based, no dummy commits |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| GITHUB_TOKEN (built-in) | automatic | Auth for git push and Pages deploy | Always; no PAT needed for same-repo operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `liskin/gh-workflow-keepalive` | `gautamkrishnar/keepalive-workflow` | BLOCKED — GitHub disabled that repo for ToS violation; do not use |
| `liskin/gh-workflow-keepalive` | Manual monthly empty commit | Works but pollutes git history and requires manual action |
| `actions/deploy-pages@v4` | gh-pages branch | Locked decision: use Actions artifact method |

**Installation:** No npm packages needed for workflow files — all workflow actions are referenced directly in YAML.

## Architecture Patterns

### Recommended Project Structure
```
.github/
└── workflows/
    ├── scrape.yml       # nightly cron at 03:00 UTC; conditional commit; keepalive job
    └── deploy.yml       # push-to-main trigger; Pages skeleton (build step added Phase 3)
```

### Pattern 1: Nightly Scrape with Conditional Commit

**What:** Run `npm run scrape`, check `git diff` on the output file, commit and push only if changed.

**When to use:** Any workflow that writes a file and only wants to commit when content actually changed.

**Example:**
```yaml
# Source: GitHub Actions official docs + community pattern
- name: Run scrapers
  run: npm run scrape

- name: Commit updated data if changed
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add src/data/chart-data.json
    git diff --cached --quiet || git commit -m "chore: update chart data [skip ci]"
    git push
```

Note: `git diff --cached --quiet` exits 0 (no diff) or 1 (has diff). The `|| git commit` pattern skips commit when there is no diff. `[skip ci]` prevents triggering `deploy.yml` from the data commit, which would try to build a non-existent Astro site in Phase 2.

### Pattern 2: Pages Deploy with Skeleton Build Job

**What:** Workflow triggers on push to main, has a `build` job (currently a no-op placeholder) and a `deploy` job. Phase 3 fills in the build job.

**When to use:** Locking the deployment plumbing before the site exists so Phase 3 only adds build logic.

**Example:**
```yaml
# Source: GitHub Actions deploy-pages docs
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Phase 3 adds: npm run build + actions/upload-pages-artifact@v4
      # Skeleton: upload an empty/placeholder artifact so deploy job doesn't fail
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: .  # temporary; Phase 3 replaces with dist/

  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**CONTEXT.md note:** The workflow skeleton "doesn't need to succeed until Phase 3." The planner may choose to have the deploy job be conditional or simply not enable Pages in the repository settings until Phase 3.

### Pattern 3: Keepalive Job Inside scrape.yml

**What:** A second job in `scrape.yml` that re-enables the workflow via GitHub API if it is close to the 60-day auto-disable threshold.

**When to use:** Any repository where 60+ days may pass without a code commit (data-only repos, low-activity projects).

**Example:**
```yaml
# Source: liskin/gh-workflow-keepalive README
  keepalive:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    permissions:
      actions: write
    steps:
      - uses: liskin/gh-workflow-keepalive@v1
```

### Anti-Patterns to Avoid

- **Using `gautamkrishnar/keepalive-workflow`:** Repository disabled by GitHub Staff for ToS violation. Workflows referencing it will fail at action download time.
- **Using `actions/upload-pages-artifact@v3` or `actions/deploy-pages@v3`:** Deprecated since January 30, 2025 — workflows will fail.
- **Triggering deploy.yml from data commits:** The scraper commits `src/data/chart-data.json` nightly. If `deploy.yml` triggers on every push to main, this will fire nightly — harmless in Phase 3 but wasteful. Use `[skip ci]` on data commits or path filtering (`paths-ignore: ['src/data/**']`) to prevent unnecessary deploy runs.
- **Hardcoding Node.js version:** Use `node-version: 'lts/*'` so the workflow automatically tracks LTS without manual version bumps.
- **Missing `contents: write` permission for git push:** The scrape job must declare this permission or the push will be rejected with a 403.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keepalive mechanism | Custom shell script calling GitHub API with curl | `liskin/gh-workflow-keepalive@v1` | Handles rate limits, error cases, and API auth transparently |
| Pages artifact upload | Manual tar + curl to Pages API | `actions/upload-pages-artifact@v4` | Handles gzip format, size limits, retention, and artifact naming |
| Pages deployment | Direct API calls | `actions/deploy-pages@v4` | Handles OIDC token exchange, environment tracking, and URL output |
| Conditional git commit | Complex diff parsing | `git diff --cached --quiet \|\| git commit` | One-liner that correctly exits 0 on no-diff and 1 on diff |

**Key insight:** The Pages deployment pipeline (upload-artifact + deploy-pages) looks simple but involves OIDC token exchange and GitHub's internal deployment API — implementing it manually is fragile and unsupported.

## Common Pitfalls

### Pitfall 1: keepalive action repo disabled
**What goes wrong:** Workflow downloads `gautamkrishnar/keepalive-workflow` and fails because the GitHub repository is disabled.
**Why it happens:** GitHub Staff disabled the repository for ToS violation as of early 2025.
**How to avoid:** Use `liskin/gh-workflow-keepalive@v1` instead.
**Warning signs:** Action step error "Access to this repository has been disabled by GitHub Staff."

### Pitfall 2: deploy.yml fires on every data commit
**What goes wrong:** Scraper commits `src/data/chart-data.json` nightly; `deploy.yml` triggers and attempts to build a non-existent Astro site.
**Why it happens:** `on: push: branches: [main]` with no path filter catches all commits.
**How to avoid:** Either add `[skip ci]` to scraper commit messages OR add `paths-ignore: ['src/data/**']` to `deploy.yml` trigger.
**Warning signs:** Pages deploy jobs running nightly alongside scrape jobs.

### Pitfall 3: Missing `contents: write` permission for git push
**What goes wrong:** The `git push` step in `scrape.yml` returns HTTP 403.
**Why it happens:** `GITHUB_TOKEN` defaults to read-only on some repository configurations.
**How to avoid:** Add `permissions: contents: write` to the scrape job.
**Warning signs:** `remote: Permission to ... denied to github-actions[bot].`

### Pitfall 4: Cron schedule drift at peak times
**What goes wrong:** Scheduled runs at `:00` minutes (e.g., `0 3 * * *`) are queued behind many other workflows at the top of the hour and may run late or be dropped under GitHub load.
**Why it happens:** GitHub queues are busiest at round-hour marks.
**How to avoid:** Use a non-round minute, e.g., `15 3 * * *` (03:15 UTC) instead of `0 3 * * *`. The CONTEXT.md specifies 03:00 UTC; this is acceptable but worth documenting.
**Warning signs:** Runs starting 10-30 minutes later than scheduled.

### Pitfall 5: v3 artifact actions
**What goes wrong:** Using `actions/upload-pages-artifact@v3` or `actions/deploy-pages@v3` causes workflow failure.
**Why it happens:** Deprecated January 30, 2025.
**How to avoid:** Always use `@v4`.
**Warning signs:** "This action has been deprecated" warning or immediate failure.

### Pitfall 6: Repository Pages source not set to GitHub Actions
**What goes wrong:** `actions/deploy-pages` completes but the site is not served.
**Why it happens:** Repository Settings > Pages > Source must be set to "GitHub Actions" — it defaults to "Deploy from a branch."
**How to avoid:** Set Pages source in repository settings before or alongside creating `deploy.yml`. Document this as a manual setup step in PLAN.md.
**Warning signs:** Deploy action succeeds but site returns 404.

## Code Examples

### scrape.yml — Full structure
```yaml
# Source: GitHub Actions docs (cron, permissions, checkout)
name: Scrape data

on:
  schedule:
    - cron: '0 3 * * *'   # 03:00 UTC nightly
  workflow_dispatch:        # allow manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - run: npm ci

      - name: Run scrapers
        run: npm run scrape

      - name: Commit updated data if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add src/data/chart-data.json
          git diff --cached --quiet || git commit -m "chore: update chart data [skip ci]"
          git push

  keepalive:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    permissions:
      actions: write
    steps:
      - uses: liskin/gh-workflow-keepalive@v1
```

### deploy.yml — Phase 2 skeleton
```yaml
# Source: GitHub Actions deploy-pages docs
name: Deploy site

on:
  push:
    branches: [main]
    paths-ignore:
      - 'src/data/**'   # skip deploys triggered by data-only commits

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Phase 3 inserts: setup-node, npm ci, npm run build
      - uses: actions/upload-pages-artifact@v4
        with:
          path: .   # Phase 3 replaces with: dist/

  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Cron syntax reference
```
# 03:00 UTC every day
0 3 * * *

# Monthly keepalive (liskin handles this internally; no separate schedule needed)
```

### git diff conditional commit idiom
```bash
# Stage the file first, then check the index
git add src/data/chart-data.json
# Exit 0 = no staged changes (skip), exit 1 = has staged changes (commit)
git diff --cached --quiet || git commit -m "chore: update chart data [skip ci]"
git push
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `actions/upload-pages-artifact@v3` | `@v4` | Jan 30, 2025 | v3 deprecated; use v4 |
| `actions/deploy-pages@v3` | `@v4` | Jan 30, 2025 | v3 deprecated; use v4 |
| `gautamkrishnar/keepalive-workflow` | `liskin/gh-workflow-keepalive@v1` | Early 2025 | Source repo ToS-suspended |
| `actions/setup-node@v3` | `@v4` (latest: v6 also available) | 2024 | v4+ supports `lts/*` alias cleanly |

**Deprecated/outdated:**
- `gautamkrishnar/keepalive-workflow`: Disabled by GitHub Staff, ToS violation. Do not reference.
- `actions/upload-pages-artifact@v3` / `actions/deploy-pages@v3`: Deprecated January 2025.

## Open Questions

1. **Phase 2 deploy.yml — should it actually succeed?**
   - What we know: CONTEXT.md says "doesn't need to succeed until Phase 3." Uploading the entire repo root (`.`) as a Pages artifact is technically valid but serves no purpose.
   - What's unclear: Whether a failing deploy job in Phase 2 is acceptable, or whether the workflow should succeed with a dummy upload.
   - Recommendation: Planner should decide: either (a) deploy.yml is created but the Pages source is not enabled in repository settings until Phase 3, making failures irrelevant; or (b) upload the root dir as a temporary artifact so the workflow is green. Option (a) is simpler.

2. **`[skip ci]` vs `paths-ignore` — which to use for scraper commits**
   - What we know: Both prevent deploy.yml from triggering on data commits. `[skip ci]` skips all workflows; `paths-ignore` skips only deploy.yml.
   - What's unclear: Whether other future workflows should also be skipped on data commits.
   - Recommendation: Use `paths-ignore: ['src/data/**']` in deploy.yml — more surgical, doesn't suppress other potential future workflows.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework installed |
| Config file | None — Wave 0 must install |
| Quick run command | N/A until Wave 0 |
| Full suite command | N/A until Wave 0 |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-04 | `scrape.yml` contains keepalive job with `liskin/gh-workflow-keepalive@v1` | smoke (file existence + grep) | `grep -q "liskin/gh-workflow-keepalive" .github/workflows/scrape.yml` | Wave 0 creates `.github/workflows/scrape.yml` |
| PIPE-04 | keepalive job runs on schedule trigger only (`if: github.event_name == 'schedule'`) | smoke (grep) | `grep -q "event_name == 'schedule'" .github/workflows/scrape.yml` | Wave 0 |
| SITE-05 | `deploy.yml` exists with correct Pages permissions | smoke (file existence + grep) | `grep -q "pages: write" .github/workflows/deploy.yml` | Wave 0 creates `.github/workflows/deploy.yml` |
| SITE-05 | `deploy.yml` uses `actions/deploy-pages@v4` | smoke (grep) | `grep -q "actions/deploy-pages@v4" .github/workflows/deploy.yml` | Wave 0 |
| PIPE-04, SITE-05 | Cron set to 03:00 UTC | smoke (grep) | `grep -q "0 3 \* \* \*" .github/workflows/scrape.yml` | Wave 0 |

**Note:** These requirements are workflow file configuration checks, not runtime behavior. Full end-to-end validation (cron actually fires, Pages actually deploys) is manual and occurs in `/gsd:verify-work`. Automated checks are static file content assertions.

### Sampling Rate
- **Per task commit:** `grep -q "liskin/gh-workflow-keepalive" .github/workflows/scrape.yml && grep -q "actions/deploy-pages@v4" .github/workflows/deploy.yml && echo "OK"`
- **Per wave merge:** Run all smoke greps above sequentially
- **Phase gate:** All grep checks pass + manual: trigger workflow_dispatch on scrape.yml and verify it runs; verify GitHub Pages source set to "GitHub Actions" in repo settings

### Wave 0 Gaps
- [ ] `.github/workflows/scrape.yml` — covers PIPE-04
- [ ] `.github/workflows/deploy.yml` — covers SITE-05
- [ ] No test framework install needed — checks are shell greps, not test runner assertions

## Sources

### Primary (HIGH confidence)
- GitHub Actions official docs — cron schedule syntax, permissions, GITHUB_TOKEN scopes
  https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule
- GitHub Actions deploy-pages official action docs
  https://github.com/actions/deploy-pages
- GitHub Actions upload-pages-artifact official action docs
  https://github.com/actions/upload-pages-artifact
- GitHub Pages configuration with Actions source
  https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

### Secondary (MEDIUM confidence)
- `liskin/gh-workflow-keepalive` — GitHub repository, v1.2.1
  https://github.com/liskin/gh-workflow-keepalive
- Deprecation of v3 artifact actions (Jan 2025)
  https://github.blog/changelog/2024-12-05-deprecation-notice-github-pages-actions-to-require-artifacts-actions-v4-on-github-com/
- GitHub Marketplace: keepalive-workflow (shows v2.0.10 on Marketplace but source repo is disabled)
  https://github.com/marketplace/actions/keepalive-workflow

### Tertiary (LOW confidence)
- `gautamkrishnar/keepalive-workflow` status: disabled by GitHub Staff for ToS violation (verified via direct fetch returning "Access to this repository has been disabled by GitHub Staff")

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — actions verified from official GitHub repos and docs
- Architecture: HIGH — workflow patterns verified from official docs and working examples
- Pitfalls: HIGH (keepalive ToS issue) / MEDIUM (cron drift, permissions) — direct verification + established community knowledge
- Keepalive replacement: MEDIUM — `liskin/gh-workflow-keepalive` verified from GitHub repo; ToS issue with original confirmed by direct fetch

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (90 days — GitHub Actions action versions are stable; re-verify if any action version bumps to v5)
