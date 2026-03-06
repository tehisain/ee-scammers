# Phase 1: Scrapers - Research

**Researched:** 2026-03-05
**Domain:** Web scraping (Playwright + Cheerio), REST API consumption, Zod validation, TypeScript scripting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Both scrapers go back **12 months** on the initial seed run — police and pension data start from the same point
- The pension API has 272 months available (back to 2003) but is capped at 12 months to match police data coverage
- The nightly job re-aggregates the **current month's running total** from all police articles found so far, updated daily
- Police reports are **daily**, with one report covering multiple days for weekends; monthly total = sum of all individual report amounts within that calendar month
- Use **programmatic "show more" clicking** until the oldest loaded article is >12 months ago; approximately 250 articles for 12 months (~20-25 per month), requiring ~10-15 button clicks
- Before writing any extraction code, open ~10 police articles manually and document the actual Estonian phrasing patterns — this is a required plan task, not optional
- Daily reports with no EUR amount are **skipped silently** — only warn if an entire month has zero articles
- Use the **article's publish date** to assign the daily report's EUR total to a calendar month
- Call `GET https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics` directly — no browser needed for pension data
- Sum `data.stats[].amount` across all funds per period; the `type` filter logic must be verified against a live API call before implementing
- Zod schema validation on the output JSON before committing — no missing fields, no wrong types
- Assert non-empty output; warn if entry count drops below expected minimum

### Claude's Discretion

- Exact script file structure (one combined `scrape.ts` vs separate per-source files with orchestrator)
- Pension fund `type` filter logic (verify live, then implement)
- Retry/timeout handling for network calls
- Temp file handling during scraper run

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Scrape politsei.ee news articles and extract monthly scam loss totals via Playwright + Cheerio | Playwright 1.58 library mode for JS-rendered pages; Cheerio for HTML parsing; confirmed "show more" button text and URL patterns; confirmed Estonian regex patterns |
| PIPE-02 | Fetch pensionikeskus.ee JSON API and aggregate monthly pension contribution totals across all funds | API endpoint confirmed; period ID lookup pattern confirmed; type F and P both summed |
| PIPE-03 | Scraper writes combined monthly data to a committed JSON file in the repo | Zod 4 schema validation pattern; tsx runner for TypeScript execution; output path `src/data/chart-data.json` |
</phase_requirements>

---

## Summary

This phase builds two data scrapers that produce a validated committed JSON file. The police scraper (PIPE-01) is the more complex component: politsei.ee renders articles via JavaScript, so Playwright is required to load and paginate the listing page. Each article is then parsed with Cheerio and regex to extract EUR amounts from Estonian prose. The pension scraper (PIPE-02) is simpler — the pensionikeskus.ee API is a plain JSON REST endpoint, but it requires a two-step approach: first fetch the full periods list to get hashed period IDs, then loop through the relevant 12 months using those IDs.

A critical pre-implementation step is the discovery pass: manually read ~10 actual police articles to confirm exact Estonian phrasing patterns for scam EUR amounts before writing any regex. This is already locked as a required plan task. Research has now confirmed three primary patterns observed across multiple articles, providing a strong starting point, but the manual verification step remains essential before coding.

The tech stack is minimal: Playwright for browser automation, Cheerio for HTML parsing, Zod 4 for output validation, and tsx for running TypeScript scripts directly without a compile step. No test runner (Jest/Vitest) is needed for the scraper scripts themselves, but the Zod validation and data integrity checks serve as the automated correctness gate.

