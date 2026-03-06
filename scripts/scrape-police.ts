import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MonthEntry } from "./schema.js";

const JSONL_PATH = resolve(
  fileURLToPath(import.meta.url),
  "../../scam_amounts.jsonl"
);

interface ScamRecord {
  date: string;
  amount: number;
}

function monthKey(dateStr: string): string {
  // dateStr is "YYYY-MM-DD" — extract YYYY-MM
  return dateStr.slice(0, 7);
}

async function readJsonl(filePath: string): Promise<ScamRecord[]> {
  const records: ScamRecord[] = [];
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const record = JSON.parse(trimmed) as ScamRecord;
    records.push(record);
  }

  return records;
}

export async function fetchPoliceData(
  _monthCount = 12
): Promise<Pick<MonthEntry, "month" | "scamEur">[]> {
  const records = await readJsonl(JSONL_PATH);

  // Group and sum amounts by YYYY-MM
  const monthTotals = new Map<string, number>();
  const monthArticleCounts = new Map<string, number>();

  for (const record of records) {
    if (!record.date || typeof record.amount !== "number") continue;

    const key = monthKey(record.date);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + record.amount);
    monthArticleCounts.set(key, (monthArticleCounts.get(key) ?? 0) + 1);
  }

  // Warn for any month that had zero articles (edge case — wouldn't appear in map)
  // Log info about months found
  if (monthTotals.size === 0) {
    console.warn("[police] WARNING: No records found in JSONL file");
  }

  // Build result sorted ascending by month
  const result: Pick<MonthEntry, "month" | "scamEur">[] = Array.from(
    monthTotals.entries()
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month,
      // Round to nearest integer (amounts may have fractional cents)
      scamEur: Math.round(total),
    }));

  return result;
}

// CLI smoke-test when run directly
const isMain =
  process.argv[1]?.endsWith("scrape-police.ts") ||
  process.argv[1]?.endsWith("scrape-police.js");

if (isMain) {
  fetchPoliceData(12)
    .then((data) => {
      console.log(`\n[police] Fetched ${data.length} months`);
      for (const entry of data) {
        console.log(
          `[police] ${entry.month}: ${entry.scamEur?.toLocaleString() ?? "null"} EUR`
        );
      }
    })
    .catch((err) => {
      console.error("[police] FAILED:", err);
      process.exit(1);
    });
}
