# Pitfalls Research

**Domain:** Static site with government web scraping + GitHub Actions CI + data visualization
**Researched:** 2026-03-05
**Confidence:** HIGH (critical paths verified by direct site inspection; CI pitfalls confirmed by GitHub community discussions)

---

## Critical Pitfalls

### Pitfall 1: pensionikeskus.ee Returns No Data in Static HTML — JavaScript Required

**What goes wrong:**
The Pension Centre statistics page (`/statistika/ii-sammas/ii-samba-sissemaksete-ulevaade/`) renders entirely via client-side JavaScript using AJAX. Raw HTML contains only a placeholder: "Laen andmeid. Palun oodake" (Loading data. Please wait). A scraper using requests + BeautifulSoup against the page URL will find zero data.

**Why it happens:**
The site uses Handlebars templating fed by an AJAX call to `/ws/et/stats/receipt-statistics`. Developers assume they need to scrape the page — but the data is in a JSON API that can be called directly.

**How to avoid:**
Call the JSON API endpoint directly: `GET https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics`. The response returns a `data.periods` array with 272 monthly entries (2003-01 through 2026-02), each containing `start_date`, `end_date`, and `id`. The `data.stats` array contains per-fund `amount` fields in EUR. No JavaScript engine or headless browser needed — a plain HTTP GET with appropriate headers suffices. Accept the period `id` from `data.periods` and pass it back as a parameter to fetch specific months if needed.

**Warning signs:**
- Scraper returns empty strings or "Laen andmeid" text
- BeautifulSoup finds no `<table>` elements
- Response HTML is ~5KB but page looks data-rich in browser

**Phase to address:**
Scraper implementation phase — verify API endpoint before building any HTML parsing.

---

### Pitfall 2: politsei.ee Publishes Prose News Articles, Not Structured Data

**What goes wrong:**
The police "Ööpäevainfo" page (`/et/uudised/oeoepaeevainfo`) is a chronological news feed of police daily reports. Monetary scam totals are embedded in Estonian-language prose, not in structured fields. Extracting a specific "total scam losses for month X" requires natural language parsing of article body text, not table scraping.

**Why it happens:**
The site is a public communications tool, not a data portal. The format and regularity of monetary mentions are unknown until articles are individually inspected. Regex-based extraction of Estonian currency patterns (e.g., "X eurot", "X miljonit eurot") will be fragile against phrasing variation.

**How to avoid:**
Before writing the scraper: manually read 6-12 months of articles to catalog the actual phrasing patterns used for scam totals. Document the patterns. Build the regex/parser against observed patterns, not assumed ones. Plan for the possibility that some months have no explicit total — the data may be partial and require aggregation across multiple articles within a month.

**Warning signs:**
- Assuming one article per month with a clear total
- Scraper returning zero matches despite articles existing
- Monetary amounts appearing in nested news articles linked from the listing, not in the listing itself

**Phase to address:**
Research/discovery phase — before writing any scraper code, read 2-3 months of actual articles to understand the data format.

---

### Pitfall 3: GitHub Actions Cron Disabled After 60 Days of Repository Inactivity

**What goes wrong:**
GitHub automatically disables scheduled workflows (cron triggers) when the repository has had no commits for 60 days. For a mature project that "just works," this silently kills the nightly rebuild. The site continues serving stale data with no error visible to users or the maintainer.

**Why it happens:**
GitHub's inactivity detection only counts commits as activity. The nightly Action running successfully every night does not count. If no code changes are pushed for 60 days, GitHub suspends the schedule.

**How to avoid:**
Add a keepalive mechanism to the workflow. Options in order of preference:
1. Use the `gautamkrishnar/keepalive-workflow` GitHub Action — it calls the GitHub API every 45 days to keep the schedule alive without creating dummy commits.
2. Alternatively, add `workflow_dispatch` to the trigger list — this allows manual re-enablement but does not auto-prevent suspension.
Include a data timestamp in the output JSON; add a monitor (e.g., Healthchecks.io free tier) that alerts if no ping is received within 25 hours.

**Warning signs:**
- "This scheduled workflow is disabled because there hasn't been activity in this repository for at least 60 days" message in Actions tab
- Site data stops updating silently
- Last build date on site is weeks old

**Phase to address:**
GitHub Actions setup phase — add keepalive workflow and external monitoring from day one.

---

### Pitfall 4: GitHub Actions Cron Timing Is Non-Deterministic

**What goes wrong:**
Cron schedules on GitHub Actions are advisory, not guaranteed. A `0 2 * * *` schedule may run at 2:29 AM or 3:15 AM under load. In early 2025, reported delays of 29+ minutes were common. The nightly build may not run at all on some nights during high GitHub infrastructure load.

**Why it happens:**
GitHub's scheduler is shared infrastructure. Under load, jobs are queued and delayed. GitHub documents this limitation but it is easy to overlook when designing an "every night at midnight" pipeline.

**How to avoid:**
Set cron time to off-peak hours (e.g., 03:00 UTC) to reduce competition. Do not design any logic that depends on exact timing. Build the scraper to be idempotent — running it twice on the same day should produce the same output. Accept that data freshness is "nightly, approximately."

