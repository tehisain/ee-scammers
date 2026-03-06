---
phase: 03-site
plan: W0
type: execute
wave: 0
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - vitest.config.ts
  - src/utils/summary.ts
  - src/utils/summary.test.ts
  - src/utils/page.test.ts
autonomous: true
requirements: [VIZ-03, SITE-02, SITE-03]

must_haves:
  truths:
    - "Running `npx vitest run src/utils/summary.test.ts` passes with 3 test cases"
    - "`summarySentence()` is a pure function exported from `src/utils/summary.ts`"
    - "page.test.ts exists and is ready to run after `npm run build` produces dist/"
  artifacts:
    - path: "src/utils/summary.ts"
      provides: "Pure summarySentence() function"
      exports: ["summarySentence", "MONTH_GENITIVE"]
    - path: "src/utils/summary.test.ts"
      provides: "Vitest unit tests for VIZ-03"
      contains: "summarySentence"
    - path: "src/utils/page.test.ts"
      provides: "Smoke test for SITE-02, SITE-03 attribution links"
      contains: "dist/index.html"
    - path: "vitest.config.ts"
      provides: "Vitest configuration"
  key_links:
    - from: "src/utils/summary.test.ts"
      to: "src/utils/summary.ts"
      via: "import"
      pattern: "from.*summary"
    - from: "src/utils/page.test.ts"
      to: "dist/index.html"
      via: "fs.readFileSync"
      pattern: "readFileSync.*dist/index.html"
---

<objective>
Install test infrastructure and create the testable pure-function layer that later plans depend on.

Purpose: Nyquist compliance requires test files exist BEFORE implementation tasks reference them. This wave installs vitest and creates the summary sentence utility as a pure function (so it can be unit-tested outside Astro), plus stubs for the smoke tests.
Output: vitest installed, src/utils/summary.ts with summarySentence(), tests passing green.
</objective>

<execution_context>
@/Users/maidok/.claude/get-shit-done/workflows/execute-plan.md
@/Users/maidok/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-site/03-CONTEXT.md
@.planning/phases/03-site/03-RESEARCH.md
@.planning/phases/03-site/03-VALIDATION.md

<interfaces>
<!-- Types from scripts/schema.ts (already in project) -->
```typescript
export type MonthEntry = {
  month: string;      // "YYYY-MM"
  pensionEur: number; // 0 when not yet published for current month
  scamEur: number | null;
};

export type ChartData = {
  generatedAt: string;
  months: MonthEntry[];  // minimum 6 entries
};
```

