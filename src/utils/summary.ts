import type { MonthEntry } from '../../scripts/schema';

export const MONTH_GENITIVE: Record<string, string> = {
  '01': 'jaanuari',
  '02': 'veebruari',
  '03': 'märtsi',
  '04': 'aprilli',
  '05': 'mai',
  '06': 'juuni',
  '07': 'juuli',
  '08': 'augusti',
  '09': 'septembri',
  '10': 'oktoobri',
  '11': 'novembri',
  '12': 'detsembri',
};

export function summarySentence(months: MonthEntry[]): string | null {
  const filtered = months.filter(
    (m) => m.scamEur !== null && m.scamEur > 0 && m.pensionEur > 0
  );
  if (filtered.length === 0) return null;

  const last = filtered[filtered.length - 1];
  const pct = ((last.scamEur! / last.pensionEur) * 100).toFixed(1);
  const [year, mon] = last.month.split('-');
  const monthEt = MONTH_GENITIVE[mon] ?? mon;

  return `Petturid varastasid ${pct}% ${monthEt} ${year} pensionimaksetest`;
}
