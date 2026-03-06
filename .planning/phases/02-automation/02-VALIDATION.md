---
phase: 2
slug: automation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — smoke checks are shell `grep` assertions (no test runner needed) |
| **Config file** | None — Wave 0 creates workflow files |
| **Quick run command** | `grep -q "liskin/gh-workflow-keepalive" .github/workflows/scrape.yml && grep -q "actions/deploy-pages@v4" .github/workflows/deploy.yml && echo "OK"` |
| **Full suite command** | See Per-Task Verification Map greps below |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run quick run command above
- **After every plan wave:** Run all greps in Per-Task Verification Map
- **Before `/gsd:verify-work`:** All grep checks pass + manual checks (see Manual-Only Verifications)
- **Max feedback latency:** ~1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | PIPE-04 | smoke | `grep -q "liskin/gh-workflow-keepalive" .github/workflows/scrape.yml` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | PIPE-04 | smoke | `grep -q "event_name == 'schedule'" .github/workflows/scrape.yml` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | PIPE-04 | smoke | `grep -q "0 3 \* \* \*" .github/workflows/scrape.yml` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | SITE-05 | smoke | `grep -q "pages: write" .github/workflows/deploy.yml` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | SITE-05 | smoke | `grep -q "actions/deploy-pages@v4" .github/workflows/deploy.yml` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.github/workflows/scrape.yml` — stubs for PIPE-04
- [ ] `.github/workflows/deploy.yml` — stubs for SITE-05
- [ ] No test framework install needed — checks are shell greps, not test runner assertions

*Wave 0 creates the workflow files that the smoke checks verify.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cron actually fires at 03:00 UTC | PIPE-04 | Requires GitHub Actions runtime | Trigger `workflow_dispatch` on `scrape.yml` and verify it completes |
| Pages deploys site successfully | SITE-05 | Requires GitHub repository settings + runtime | Set Pages source to "GitHub Actions" in repo Settings > Pages, push a commit to main, verify site loads at public URL within 5 minutes |
| Keepalive re-enables workflow | PIPE-04 | Requires 60-day wait or GitHub API inspection | Verify `liskin/gh-workflow-keepalive` step completes without error on manual trigger |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