**Primary recommendation:** Use separate source files (`scripts/scrape-police.ts` and `scripts/scrape-pension.ts`) with a thin `scripts/scrape.ts` orchestrator that runs both in sequence and writes the merged, Zod-validated output. This is easier to debug and test individually than a monolithic file.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| playwright | ^1.58.2 | Browser automation for JS-rendered politsei.ee pages | Only production-grade option for JS-heavy sites; Chrome/Firefox/WebKit support |
| cheerio | ^1.0.0 | Parse HTML extracted from Playwright's `page.content()` | jQuery-style selectors; native TypeScript types; faster than DOM re-querying |
| zod | ^4.0.0 | Validate output JSON schema before file write | TypeScript-first; Zod 4 is stable; safeParse gives structured errors |
| tsx | ^4.x | Run `scrape.ts` TypeScript files directly | No compile step; dev-dependency only; standard in 2025 TS scripting |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs/promises | built-in | Read/write `src/data/chart-data.json` | No extra dependency needed for file I/O |
| node:https / fetch | built-in (Node 18+) | Fetch pensionikeskus.ee API | Native fetch is sufficient for simple JSON GET |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| playwright (library mode) | puppeteer | Playwright has better built-in wait strategies and TypeScript support |
| cheerio | page.$$eval() only | Cheerio separates extraction logic from browser session; easier to unit test |
| tsx | ts-node | tsx is faster and has no tsconfig requirement; ts-node needs more configuration |
| zod 4 | zod 3 | Zod 4 is stable as of 2025; slightly different import path but better performance |

**Installation:**
```bash
npm install playwright cheerio zod
npm install -D tsx typescript @types/node
npx playwright install chromium
```

---

## Architecture Patterns

### Recommended Project Structure

```
scripts/
├── scrape.ts              # orchestrator: runs both scrapers, validates, writes output
├── scrape-police.ts       # Playwright + Cheerio police scraper
├── scrape-pension.ts      # fetch() pension API scraper
└── schema.ts              # Zod schema definitions (shared)
src/
└── data/
    └── chart-data.json    # committed output file
package.json               # scripts: { "scrape": "tsx scripts/scrape.ts" }
```

### Pattern 1: Playwright "Show More" Pagination Loop

**What:** Click the "Näita rohkem tulemusi" button repeatedly until the oldest visible article date is older than the cutoff date (12 months ago).

**When to use:** JS-rendered listing pages with dynamic pagination instead of URL-based pages.

**Confirmed from live site:**
- Button text: "Näita rohkem tulemusi" (anchor element, not a `<button>`)
- Article dates rendered as: `"02. märts 2026"` (day. Estonian-month-name year)
- Estimated ~10-15 clicks needed for 12 months of articles

**Example:**
```typescript
// Source: playwright.dev/docs/library + live site observation
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://www.politsei.ee/et/uudised/oeoepaeevainfo');

const CUTOFF = new Date();
CUTOFF.setMonth(CUTOFF.getMonth() - 12);

while (true) {
  // Try to click "show more" button
  const showMore = page.getByText('Näita rohkem tulemusi');
  const isVisible = await showMore.isVisible();
  if (!isVisible) break;

  // Check if oldest loaded article is already beyond our cutoff
  // (parse article dates from current page content to decide)
  const html = await page.content();
  const oldestDate = getOldestArticleDate(html); // parse Estonian dates
  if (oldestDate < CUTOFF) break;

  await showMore.click();
  await page.waitForLoadState('networkidle');
}

const finalHtml = await page.content();
await browser.close();
// Parse finalHtml with Cheerio
```

### Pattern 2: Pension API Two-Step Period Lookup

**What:** The pension API uses opaque hashed period IDs, not YYYY-MM strings. Fetch the full period list first, build a lookup map, then request each target month by ID.

**When to use:** Any time you need historical monthly pension data.

