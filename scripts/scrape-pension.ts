import type { MonthEntry } from './schema.js';

const BASE_URL = 'https://www.pensionikeskus.ee/ws/et/stats/receipt-statistics';

interface PeriodInfo {
  id: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
}

interface StatEntry {
  amount: number;
  type: string;
}

async function buildPeriodMap(): Promise<Map<string, string>> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error(`Period list fetch failed: ${res.status}`);
  const json = await res.json() as { data: { periods: PeriodInfo[] } };
  const map = new Map<string, string>();
  for (const p of json.data.periods) {
    const key = p.start_date.slice(0, 7); // "YYYY-MM"
    map.set(key, p.id);
  }
  return map;
}

async function fetchMonthTotal(periodId: string): Promise<number> {
  const res = await fetch(`${BASE_URL}?period=${periodId}`);
  if (!res.ok) throw new Error(`Stats fetch failed for period ${periodId}: ${res.status}`);
  const json = await res.json() as { data: { stats: StatEntry[] } };
  // Sum all types (F = investment funds, P = PIK accounts) — both are second-pillar contributions
  return Math.round(json.data.stats.reduce((sum, s) => sum + s.amount, 0));
}

export async function fetchPensionData(monthCount = 12): Promise<Pick<MonthEntry, 'month' | 'pensionEur'>[]> {
  const periodMap = await buildPeriodMap();

  // Build list of the last N calendar months (most recent first, then sort ascending)
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.unshift(key); // unshift to build ascending order
  }

  const results: Pick<MonthEntry, 'month' | 'pensionEur'>[] = [];
  for (const monthKey of months) {
    const periodId = periodMap.get(monthKey);
    if (!periodId) {
      console.warn(`[pension] No period ID found for ${monthKey} — skipping`);
      continue;
    }
    const total = await fetchMonthTotal(periodId);
    results.push({ month: monthKey, pensionEur: total });
    console.log(`[pension] ${monthKey}: ${total.toLocaleString()} EUR`);
  }

  if (results.length === 0) throw new Error('[pension] No data returned — check API or period map');
  return results;
}

// CLI smoke-test when run directly
const isMain = process.argv[1]?.endsWith('scrape-pension.ts') ||
               process.argv[1]?.endsWith('scrape-pension.js');
if (isMain) {
  fetchPensionData(12)
    .then(data => {
      console.log(`\n[pension] Fetched ${data.length} months`);
      console.log('[pension] Sample:', data.slice(-3));
    })
    .catch(err => {
      console.error('[pension] FAILED:', err);
      process.exit(1);
    });
}