**Warning signs:**
- Builds clustering around wrong times in the Actions history
- Occasional missing nightly runs in the build log

**Phase to address:**
GitHub Actions setup phase — set expectations in the workflow design; do not over-engineer timing.

---

### Pitfall 5: Scraper Breaks Silently on HTML Structure Changes

**What goes wrong:**
Government sites are redesigned without notice. politsei.ee has already undergone at least one full redesign (documented in 2016). When the HTML structure changes, CSS selectors and element paths become invalid. The scraper returns empty data or throws an exception, and the build either fails silently or publishes a site with zero data points.

**Why it happens:**
Scrapers rely on selectors that are implementation details of a third-party site. Government sites have no obligation to maintain backward compatibility.

**How to avoid:**
- Validate scraper output before using it: if extracted data count is zero or below historical minimum, treat it as a scraper failure, not a data absence.
- Commit scraped raw data (or a snapshot of key response fields) to the repository. Diffing the latest against the previous run reveals structural changes early.
- Use structural assertions in the scraper: `assert len(results) >= expected_minimum` before writing the output file.
- For the pension API endpoint: validate that the JSON response contains `data.periods` and `data.stats` with non-empty arrays.

**Warning signs:**
- Chart shows zero data points for recent months but historical months are intact
- Build succeeds but output JSON has fewer entries than the previous run
- HTTP 200 response but response body is a Cloudflare challenge page or maintenance notice

**Phase to address:**
Scraper implementation phase — build assertions in from the start, not as an afterthought.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Scraping the HTML page instead of the JSON API (pensionikeskus.ee) | Feels like normal web scraping | Requires a headless browser, adds 30-60s to build time, breaks on JS changes | Never — the API is publicly accessible |
| Hardcoding CSS selectors as strings with no comments | Faster to write | Impossible to maintain when selectors break | Never — always document what element you're targeting |
| Committing raw scraped HTML snapshots to git | Easy rollback | Repo grows 1-5MB per night, 500MB/year | Never for large HTML; commit only structured JSON data |
| Skipping scraper output validation | Simpler pipeline | Silent data holes in the chart | Never — always validate non-empty output |
| Not including a "last updated" timestamp on the site | Less UI work | Users cannot tell if data is current; erodes trust | Never — include it, it takes 10 minutes |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| pensionikeskus.ee API | Calling without a `period` parameter and assuming the response filters to the right month | Inspect the `data.periods` array to map calendar months to period IDs; the default response returns the latest period — iterate periods explicitly |
| pensionikeskus.ee API | Not summing per-fund amounts — the `data.stats` array contains one entry per pension fund | Aggregate `amount` across all `stats` entries with `type == "F"` to get total monthly contribution |
| politsei.ee news feed | Stopping at the first page — the page uses "Show more results" (lazy load) with no static pagination | Either load all pages programmatically or use the year/month archive sidebar URLs for deterministic monthly fetches |
| GitHub Actions secrets | Assuming no secrets are needed | Neither site requires authentication; no secrets needed for this project — simpler than expected |
| Vercel/Netlify deployment | Deploying on push only, not on schedule | The GitHub Action must commit the updated data JSON to the repo (or trigger a deploy hook) to update the live site; configure a deploy hook URL in the Action |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all 272 months of pension history on every nightly run | Build takes 3-5 minutes, rate limit risk | Fetch only the latest 1-2 months; store historical data in the committed JSON | Immediately if not addressed |
| Loading Chart.js + all data inline on page load | Fine at 12 months of data; slow at 3 years | Keep data payload small — monthly aggregates only, no per-fund breakdown | Around 200+ data points |
| Re-rendering Chart.js on every window resize event | Works on desktop, janky on mobile | Debounce the resize handler; Chart.js `responsive: true` handles most cases natively | First mobile user |
| Git history growing from nightly data commits | Repo clones slowly after 1-2 years | Store data in a branch or use a separate `data` directory with shallow history; or use Vercel/Netlify environment to build without committing data to main | After ~365 nightly commits |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing Vercel/Netlify deploy hook URLs to the repository | Anyone can trigger a rebuild | Store deploy hooks as GitHub Actions secrets, reference as `${{ secrets.DEPLOY_HOOK_URL }}` |
| Scraping at high frequency to "ensure freshness" | IP ban from government site servers; potential legal exposure under Estonian law | Once nightly is the maximum; respect robots.txt; add delays between requests |
| Trusting scraped monetary amounts without range validation | A formatting change on source site injects wrong data into the chart | Validate that scraped amounts are within plausible range (e.g., > €0 and < €1B per month) before committing |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No "last updated" indicator on chart | Users cannot tell if they are seeing current data or data from 3 months ago | Display the data timestamp from the committed JSON; "Andmed uuendatud: [kuupäev]" |
| Chart has no fallback when one data series has gaps | Line breaks confusingly; users think data is missing by design | Use Chart.js `spanGaps: true` for the scam data series; document months with genuinely missing data with an annotation |
| Chart labels in English on an Estonian-only site | Inconsistent UX | All labels, tooltips, and axis text must be in Estonian — "Pensionimaksed", "Petturite kahju", month names in Estonian |
| Chart not readable on mobile | Most Estonian users browse on phones | Set Chart.js `responsive: true` and `maintainAspectRatio: false`; test on 375px viewport; ensure tooltip font size is legible |
| No explanation of what the chart shows | Data without context is not persuasive | Include a brief paragraph above or below the chart explaining the comparison and why it matters |