**Confirmed from live API response:**
```typescript
// Source: live API observation at pensionikeskus.ee/ws/et/stats/receipt-statistics
const BASE = 'https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics';

// Step 1: get all periods
const index = await fetch(BASE).then(r => r.json());
// index.data.periods: Array<{ id: string, start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD" }>

// Build YYYY-MM -> period ID map
const periodMap = new Map<string, string>();
for (const p of index.data.periods) {
  const key = p.start_date.slice(0, 7); // "2025-02"
  periodMap.set(key, p.id);
}

// Step 2: for each target month, fetch stats using the hashed ID
const monthKey = '2025-02';
const periodId = periodMap.get(monthKey);
const stats = await fetch(`${BASE}?period=${periodId}`).then(r => r.json());

// Sum all amounts (both type "F" and type "P") — verify filter logic live first
const total = stats.data.stats.reduce((sum: number, s: any) => sum + s.amount, 0);
```

**IMPORTANT:** The `period` query parameter must be the hashed `id` field — NOT a YYYY-MM date string. Using a date string will return default (current) data silently.

### Pattern 3: Zod Output Schema + Safe Validation

**What:** Define the expected JSON shape, validate before writing, surface errors with details.

**Example:**
```typescript
// Source: zod.dev/basics
import * as z from 'zod';

const MonthEntrySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // "2025-02"
  pensionEur: z.number(),
  scamEur: z.number().nullable(),             // null when no police articles
});

const ChartDataSchema = z.object({
  generatedAt: z.string(),
  months: z.array(MonthEntrySchema).min(6),   // at least 6 months required
});

export type ChartData = z.infer<typeof ChartDataSchema>;

// Validate before writing
const result = ChartDataSchema.safeParse(rawData);
if (!result.success) {
  console.error('Schema validation failed:', result.error.issues);
  process.exit(1);
}
await fs.writeFile('src/data/chart-data.json', JSON.stringify(result.data, null, 2));
```

### Anti-Patterns to Avoid

- **Guessing regex without article inspection:** Write regex only after confirming real Estonian phrasing patterns from live articles. The discovery pass is mandatory.
- **Using YYYY-MM as pension period parameter:** The API silently returns current data if you pass a date string instead of the hashed ID. Always use the period lookup map.
- **Scraping article body pages individually without batching:** Playwright has startup overhead. Extract all article links first, then process them sequentially in one browser session.
- **Hardcoding period IDs:** The IDs are opaque hashes — always derive them from the periods list at runtime.
- **Parsing Estonian dates with English Date constructor:** `new Date("02. märts 2026")` returns Invalid Date. Write a dedicated Estonian month-name parser.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation | Custom fetch + HTML | Playwright | politsei.ee renders via JS; plain fetch gets an empty shell |
| HTML querying | Manual string indexing | Cheerio | Attribute selectors, text matching, child traversal are complex to implement reliably |
| Output schema enforcement | Manual field checks | Zod | Type coercion edge cases, nested validation, and good error messages are non-trivial |
| TypeScript execution | Custom build pipeline | tsx | Compiling to JS just to run a script adds unnecessary complexity |

**Key insight:** The scraper's hardest problem is the police article text parsing. Everything else (pagination, API calls, file I/O) is plumbing. Don't spend engineering time on plumbing that libraries solve.

---

## Common Pitfalls

### Pitfall 1: Pension API Period Parameter Format

**What goes wrong:** Developer passes `?period=2025-02` to the API. The API silently returns the current/default month's data — no error, wrong data.

**Why it happens:** The API uses opaque MD5-like hashed IDs for period selection. The `start_date` field looks like a natural key but is not used as a query parameter.

**How to avoid:** Always fetch the period list first, build a `Map<string, string>` of `YYYY-MM -> id`, then use `periodMap.get(monthKey)` for all requests.

**Warning signs:** All 12 months return identical or near-identical amounts.

### Pitfall 2: Estonian Date Parsing

**What goes wrong:** `new Date("02. märts 2026")` or similar returns `Invalid Date`, breaking all article date attribution.

**Why it happens:** Node's Date constructor doesn't understand Estonian month names.

**How to avoid:** Write a small `parseEstonianDate(text: string): Date` helper with a mapping of Estonian month names to month numbers (jaanuar=1, veebruar=2, märts=3, aprill=4, mai=5, juuni=6, juuli=7, august=8, september=9, oktoober=10, november=11, detsember=12).

