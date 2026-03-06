import * as z from "zod";

export const MonthEntrySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
  pensionEur: z.number(),
  scamEur: z.number().nullable(),
});

export const ChartDataSchema = z.object({
  generatedAt: z.string(),
  months: z.array(MonthEntrySchema).min(6, "at least 6 months of data required"),
});

export type MonthEntry = z.infer<typeof MonthEntrySchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;

// Self-test: validate a minimal fixture
const testData = {
  generatedAt: new Date().toISOString(),
  months: Array.from({ length: 6 }, (_, i) => ({
    month: `2025-0${i + 1}`,
    pensionEur: 1000000,
    scamEur: i % 2 === 0 ? 50000 : null,
  })),
};
const result = ChartDataSchema.safeParse(testData);
if (!result.success) {
  console.error("Schema self-test failed:", result.error.issues);
  process.exit(1);
}
console.log("Schema self-test passed:", result.data.months.length, "months");
