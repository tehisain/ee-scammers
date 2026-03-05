# Architecture Research

**Domain:** Static data visualization site with nightly scraping pipeline
**Researched:** 2026-03-05
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (CI Layer)                      │
│                                                                   │
│  ┌────────────────┐   scrape    ┌──────────────────────────────┐ │
│  │  Cron trigger  │ ──────────> │  scraper/                    │ │
│  │  (nightly UTC) │            │    police_scraper.py          │ │
│  └────────────────┘            │    pension_scraper.py         │ │
│                                │    transform.py               │ │
│                                └─────────────┬────────────────┘ │
│                                              │ write JSON        │
│                                              ▼                   │
│                                ┌────────────────────────────┐    │
│                                │  public/data/chart-data.json│    │
│                                └─────────────┬──────────────┘    │
│                                              │ git commit + push  │
│                                              ▼                   │
│                                ┌────────────────────────────┐    │
│                                │  GitHub repo (main branch) │    │
│                                └─────────────┬──────────────┘    │
│                                              │ push triggers      │
│                                              ▼                   │
│                                ┌────────────────────────────┐    │
│                                │  Vercel deploy (auto)      │    │
│                                └────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    Static Site (Build Layer)                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Astro build                                              │    │
│  │    import chartData from '../public/data/chart-data.json'│    │
│  │    ↓                                                      │    │
│  │  ChartPage.astro   (passes data as props)                 │    │
│  │    ↓                                                      │    │
│  │  LineChart.tsx     (Chart.js island, client:load)         │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    Browser (Runtime Layer)                        │
│                                                                   │
│  Receives pre-built HTML + inlined chart data.                   │
│  Chart.js hydrates the canvas element.                           │
│  No network request for data — data is baked into the bundle.    │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `scraper/police_scraper.py` | Fetch and parse scam loss totals from politsei.ee | Python + requests/BeautifulSoup or Playwright (if JS-rendered) |
| `scraper/pension_scraper.py` | Fetch and parse monthly contribution totals from pensionikeskus.ee | Python + requests/BeautifulSoup (table element) |
| `scraper/transform.py` | Merge and normalise both datasets into a single time-aligned JSON structure | Python dict manipulation + json.dump |
| `public/data/chart-data.json` | Committed data artifact; single source of truth consumed at build time | JSON file in repo, versioned by git |
| `.github/workflows/nightly.yml` | Orchestrate scrape → transform → commit → push on cron schedule | GitHub Actions workflow |
| `src/pages/index.astro` | Static site shell; imports JSON at build time and passes to chart component | Astro page component |
| `src/components/LineChart.tsx` | Interactive dual-line chart rendered in the browser | React island + Chart.js |

## Recommended Project Structure

```
ee-scammers/
├── scraper/
│   ├── police_scraper.py       # Scrapes politsei.ee for scam loss data
│   ├── pension_scraper.py      # Scrapes pensionikeskus.ee contribution table
│   ├── transform.py            # Merges, aligns months, outputs JSON
│   └── requirements.txt        # Python deps (requests, beautifulsoup4, playwright)
├── public/
│   └── data/
│       └── chart-data.json     # Committed scraped data; Astro serves as-is
├── src/
│   ├── pages/
│   │   └── index.astro         # Single page; imports data, renders chart shell
│   ├── components/
│   │   └── LineChart.tsx       # React island with Chart.js dual line chart
│   └── layouts/
│       └── Base.astro          # HTML shell, <head>, Estonian lang attribute
├── .github/
│   └── workflows/
│       └── nightly.yml         # Cron job: scrape → commit → push (triggers Vercel)
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

### Structure Rationale

- **scraper/**: Isolated from the frontend. Can be run locally or in CI without touching Astro. Python is standard for scraping; keeping it separate makes the boundary explicit.
- **public/data/**: Astro copies `public/` verbatim to the output. `chart-data.json` here is both served as a static asset (for future use) and importable at build time via `import`.
- **src/components/LineChart.tsx**: As a React island with `client:load`, it ships JavaScript only for the chart, not the whole page. Astro renders everything else as plain HTML.

## Architectural Patterns

### Pattern 1: Commit-Driven Data Pipeline (git scraping)

**What:** The scraper writes its output to a JSON file in the repo and commits it. The push to the main branch triggers Vercel's automatic deploy, which rebuilds the static site with the new data baked in. No separate deploy hook or API call needed.

**When to use:** When data changes infrequently (nightly), the dataset is small (< 1 MB), and you want a full audit trail of every data update via git history.

**Trade-offs:** Data history is transparent and rollback is trivial. Con: repo size grows slowly with each commit (negligible for this project). Large binary blobs would be a problem; JSON text is not.

**Example:**
```yaml
# .github/workflows/nightly.yml (simplified)
on:
  schedule:
    - cron: '0 3 * * *'   # 03:00 UTC daily