**Warning signs:** All articles attributed to the same month, or zero articles found.

### Pitfall 3: EUR Regex Missing Amount Variants

**What goes wrong:** Regex matches `"Kahju on X eurot"` but misses `"peteti välja X eurot"` or `"üle X euro"`. Monthly totals are understated.

**Why it happens:** Police articles use at least three distinct phrasing patterns for EUR amounts. A regex covering only one pattern silently under-counts.

**How to avoid:** The discovery pass (reading ~10 articles) must document all observed patterns. Current confirmed patterns from research:
- `Kahju on (\d[\d\s]*) euro` — "Damage is X euros"
- `peteti välja (\d[\d\s]*) eurot` — "Defrauded out of X euros"
- `Pettusega tekitatud kahju on (\d[\d\s]*) eurot` — "Fraud-caused damage is X euros"
- `üle (\d[\d\s]*) euro` — "Over X euros" (use as-is for lower bound)
- Narrative transfers: `summas (\d[\d\s]*) eurot` — "totaling X euros"

**Warning signs:** Zero EUR amounts extracted from articles that visibly contain amounts when read manually.

### Pitfall 4: Playwright "networkidle" Timeout on Slow Load

**What goes wrong:** `waitForLoadState('networkidle')` times out because politsei.ee fires ongoing analytics/tracking requests, never reaching zero in-flight requests.

**Why it happens:** `networkidle` waits for 500ms with no network activity. Sites with persistent background polling never settle.

**How to avoid:** Use `waitForSelector` with the next batch of article elements after clicking "show more", instead of `networkidle`. Alternatively use `waitForLoadState('domcontentloaded')` with a small additional wait on the article count.

**Warning signs:** Playwright throws timeout errors after every click.

### Pitfall 5: Thousand-Separator in EUR Amounts

**What goes wrong:** `"70 000 eurot"` — the space is a thousands separator. `parseInt("70 000")` returns 70, not 70000.

**Why it happens:** Estonian number formatting uses space as a thousands separator.

**How to avoid:** Strip spaces before parsing: `parseInt(match.replace(/\s/g, ''))`.

**Warning signs:** Implausibly small EUR amounts (70 instead of 70,000).

---

## Code Examples

Verified patterns from live sources:

### Estonian Month Name Parser

```typescript
// Derived from live article dates on politsei.ee
const ESTONIAN_MONTHS: Record<string, number> = {
  jaanuar: 1, veebruar: 2, märts: 3, aprill: 4,
  mai: 5, juuni: 6, juuli: 7, august: 8,
  september: 9, oktoober: 10, november: 11, detsember: 12,
};

function parseEstonianDate(text: string): Date | null {
  // Format: "02. märts 2026"
  const match = text.match(/(\d{1,2})\.\s+(\w+)\s+(\d{4})/);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = ESTONIAN_MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  return new Date(Number(year), month - 1, Number(day));
}
```

### EUR Amount Regex Extractor

```typescript
// Source: confirmed against live politsei.ee articles (Aug 2024, Mar 2024)
// NOTE: run discovery pass first to validate/extend these patterns
const EUR_PATTERNS = [
  /(?:kahju on|tekitatud kahju on)\s+(?:üle\s+)?(\d[\d\s]*)\s+euro/gi,
  /peteti välja\s+(\d[\d\s]*)\s+euro/gi,
  /summas\s+(\d[\d\s]*)\s+euro/gi,
  /kantud.*?(\d[\d\s]*)\s+euro/gi,
];

function extractEurAmounts(text: string): number[] {
  const amounts: number[] = [];
  for (const pattern of EUR_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseInt(match[1].replace(/\s/g, ''), 10);
      if (!isNaN(value) && value > 0) amounts.push(value);
    }
  }
  return amounts;
}
```

### Pension Monthly Totals Loop

