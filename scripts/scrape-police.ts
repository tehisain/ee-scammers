import * as cheerio from "cheerio";
import type { MonthEntry } from "./schema.js";

const BASE_URL = "https://www.politsei.ee";
const ARCHIVE_URL = `${BASE_URL}/et/uudised`;

// Euro amount pattern handles: "55 254", "230616", "53 406,87" (Estonian decimal comma)
const EURO_AMOUNT = /(\d[\d\s]*(?:,\d+)?)\s*euro/gi;

// Summary pattern: "kahju kokku summas ligi 55 254 eurot"
const SUMMARY_RE =
  /kahju kokku summas[^0-9]*?(\d[\d\s]*(?:,\d+)?)\s*euro/i;

function parseEuroAmount(raw: string): number {
  // Strip spaces, then handle comma-decimal: "53 406,87" → 53406.87 → round to 53407
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  return Math.round(parseFloat(normalized));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return cheerio.load(await res.text());
}

/** Fetch article URLs for a given YYYY/MM from the archive page. */
async function fetchMonthArticleUrls(
  year: number,
  month: number
): Promise<string[]> {
  const mm = String(month).padStart(2, "0");
  const $ = await fetchHtml(`${ARCHIVE_URL}/${year}/${mm}`);
  const urls: string[] = [];
  $("h4.article-headline a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.includes("politseis-registreeritud-suendmused")) {
      urls.push(href);
    }
  });
  return urls;
}

// Headings that mark the end of a KELMUSED block within mixed-content paragraphs.
const SECTION_HEADING_RE =
  /^(?:Kehaline|Liiklus|Piiriturvalisus|Vargus|Avalik|Narkootikum|Muu|Röövim|Lähisuhte|PÕHJA|LÕUNA|IDA|LÄÄNE|Tallinn|Harju|Tartu|Pärnu|Võru|Valga|Ida-Viru|Järva|Lääne|Rapla|Saare|Hiiu|Jõgeva|Viljan)/;

/**
 * Extract KELMUSED text fragments from an article page.
 *
 * Articles have two layouts:
 * - New (from ~Nov 2025): "KELMUSED" is a standalone <p> heading,
 *   followed by case paragraphs until the next heading.
 * - Old: "Kelmus" appears inline within regional paragraphs, e.g.
 *   "Ida-Virumaa\nKelmus\n<case text>\nPiiriturvalisus\n..."
 *
 * This function handles both by scanning all text for "Kelmus"/"KELMUSED"
 * markers and extracting the text that follows until the next section heading.
 * It also checks intro paragraphs for a summary amount.
 */
function extractKelmusedParagraphs($: cheerio.CheerioAPI): string[] {
  const section = $("section.componentized");
  const children = section.children();
  const allTexts: string[] = [];
  const introParagraphs: string[] = [];
  let seenFirstHeading = false;

  children.each((_, el) => {
    const text = $(el).text().trim();
    allTexts.push(text);
    if (!seenFirstHeading && text.length > 20) {
      introParagraphs.push(text);
    }
    if (/^[A-ZÄÖÜÕŠŽ\s]{4,}$/.test(text) || /^(?:KELMUSED|Kelmus)\b/.test(text)) {
      seenFirstHeading = true;
    }
  });

  const paragraphs: string[] = [];

  // Strategy 1: New format — standalone KELMUSED heading
  let inKelmused = false;
  for (const text of allTexts) {
    if (text === "KELMUSED") {
      inKelmused = true;
      continue;
    }
    if (inKelmused && /^[A-ZÄÖÜÕŠŽ\s]{4,}$/.test(text)) {
      inKelmused = false;
      continue;
    }
    if (inKelmused && text.length > 20) {
      paragraphs.push(text);
    }
  }

  if (paragraphs.length > 0) {
    prependSummaryFromIntro(paragraphs, introParagraphs);
    return paragraphs;
  }

  // Strategy 2: Old format — "Kelmus" embedded in text blocks.
  // Scan each text block, split by lines, and extract kelmus sections.
  for (const text of allTexts) {
    const lines = text.split("\n").map((l) => l.trim());
    let inK = false;
    let chunk: string[] = [];

    for (const line of lines) {
      if (/^(?:KELMUSED|Kelmus(?:ed)?)\s*$/i.test(line)) {
        // Flush any previous chunk
        if (inK && chunk.length > 0) {
          paragraphs.push(chunk.join(" "));
          chunk = [];
        }
        inK = true;
        continue;
      }
      if (inK && SECTION_HEADING_RE.test(line)) {
        if (chunk.length > 0) {
          paragraphs.push(chunk.join(" "));
          chunk = [];
        }
        inK = false;
        continue;
      }
      if (inK && line.length > 0) {
        chunk.push(line);
      }
    }
    if (inK && chunk.length > 0) {
      paragraphs.push(chunk.join(" "));
    }
  }

  prependSummaryFromIntro(paragraphs, introParagraphs);
  return paragraphs;
}

