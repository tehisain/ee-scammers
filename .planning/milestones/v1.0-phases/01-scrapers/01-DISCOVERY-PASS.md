# Police Scam Data — Discovery Pass

**Status:** Complete — data pre-scraped, no live scraping required.

## Source

All scam amount data was manually collected and provided as `scam_amounts.jsonl`
in the project root. The file contains 97 incident records spanning Oct 2025 – Mar 2026.

## Data Format

Each record: `{"date": "YYYY-MM-DD", "amount": <number>}`

Amounts are in EUR (decimal values present, e.g. 229908.76).

## Aggregation Approach

Instead of a Playwright scraper + regex, `scripts/scrape-police.ts` will:
1. Read `scam_amounts.jsonl` from the project root
2. Parse each line as JSON
3. Group amounts by `YYYY-MM` (derived from `date` field)
4. Sum amounts per month
5. Return `MonthEntry[]` matching the shared schema

## EUR_PATTERNS

Not applicable — amounts are provided as numeric values in the JSONL file,
no regex parsing required.

## Records by Month

| Month   | Incidents |
|---------|-----------|
| 2025-10 | 18        |
| 2025-11 | 19        |
| 2025-12 | 17        |
| 2026-01 | 15        |
| 2026-02 | 22        |
| 2026-03 | 1         |

## Notes

- Amounts range from €3,000 to €656,700 per incident
- Some amounts have fractional cents (e.g. 229908.76, 65549.98)
- Mar 2026 has only 1 record so far (month in progress)