```typescript
// Source: live API observation
async function fetchPensionMonths(monthKeys: string[]): Promise<Map<string, number>> {
  const BASE = 'https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics';

  // Build period ID lookup
  const index = await fetch(BASE).then(r => r.json());
  const periodMap = new Map<string, string>();
  for (const p of (index.data.periods as any[])) {
    periodMap.set(p.start_date.slice(0, 7), p.id);
  }

  const result = new Map<string, number>();
  for (const key of monthKeys) {
    const id = periodMap.get(key);
    if (!id) { console.warn(`No period found for ${key}`); continue; }
    const data = await fetch(`${BASE}?period=${id}`).then(r => r.json());
    // Sum both type "F" (funds) and type "P" (PIK accounts)
    // VERIFY: confirm this is the right aggregation after a live test call
    const total = (data.data.stats as any[]).reduce((s, e) => s + e.amount, 0);
    result.set(key, Math.round(total));
  }
  return result;
}
```

### Package.json Script Entry

```json
{
  "scripts": {
    "scrape": "tsx scripts/scrape.ts"
  }
}
```

### Running the Scraper

```bash
npm run scrape
# or directly:
npx tsx scripts/scrape.ts
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-node for TypeScript scripts | tsx | ~2023 | No tsconfig required, faster startup |
| Zod 3 (`import { z }`) | Zod 4 (`import * as z from "zod"`) | 2025 | Stable release; `zod/v4` subpath available; npm install still `zod` |
| Playwright `networkidle` waits | `waitForSelector` / `locator` | ~2022 | More reliable on sites with background polling |
| `@types/cheerio` separate package | Cheerio ships its own types | ~2023 | `npm install cheerio` — no @types needed |
| Chromium separate install | `npx playwright install chromium` | ongoing | Playwright manages its own browser binaries |

**Deprecated/outdated:**
- `ts-node`: Still works but tsx is the 2025 standard for scraping scripts
- `@types/cheerio`: No longer needed; cheerio >= 1.0 ships TypeScript types
- Playwright's `page.waitForNavigation()`: Deprecated in favor of `waitForURL()` / `waitForLoadState()`

---

## Open Questions

1. **Pension type filter — F only, P only, or both?**
   - What we know: Type F = investment funds; Type P = PIK bank pension accounts. Both appear in stats. Research recommendation is to sum both.
   - What's unclear: Whether PIK (P) contributions count as "second pillar pension contributions" for the comparison chart's narrative
   - Recommendation: Make a live API call during the discovery task and confirm what the pensionikeskus.ee site shows as the "total" for a given month. Match that figure to validate the aggregation logic.

2. **Police "show more" button selector stability**
   - What we know: The button renders as `<a>Näita rohkem tulemusi</a>` (an anchor, not a button element)
   - What's unclear: Whether the anchor has a stable class or data attribute we can use as a more robust locator
   - Recommendation: Use `page.getByText('Näita rohkem tulemusi')` as the primary locator; fall back to `page.locator('a:has-text("Näita rohkem")')` if text changes

3. **Archive URL pattern as alternative to programmatic clicking**
   - What we know: Archive URLs like `/et/uudised/2024/08/oeoepaeevainfo` exist and list all articles for a month; individual article URLs are `/et/uudised/politseis-registreeritud-suendmused-{hash}-{id}`
   - What's unclear: Whether archive URLs are stable/complete vs. the live listing with "show more"
   - Recommendation: The CONTEXT.md locks programmatic clicking, but archive URL navigation would be a simpler approach. If clicking proves unstable in CI, the archive URL pattern is a reliable fallback worth knowing about.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None yet — project has no test framework |
| Config file | Wave 0 gap — no test config exists |
| Quick run command | `npx tsx scripts/scrape.ts` (integration smoke) |
| Full suite command | `npx tsx scripts/scrape.ts && node -e "require('./src/data/chart-data.json')"` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Police scraper produces non-empty scam entries | integration smoke | `npx tsx scripts/scrape.ts` | ❌ Wave 0 |
| PIPE-02 | Pension scraper produces non-empty pension entries | integration smoke | `npx tsx scripts/scrape.ts` | ❌ Wave 0 |
| PIPE-03 | Output JSON passes Zod schema validation | automated (inline) | Zod safeParse inside `scrape.ts` exits non-zero on failure | ❌ Wave 0 |
| PIPE-03 | Output JSON has ≥6 months of data | automated (inline) | `z.array(MonthEntrySchema).min(6)` in schema | ❌ Wave 0 |

**Note:** This phase's validation is primarily integration-level — running the actual scraper against live sites. There is no meaningful unit test for "regex extracts correct EUR" without fixture HTML from real police articles. The discovery pass task should produce fixture HTML snippets that enable basic regex unit tests.

### Sampling Rate

- **Per task commit:** `npx tsx scripts/scrape.ts` (verify no runtime errors after each script change)
- **Per wave merge:** Full scrape run + Zod validation must pass
- **Phase gate:** `src/data/chart-data.json` committed with ≥6 months, passes Zod schema, before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/schema.ts` — Zod schema definition (covers PIPE-03 validation)
- [ ] `scripts/scrape.ts` — orchestrator entry point
- [ ] `scripts/scrape-police.ts` — police scraper module
- [ ] `scripts/scrape-pension.ts` — pension API module
- [ ] `package.json` with tsx, playwright, cheerio, zod dependencies and `"scrape"` script
- [ ] `src/data/` directory must exist before scraper writes output
- [ ] `npx playwright install chromium` — browser binary needed in dev environment