jobs:
  scrape-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r scraper/requirements.txt
      - run: python scraper/transform.py   # writes public/data/chart-data.json
      - name: Commit data if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/data/chart-data.json
          git diff --cached --quiet || git commit -m "chore: nightly data update $(date -u +%Y-%m-%d)"
          git push
```

Vercel's git integration detects the push and automatically triggers a redeploy — no explicit deploy hook call required.

### Pattern 2: Build-Time Data Consumption (no runtime fetching)

**What:** The Astro page imports the JSON file directly using an ES import at the top of the component script. The data is inlined into the build output — no `fetch()` in the browser, no loading state.

**When to use:** Dataset is small, doesn't change between deploys, and users should see a chart immediately (no spinner).

**Trade-offs:** Zero runtime latency for data. The tradeoff is that data is only as fresh as the last build — acceptable for nightly updates.

**Example:**
```typescript
// src/pages/index.astro
---
import chartData from '../public/data/chart-data.json'
import LineChart from '../components/LineChart'
---
<LineChart data={chartData} client:load />
```

The `client:load` directive tells Astro to ship the React component's JS and hydrate immediately, while the data itself is static (no browser fetch).

### Pattern 3: Single Canonical Data Shape

**What:** `transform.py` is responsible for producing one opinionated JSON schema. Neither the scraper files nor the frontend define the data shape — `transform.py` owns it.

**When to use:** Always, when there are multiple source scrapers feeding one consumer.

**Trade-offs:** One file to change if the schema evolves. Scrapers return raw dicts; transform normalises.

**Example:**
```json
{
  "generated": "2026-03-05T03:12:00Z",
  "series": {
    "scam_losses": [
      { "month": "2024-01", "amount_eur": 1200000 }
    ],
    "pension_contributions": [
      { "month": "2024-01", "amount_eur": 45000000 }
    ]
  }
}
```

## Data Flow

### Nightly Pipeline Flow

```
GitHub Actions cron trigger (03:00 UTC)
    |
    +--> police_scraper.py -----> raw scam data (dict)
    |                                       |
    +--> pension_scraper.py --> raw pension data (dict)
                                            |
                                    transform.py
                                            |
                                    public/data/chart-data.json
                                            |
                                    git add + commit + push
                                            |
                                    Vercel detects push
                                            |
                                    Vercel build: npm run build
                                            |
                                    Astro imports chart-data.json
                                            |
                                    LineChart.tsx receives data as props
                                            |
                                    Static HTML + bundled JS deployed to CDN
```

### Browser Load Flow

```
User visits site
    |
    CDN serves pre-built HTML (chart data already embedded)
    |
    Chart.js island hydrates
    |
    Double line chart renders (no fetch, no loading state)
