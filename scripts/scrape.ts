import { writeFile } from 'node:fs/promises';
import { fetchPensionData } from './scrape-pension.js';
import { fetchPoliceData } from './scrape-police.js';
import { ChartDataSchema } from './schema.js';
import type { MonthEntry } from './schema.js';

async function main() {
  console.log('[scrape] Starting...');

  // Run both scrapers sequentially to avoid network contention
  const pensionEntries = await fetchPensionData(12);
  const policeEntries = await fetchPoliceData(12);

  // Build a unified month set
  const monthSet = new Set<string>([
    ...pensionEntries.map(e => e.month),
    ...policeEntries.map(e => e.month),
  ]);

  const pensionMap = new Map(pensionEntries.map(e => [e.month, e.pensionEur]));
  const policeMap = new Map(policeEntries.map(e => [e.month, e.scamEur]));

  const months: MonthEntry[] = Array.from(monthSet)
    .sort()
    .map(month => ({
      month,
      pensionEur: pensionMap.get(month) ?? 0,
      scamEur: policeMap.get(month) ?? null,
    }));

  const rawData = {
    generatedAt: new Date().toISOString(),
    months,
  };

  // Validate before writing
  const result = ChartDataSchema.safeParse(rawData);
  if (!result.success) {
    console.error('[scrape] Schema validation FAILED:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const outputPath = 'src/data/chart-data.json';
  await writeFile(outputPath, JSON.stringify(result.data, null, 2), 'utf-8');
  console.log(`[scrape] Wrote ${outputPath} (${result.data.months.length} months)`);
  console.log(`[scrape] generatedAt: ${result.data.generatedAt}`);
}

main().catch(err => {
  console.error('[scrape] Unhandled error:', err);
  process.exit(1);
});