---

## "Looks Done But Isn't" Checklist

- [ ] **Scraper returns data:** Verify the output JSON has entries for the last 3 months, not just historical data
- [ ] **Pension data is totalled correctly:** Verify you are summing across all funds, not taking a single fund's amount
- [ ] **Police data months align with pension data months:** Both series must use the same calendar month keys
- [ ] **Chart renders on mobile:** Test at 375px width with real data — not just with placeholder data
- [ ] **Nightly Action runs on schedule:** Wait 48 hours after deploy and verify two consecutive successful runs in Actions history
- [ ] **Site shows last-updated date:** The timestamp must be populated from data, not hardcoded
- [ ] **Keepalive is configured:** The workflow will suspend after 60 days without it — verify the keepalive mechanism is in place
- [ ] **Deploy hook fires after data commit:** A new data JSON pushed to the repo must trigger a Vercel/Netlify rebuild — test this manually
- [ ] **Scraper handles missing months gracefully:** Test with a month where police data has no scam total — output should be `null`, not a crash

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Workflow suspended after 60 days of inactivity | LOW | Re-enable workflow in Actions tab; add keepalive step |
| Scraper broken by HTML structure change | MEDIUM | Inspect current page structure; update selectors; backfill any missed months manually |
| Repo bloated by large data commits | HIGH | Use `git filter-repo` to remove large files from history; force-push; all collaborators must re-clone |
| Pension API endpoint URL changed | MEDIUM | Re-inspect network traffic on pensionikeskus.ee; find new endpoint; update scraper |
| Wrong monetary totals published for months | MEDIUM | Fix aggregation logic; re-run scraper for affected months; commit corrected JSON; redeploy |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| pensionikeskus.ee is AJAX-only | Phase 1: Scraper research | Call API endpoint directly and confirm JSON response contains `data.stats` |
| politsei.ee is prose, not structured | Phase 1: Scraper research | Manually read 6 months of articles; document extraction patterns |
| Cron disabled after 60 days | Phase 2: GitHub Actions setup | Check Actions tab 61+ days after initial deploy |
| Cron timing non-deterministic | Phase 2: GitHub Actions setup | Review Actions run history for timing variation after first week |
| Silent failures on HTML changes | Phase 2: Scraper implementation | Scraper must assert non-empty output; verify assertion fires on synthetic bad input |
| Git repo bloat from data commits | Phase 2: GitHub Actions setup | Review committed data file size; confirm it is aggregated JSON, not raw HTML |
| Chart breaks on mobile | Phase 3: Frontend | Test on 375px viewport before marking phase complete |
| Chart has no data-gap handling | Phase 3: Frontend | Test rendering with a month containing `null` in the dataset |
| No last-updated indicator | Phase 3: Frontend | Confirm timestamp renders from data JSON, not hardcoded |
| Deploy hook not wired | Phase 2: CI/CD | Manually push a data change and confirm Vercel/Netlify rebuilds within 2 minutes |

---

## Sources

- Direct inspection of `https://www.politsei.ee/et/uudised/oeoepaeevainfo` — news listing, prose format, "Show more" pagination (2026-03-05)
- Direct inspection of `https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics` — confirmed JSON API, 272 monthly periods, `data.stats[].amount` in EUR (2026-03-05)
- GitHub community discussion on 60-day cron suspension: https://github.com/orgs/community/discussions/86087
- GitHub community discussion on cron timing delays: https://github.com/orgs/community/discussions/156282
- `gautamkrishnar/keepalive-workflow` GitHub Action: https://github.com/marketplace/actions/keepalive-workflow
- Chart.js responsive docs: https://www.chartjs.org/docs/latest/configuration/responsive.html
- Chart.js accessibility docs: https://www.chartjs.org/docs/latest/general/accessibility.html
- Chart.js data gaps / spanGaps: https://www.chartjs.org/docs/latest/charts/line.html
- chartjs-plugin-fill-gaps-zero: https://medium.com/nethive-engineering/bridging-data-gaps-in-time-series-line-charts-e853cffc623d
- Cloudflare protection on politsei.ee: confirmed via site infrastructure research (scrape.do rate limit blog, scrapfly Cloudflare bypass guide)
- BeautifulSoup UTF-8 encoding: https://webscraping.ai/faq/beautiful-soup/how-do-i-handle-encoding-issues-when-scraping-websites-with-beautiful-soup

---
*Pitfalls research for: Eesti petturite statistika (static site + government scraping)*
*Researched: 2026-03-05*