```

### Key Data Flows

1. **Scrape to file:** Each scraper returns a normalised dict. `transform.py` merges both dicts by calendar month, fills gaps with `null`, and writes the result to `public/data/chart-data.json`.
2. **File to build:** Astro's `import` resolves the JSON at `npm run build` time. The data is embedded in the page; no runtime endpoint exists.
3. **Build to browser:** Vercel serves the static output. Chart.js receives data as a component prop, not via `fetch()`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (public awareness site, ~hundreds of monthly visitors) | Monorepo, committed JSON, Vercel free tier — no changes needed |
| 10k–100k monthly visitors | No architecture change; static CDN handles this trivially |
| Data grows to many years of history | JSON stays small (monthly granularity, two series = ~50 rows/year). No concern for this project's lifetime. |
| Scraping becomes unreliable | Add retry logic in scrapers; add data validation step in `transform.py` that aborts commit if sanity checks fail |

### Scaling Priorities

1. **First bottleneck:** Scraper reliability — politsei.ee format changes will break the pipeline. Detection: add a GitHub Actions check that alerts if the JSON wasn't updated for 48+ hours.
2. **Second bottleneck:** Data quality — pension centre may change table structure. Mitigation: validate expected column names before writing JSON.

## Anti-Patterns

### Anti-Pattern 1: Fetching data at runtime from the browser

**What people do:** Use `fetch('/api/data')` inside a React component's `useEffect` to load chart data after the page renders.

**Why it's wrong:** Requires a server or serverless function, breaks the static site model, adds a loading state, and increases latency. Completely unnecessary when data changes nightly.

**Do this instead:** Import JSON at build time in the Astro page component and pass as a prop to the chart island.

### Anti-Pattern 2: Separate deploy hook pattern (trigger-only)

**What people do:** The GitHub Action skips committing data and instead only calls `curl -X POST $VERCEL_HOOK` to trigger a rebuild, with the scraper running inside the Vercel build.

**Why it's wrong:** For this project, the data sources require scraping logic that may need retries, validation, and error handling — all of which are easier to control in the GitHub Actions environment. Running scrapers inside the Vercel build also violates Vercel's build time limits and makes debugging harder. Additionally, this approach loses git history of the data.

**Do this instead:** Scrape in the GitHub Action, commit the JSON, let the Vercel push integration handle the deploy automatically.

### Anti-Pattern 3: One monolithic scraper script

**What people do:** Write a single `scrape.py` that fetches both sources, transforms, and writes output — all in one file.

**Why it's wrong:** When one source changes its format (and it will), you debug one large file mixing unrelated concerns. Testing is also harder.

**Do this instead:** One file per source (`police_scraper.py`, `pension_scraper.py`), each returning a clean dict. `transform.py` is the only file that knows the output schema.

### Anti-Pattern 4: Storing raw HTML instead of parsed JSON

**What people do:** Commit the full scraped HTML to the repo and parse it at build time.

**Why it's wrong:** Build failures become hard to debug when the parsing error is in Astro's build step. HTML blobs also bloat the repo.

**Do this instead:** Parse in Python (where debugging is easier), commit only the final JSON.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| politsei.ee | HTTP GET + HTML parse (BeautifulSoup) | Format unknown until first scrape; may need Playwright if JS-rendered |
| pensionikeskus.ee | HTTP GET + HTML table parse | Appears to be a static table; BeautifulSoup likely sufficient |
| Vercel | Git push integration (automatic) | Push to main = deploy; no explicit webhook call needed |
| GitHub Actions | Cron schedule (`schedule:` event) | Runs at UTC; schedule is approximate (may be minutes late under load) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `police_scraper.py` → `transform.py` | Python function return value (dict) | No file I/O between them; transform imports scraper functions |
| `pension_scraper.py` → `transform.py` | Python function return value (dict) | Same pattern |
| `transform.py` → Astro | `public/data/chart-data.json` (committed file) | The only cross-language boundary: Python writes, Astro reads |
| `index.astro` → `LineChart.tsx` | Props (typed via TypeScript interface) | Data shape defined by transform.py's JSON schema |

## Suggested Build Order

Build in this order to validate each boundary before depending on it:

1. **Pension scraper first** — pensionikeskus.ee appears to have a structured table, making it the lower-risk scraper. Validates that scraping infra works at all.
2. **Police scraper second** — format is unknown; may require iteration. Keeping it separate means failures don't block the pension data.
3. **Transform layer** — once both scrapers return clean dicts, define the JSON schema and write `transform.py`. Commit a sample `chart-data.json` by hand if scrapers aren't ready yet — this unblocks frontend work.
4. **Static site shell** — Astro setup, Estonian language, base layout. Can use hardcoded/sample data.
5. **Chart component** — `LineChart.tsx` with Chart.js. Wire up to the sample JSON. Get the visual right before connecting real data.
6. **GitHub Actions workflow** — once scraper + site both work locally, wire the CI job. Test with `workflow_dispatch` before enabling the cron.
7. **Vercel deploy** — connect repo to Vercel, verify push-triggered deploys work end to end.

## Sources

- Simon Willison, "Git scraping" pattern: https://simonwillison.net/2020/Oct/9/git-scraping/
- "Scheduling Netlify deploys with GitHub Actions": https://www.voorhoede.nl/en/blog/scheduling-netlify-deploys-with-github-actions/
- "Scheduling Netlify and Vercel builds with GitHub Actions": https://www.codemzy.com/blog/scheduling-builds-github-actions
- "Building a Static Website from JSON Data with Astro": https://dev.solita.fi/2024/12/02/building-static-websites-with-astro.html
- "Adding Interactive Charts to Astro": https://dteather.com/blogs/astro-interactive-charts/
- GitHub Actions scheduled events (cron): https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule

---
*Architecture research for: static data visualization site with nightly scraping pipeline*
*Researched: 2026-03-05*