/** If paragraphs lack a summary, check intro paragraphs and prepend if found. */
function prependSummaryFromIntro(
  paragraphs: string[],
  introParagraphs: string[]
): void {
  if (paragraphs.length === 0) return;
  if (SUMMARY_RE.test(paragraphs[0])) return;
  for (const intro of introParagraphs) {
    if (SUMMARY_RE.test(intro)) {
      paragraphs.unshift(intro);
      return;
    }
  }
}

/**
 * Extract the total scam amount from KELMUSED paragraphs.
 *
 * Rule 1: If the first paragraph contains a summary sentence like
 *   "kahju kokku summas ligi 55 254 eurot" → use that amount.
 * Rule 2: Otherwise, take the last euro amount from each paragraph
 *   (the damage is typically stated in the last sentence) and sum them.
 */
function extractScamTotal(paragraphs: string[]): number {
  if (paragraphs.length === 0) return 0;

  // Rule 1: check first paragraph for summary
  const summaryMatch = paragraphs[0].match(SUMMARY_RE);
  if (summaryMatch) {
    return parseEuroAmount(summaryMatch[1]);
  }

  // Rule 2: sum last euro amount from each paragraph
  let total = 0;
  for (const para of paragraphs) {
    const matches = [...para.matchAll(EURO_AMOUNT)];
    if (matches.length > 0) {
      total += parseEuroAmount(matches[matches.length - 1][1]);
    }
  }
  return total;
}

export async function fetchPoliceData(
  monthCount = 12
): Promise<Pick<MonthEntry, "month" | "scamEur">[]> {
  // Build list of YYYY-MM months to scrape
  const months: { year: number; month: number; key: string }[] = [];
  const now = new Date();
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.unshift({ year, month, key });
  }

  const monthTotals = new Map<string, number>();

  for (const { year, month, key } of months) {
    console.log(`[police] Fetching archive for ${key}...`);
    const articleUrls = await fetchMonthArticleUrls(year, month);
    console.log(`[police]   Found ${articleUrls.length} articles`);

    for (const url of articleUrls) {
      await sleep(300); // be polite to the server
      const fullUrl = `${BASE_URL}${url}`;
      try {
        const $ = await fetchHtml(fullUrl);
        const paragraphs = extractKelmusedParagraphs($);
        const amount = extractScamTotal(paragraphs);

        // Get the article date from <time> element
        const dateStr =
          $("time").first().attr("datetime")?.slice(0, 10) ?? "";
        const articleMonth = dateStr.slice(0, 7);

        if (amount > 0 && articleMonth) {
          monthTotals.set(
            articleMonth,
            (monthTotals.get(articleMonth) ?? 0) + amount
          );
          console.log(
            `[police]   ${dateStr}: ${amount.toLocaleString()} EUR`
          );
        } else if (paragraphs.length === 0) {
          console.log(`[police]   ${dateStr}: no KELMUSED section`);
        } else {
          console.log(`[police]   ${dateStr}: 0 EUR (no amounts found)`);
        }
      } catch (err) {
        console.warn(`[police]   WARN: failed to fetch ${url}:`, err);
      }
    }

    await sleep(500);
  }

  // Build result sorted ascending by month
  const result: Pick<MonthEntry, "month" | "scamEur">[] = Array.from(
    monthTotals.entries()
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month,
      scamEur: Math.round(total),
    }));

  if (result.length === 0) {
    console.warn("[police] WARNING: No scam data found");
  }

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
