---
phase: 1
slug: scrapers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None yet — project has no test framework |
| **Config file** | Wave 0 gap — no test config exists |
| **Quick run command** | `npx tsx scripts/scrape.ts` |
| **Full suite command** | `npx tsx scripts/scrape.ts && node -e "require('./src/data/chart-data.json')"` |
| **Estimated runtime** | ~60-120 seconds (live scrape) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/scrape.ts`
- **After every plan wave:** Run `npx tsx scripts/scrape.ts && node -e "require('./src/data/chart-data.json')"`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | PIPE-03 | unit | `npx tsx scripts/schema.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | PIPE-01 | integration smoke | `npx tsx scripts/scrape-police.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | PIPE-02 | integration smoke | `npx tsx scripts/scrape-pension.ts` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 2 | PIPE-03 | automated inline | `npx tsx scripts/scrape.ts` (Zod safeParse exits non-zero on failure) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/schema.ts` — Zod schema definition (covers PIPE-03 validation)
- [ ] `scripts/scrape.ts` — orchestrator entry point
- [ ] `scripts/scrape-police.ts` — police scraper module stub
- [ ] `scripts/scrape-pension.ts` — pension API module stub
- [ ] `package.json` with tsx, playwright, cheerio, zod dependencies and `"scrape"` script
- [ ] `src/data/` directory must exist before scraper writes output
- [ ] `npx playwright install chromium` — browser binary needed in dev environment

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Discovery pass — read ~10 police articles and document Estonian EUR phrasing patterns | PIPE-01 | Requires human reading of live articles to confirm regex patterns before coding | Open ~10 articles on politsei.ee/et/uudised/oeoepaeevainfo and record all phrasing variants containing "euro" |
| Pension type filter — F only, P only, or both? | PIPE-02 | Requires comparing live API sum against pensionikeskus.ee UI display | Fetch API with a known month, compare type F+P sum against site-displayed total |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