<!-- Data shape from src/data/chart-data.json (sample) -->
```json
{
  "months": [
    { "month": "2026-02", "pensionEur": 49546839, "scamEur": 1998685 },
    { "month": "2026-03", "pensionEur": 0, "scamEur": 121368 }
  ]
}
```
Note: March 2026 has pensionEur: 0 — the last complete month is February 2026.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install vitest and create summarySentence() with tests</name>
  <files>package.json, vitest.config.ts, src/utils/summary.ts, src/utils/summary.test.ts</files>
  <behavior>
    - Test 1: summarySentence([{ month: '2026-02', pensionEur: 49546839, scamEur: 1998685 }]) returns "Petturid varastasid 4.0% veebruari 2026 pensionimaksetest"
    - Test 2: summarySentence([{ month: '2026-03', pensionEur: 0, scamEur: 121368 }, { month: '2026-02', pensionEur: 49546839, scamEur: 1998685 }]) returns the February sentence (skips month with pensionEur: 0)
    - Test 3: summarySentence([]) returns null
    - Test 4: summarySentence([{ month: '2025-10', pensionEur: 48715725, scamEur: null }]) returns null (skips null scamEur)
  </behavior>
  <action>
    RED phase:
    1. Run `npm install -D vitest` in the project root.
    2. Create `vitest.config.ts` with minimal config:
       ```typescript
       import { defineConfig } from 'vitest/config';
       export default defineConfig({
         test: { include: ['src/**/*.test.ts'] }
       });
       ```
    3. Create `src/utils/summary.test.ts` with 4 failing tests importing `{ summarySentence }` from `./summary`.
    4. Run `npx vitest run src/utils/summary.test.ts` — confirm tests FAIL (function doesn't exist yet).

    GREEN phase:
    5. Create `src/utils/summary.ts` exporting:
       - `MONTH_GENITIVE` record (all 12 months, genitive Estonian):
         `'01': 'jaanuari', '02': 'veebruari', '03': 'märtsi', '04': 'aprilli', '05': 'mai', '06': 'juuni', '07': 'juuli', '08': 'augusti', '09': 'septembri', '10': 'oktoobri', '11': 'novembri', '12': 'detsembri'`
       - `summarySentence(months: MonthEntry[]): string | null` that:
         a. Filters to entries where `scamEur !== null && scamEur > 0 && pensionEur > 0`
         b. Takes the last (most recent) filtered entry
         c. If none, returns null
         d. Computes `pct = ((scamEur / pensionEur) * 100).toFixed(1)`
         e. Looks up `MONTH_GENITIVE[mon]` for genitive month name
         f. Returns `"Petturid varastasid ${pct}% ${monthEt} ${year} pensionimaksetest"`
       Import `MonthEntry` type from `../../scripts/schema.ts` (already in project).
    6. Run `npx vitest run src/utils/summary.test.ts` — all 4 tests must PASS.
  </action>
  <verify>
    <automated>cd /Users/maidok/Developer/ee-scammers && npx vitest run src/utils/summary.test.ts --reporter=verbose</automated>
  </verify>
  <done>4 vitest tests pass; summarySentence correctly computes percentage and skips months with pensionEur: 0 or null scamEur</done>
</task>

<task type="auto">
  <name>Task 2: Create page smoke test stub</name>
  <files>src/utils/page.test.ts</files>
  <action>
    Create `src/utils/page.test.ts` that:
    1. Reads `dist/index.html` using `fs.readFileSync` (Node built-in, no import needed beyond `import fs from 'node:fs'`).
    2. Asserts the HTML string contains `politsei.ee` (attribution link — SITE-02).
    3. Asserts the HTML string contains `pensionikeskus.ee` (attribution link — SITE-02).
    4. Asserts the HTML string contains a methodology section marker — test for a distinctive Estonian word that will only appear in the methodology prose, e.g. `andmete kogumise` (methodology header text about data collection — SITE-03).

    Guard the test with a `beforeAll` that checks if `dist/index.html` exists and skips (`test.skip`) if not. This prevents the test from failing in Wave 0 before the site is built.

    Example structure:
    ```typescript
    import { describe, test, expect, beforeAll } from 'vitest';
    import fs from 'node:fs';
    import path from 'node:path';

    const distHtml = path.resolve('dist/index.html');

    describe('page smoke tests (require npm run build first)', () => {
      let html = '';
      beforeAll(() => {
        if (!fs.existsSync(distHtml)) return;
        html = fs.readFileSync(distHtml, 'utf-8');
      });

      test('attribution: politsei.ee link present (SITE-02)', () => {
        if (!fs.existsSync(distHtml)) return;
        expect(html).toContain('politsei.ee');
      });

      test('attribution: pensionikeskus.ee link present (SITE-02)', () => {
        if (!fs.existsSync(distHtml)) return;
        expect(html).toContain('pensionikeskus.ee');
      });

      test('methodology section present (SITE-03)', () => {
        if (!fs.existsSync(distHtml)) return;
        expect(html).toContain('andmete kogumise');
      });
    });
    ```

    After creating the file, run the test suite to confirm these tests pass (dist/ doesn't exist yet so they skip gracefully).
  </action>
  <verify>
    <automated>cd /Users/maidok/Developer/ee-scammers && npx vitest run src/utils/page.test.ts --reporter=verbose</automated>
  </verify>
  <done>page.test.ts runs without error; tests skip gracefully when dist/index.html does not exist; no test failures</done>
</task>

</tasks>

<verification>
- `npx vitest run` runs both test files without failure
- `src/utils/summary.ts` exports `summarySentence` and `MONTH_GENITIVE`
- `src/utils/page.test.ts` exists and handles missing `dist/` gracefully
- No watch-mode flags used; each test run is one-shot
</verification>

<success_criteria>
All 4 summary tests pass. page.test.ts runs and skips (not fails) when dist/ absent. vitest.config.ts present and functional.
</success_criteria>

<output>
After completion, create `.planning/phases/03-site/03-W0-SUMMARY.md`
</output>
