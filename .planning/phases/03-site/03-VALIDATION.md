---
phase: 3
slug: site
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Wave 0 installs) |
| **Config file** | `vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `npx vitest run src/utils/summary.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/summary.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual visual check at 375px
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | VIZ-03 | unit stub | `npx vitest run src/utils/summary.test.ts` | ❌ W0 | ⬜ pending |
| 3-W0-02 | W0 | 0 | SITE-02, SITE-03 | smoke stub | `npx vitest run src/utils/page.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | VIZ-01, VIZ-02, VIZ-04 | manual | visual inspection at 375px | N/A | ⬜ pending |
| 3-01-02 | 01 | 1 | VIZ-03 | unit | `npx vitest run src/utils/summary.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | SITE-01 | manual | visual inspection of Estonian text | N/A | ⬜ pending |
| 3-01-04 | 01 | 1 | SITE-02, SITE-03 | smoke | `npx vitest run src/utils/page.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | SITE-04 | smoke | check `dist/og-preview.png` exists after build | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest` — no test framework currently present
- [ ] `src/utils/summary.ts` — extract summary sentence logic as a pure function (testable outside Astro)
- [ ] `src/utils/summary.test.ts` — covers VIZ-03 including zero/null edge cases (3 test cases)
- [ ] `src/utils/page.test.ts` — reads `dist/index.html` after build and asserts attribution links present (smoke for SITE-02, SITE-03)
- [ ] `vitest.config.ts` — minimal vitest config

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dual-line chart renders both datasets | VIZ-01 | Canvas rendering not easily unit-testable | Open site, verify two lines visible |
| Tooltip shows both series on hover/tap | VIZ-02 | Requires browser interaction | Hover a data point; confirm tooltip shows both scam and pension EUR values |
| Chart usable on 375px mobile | VIZ-04 | Responsive layout requires visual check | Chrome DevTools → 375px iPhone SE; confirm chart fills width, labels readable |
| All UI text in Estonian | SITE-01 | Language correctness is semantic | Read headline, axis labels, tooltip labels, summary sentence, attribution, methodology |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