---

## Sources

### Primary (HIGH confidence)

- Live API: `https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics` — period structure, type fields, amount format confirmed via direct fetch
- Live site: `https://www.politsei.ee/et/uudised/2024/08/oeoepaeevainfo` — article count per month, URL structure, date format confirmed
- Live articles: Aug 2024 (`politseis-registreeritud-suendmused-290a4b-12160`) and Mar 2024 (`politseis-registreeritud-suendmused-4bc575-11864`, `politseis-registreeritud-suendmused-59448c-11863`) — Estonian EUR amount phrases confirmed verbatim
- [Playwright Library docs](https://playwright.dev/docs/library) — launch, navigate, click, content() APIs confirmed
- [Zod v4 release](https://zod.dev/v4) — Zod 4 stable confirmed, import path `import * as z from "zod"` confirmed
- [tsx getting started](https://tsx.is/getting-started) — installation and usage confirmed

### Secondary (MEDIUM confidence)

- [npm: playwright@1.58.2](https://www.npmjs.com/package/playwright) — version confirmed via search results (month-old data)
- [Cheerio docs](https://cheerio.js.org/docs/intro/) — `cheerio.load()`, jQuery selectors, native TS types confirmed
- politsei.ee listing page structure — "Näita rohkem tulemusi" anchor text confirmed; article date format confirmed

### Tertiary (LOW confidence)

- EUR pattern `üle X euro` may also appear as `üle X 000 euro` — not directly confirmed; needs discovery pass validation
- Playwright "networkidle" reliability concern on politsei.ee — general known issue, not site-specifically verified
- Pension fund type P (PIK) inclusion in "second pillar" total — plausible but requires verification against pensionikeskus.ee UI display

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed from npm registry and official docs
- Architecture: HIGH — API structure confirmed from live calls; Playwright patterns from official docs
- Pitfalls: HIGH for pension ID issue (live confirmed), MEDIUM for police regex coverage (3 patterns confirmed, discovery pass needed for completeness)
- Estonian EUR patterns: MEDIUM-HIGH — confirmed from 3 real articles across 2 months; discovery pass adds remaining confidence

**Research date:** 2026-03-05
**Valid until:** 2026-06-05 (stable APIs; politsei.ee site structure could change)
