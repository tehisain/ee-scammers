# Feature Research

**Domain:** Public data awareness / visualization website (single-chart, static, Estonian-language)
**Researched:** 2026-03-05
**Confidence:** HIGH (core chart features, accessibility, shareability); MEDIUM (data freshness UX patterns, annotation conventions)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Interactive hover tooltip on chart | Users expect to read exact values; line charts without tooltips feel broken | LOW | Show exact month, scam loss value (EUR), pension contribution value (EUR) on hover. Must work on both mouse and touch. Known Recharts issue with touch on area charts — use line chart specifically or test touch carefully. |
| Mobile-responsive chart | 50-70% of public interest content is read on phones; cramped chart = immediate abandonment | MEDIUM | Recharts/Chart.js both support responsive containers. Line charts simplify well on mobile. Reduce tick density on narrow viewports. |
| Visible data source attribution | Users distrust unlabeled data; Estonian police + Pension Centre links are credible anchors | LOW | Footer or below-chart credits with direct links to politsei.ee and pensionikeskus.ee. Without this the site looks like fabricated numbers. |
| "Last updated" / data freshness indicator | Static sites with no date signal look stale or abandoned | LOW | Show the build date (injected at CI time) prominently near the chart. Even "Andmed uuendatud: 04.03.2026" is sufficient. |
| Labeled chart axes and series legend | Two-series line chart with no labels is unreadable | LOW | Y-axis: euros (EUR or €). X-axis: month (Kuu). Legend must clearly label "Petturite kahjud" vs "II samba sissemaksed". |
| Clear page title / headline stating the point | Awareness sites must state the thesis; users should not have to infer it | LOW | A direct Estonian headline such as "Kui palju raha varastavad petturid eestlastelt?" or "Petturid vs pension" framing. |
| Readable on desktop and tablet | Minimum viable responsiveness across common viewport sizes | LOW | Recharts `<ResponsiveContainer>` handles this without custom code. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required for launch, but increase impact.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contextual annotation on chart | Lets editor call out notable events ("Uus petuskeemi laine", "rekordkuu") directly on the chart — turns numbers into a story | MEDIUM | Recharts supports `<ReferenceLine>` and `<ReferenceArea>` for vertical event markers. Manual annotation in the data file (added at build time) is simplest approach. |
| Methodology / "Kuidas me arvutame?" section | Builds trust with skeptical users; preempts "where does this data come from?" doubts; critical for a site making a comparative claim | LOW | A collapsed accordion or a separate short section explaining: what "petturite kahjud" includes (police reported totals), what "II sammas" figures cover, and known data limitations (under-reporting, lag). |
| Social sharing image (Open Graph) | When shared on Facebook, Twitter/X, Telegram, Discord — a compelling preview image with chart data dramatically increases clicks vs a generic blank card | LOW | Static OG image (pre-generated at build time showing the current chart state) is sufficient. Dynamic OG images (Satori, Vercel OG) add complexity without meaningful gain for v1. |
| Shareable direct URL with chart state preserved | Users sharing from mobile want to send the exact view they're looking at | LOW | For a single static chart this is automatic — the URL is always the chart. No special work needed beyond a canonical og:url. |
| Plain-text summary below chart | Screen-reader users and low-vision users need the takeaway stated as prose, not just visually | LOW | One or two Estonian sentences summarizing the current data state: "Viimase 12 kuu jooksul kaotasid eestlased petturitele X miljonit eurot — see on Y% II samba sama perioodi sissemaksetest." Doubles as SEO content. |
| Downloadable data (CSV) | Journalists, researchers, and curious citizens expect raw data access; increases credibility | LOW | The JSON/CSV built at CI time can be linked directly. One `<a href="data.csv">` link. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for a focused v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| English translation | Seems inclusive; international audience | Doubles content maintenance burden; the comparison is specifically meaningful to Estonians who know what II sammas is; translation risks losing the emotional framing | Estonian-only as explicit scope decision. Add `lang="et"` to `<html>` for correctness. |
| Date range filter / zoom controls | "Let users explore the data" | Adds significant JS complexity; for a single comparison message, the full historical view is the point — filtering dilutes the narrative | Show all available months by default. The chart itself IS the exploration. |
| Other comparison metrics (salary, state budget) | "What if we also compared to..." | Each additional series requires a new data source, new scraping logic, new framing copy; pension pillar is the right emotionally resonant frame | Keep the pension comparison exclusive in v1. Validate it works before expanding. |
| Real-time or live data | "Shouldn't it be live?" | Police data is not published in real time; nightly rebuild matches the actual data publication cadence; real-time adds infra complexity with zero benefit | Nightly CI rebuild is the correct architecture for this data cadence. |
| User comments / reaction features | Social engagement | Moderation burden; off-topic for a single-purpose awareness site; adds backend requirement to a static site | Social sharing handles community reaction. Keep the site serverless. |
| Dark mode toggle | Modern UX expectation | Adds CSS complexity; chart colors must be re-validated for both themes; for a v1 awareness site this is pure polish cost | Respect `prefers-color-scheme` media query with a single CSS tweak if desired, but don't build a toggle. |
| Animated chart entrance (data reveal) | Looks impressive in demos | Animation can make tooltips and accessibility worse; adds chart library configuration; no evidence it improves comprehension for public data sites | Static chart renders faster and is more accessible. Libraries support disabling animation with one flag. |
| Cookie consent / analytics banner | "We should know how many visitors we have" | Adds legal complexity (GDPR applies in Estonia); cookie banners degrade UX; analytics is not the goal of a public awareness site | Use Plausible or Fathom (cookieless, GDPR-compliant by default) with no banner required, or skip analytics entirely in v1. |

## Feature Dependencies

```
[Labeled axes + legend]
    └──required by──> [Readable chart]

[Data source attribution]
    └──required by──> [User trust in numbers]
                          └──required by──> [Site credibility / shareability]

[Last updated indicator]
    └──enhances──> [User trust in numbers]

[Methodology section]
    └──enhances──> [User trust in numbers]

[Plain-text summary]
    └──enhances──> [Accessibility]
    └──enhances──> [Social sharing effectiveness]

[Open Graph image]
    └──enhances──> [Social sharing effectiveness]

[Tooltip (hover + touch)]
    └──requires──> [Responsive chart container]

[Downloadable CSV]
    └──requires──> [Build-time data file already exists] (already true — data file is produced by CI scraper)

[Chart annotation / ReferenceLine]
    └──requires──> [Manual event log in data or config file]
```

### Dependency Notes

- **Labeled axes + legend required by readable chart:** A two-series line chart is meaningless without both axis labels and a series legend. These are prerequisites, not enhancements.
- **Data source attribution required by user trust:** Estonian public is appropriately skeptical of claims about government-adjacent statistics. Unattributed numbers will be dismissed or shared with suspicion.
- **Last updated indicator enhances trust:** Without a date, a nightly-built static site looks abandoned. A build-time timestamp costs almost nothing.
- **Tooltip requires responsive container:** Tooltip positioning logic breaks on overflow when the chart is not contained in a responsive wrapper. Always wrap in `<ResponsiveContainer>` first.
- **Open Graph image is independent:** Can be added after launch with zero effect on the chart itself. A static screenshot works; no dynamic generation needed in v1.

## MVP Definition

### Launch With (v1)

Minimum viable product — what is needed to make the awareness message credible and shareable.

- [ ] Double line chart (scam losses vs pension contributions, monthly, all available months) — core value proposition
- [ ] Interactive tooltips on hover AND touch — required for exact value reading on mobile
- [ ] Labeled axes, series legend, chart title in Estonian — chart is unreadable without these
- [ ] "Andmed uuendatud" timestamp (injected at build time) — prevents site from looking stale
- [ ] Data source attribution with links to politsei.ee and pensionikeskus.ee — non-negotiable for trust
- [ ] Methodology / explanation section (Estonian prose, one short paragraph) — preempts the "is this real?" question
- [ ] Open Graph meta tags (og:title, og:description, og:image, og:url) with a static preview image — required for social sharing to look good on Facebook/Messenger/Telegram
- [ ] `lang="et"` on `<html>` element — correct browser/screen-reader behavior, one attribute

### Add After Validation (v1.x)

Features to add once core chart is working and shared publicly.

- [ ] Plain-text summary paragraph below chart — add when real data reveals a compelling number worth stating in prose
- [ ] Downloadable CSV link — add when CI data file format is stable
- [ ] Chart annotation for notable months — add when a genuinely notable event appears in the data (e.g. record-high month)
- [ ] Plausible/Fathom cookieless analytics — add if there is interest in measuring reach

### Future Consideration (v2+)

Features to defer until the concept is validated.

- [ ] Additional comparison metrics — only if the pension framing is validated and additional context adds clarity
- [ ] Date range selection — only if data spans 3+ years and the full view becomes overwhelming
- [ ] Dynamic OG image generation (Satori) — only if sharing volume justifies the complexity

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Double line chart (two series) | HIGH | LOW | P1 |
| Hover + touch tooltips | HIGH | LOW | P1 |
| Axis labels + legend | HIGH | LOW | P1 |
| Last updated timestamp | HIGH | LOW | P1 |
| Data source attribution | HIGH | LOW | P1 |
| Methodology section | HIGH | LOW | P1 |
| Open Graph meta tags + static OG image | HIGH | LOW | P1 |
| `lang="et"` + alt text | MEDIUM | LOW | P1 |
| Plain-text summary paragraph | MEDIUM | LOW | P2 |
| Downloadable CSV | MEDIUM | LOW | P2 |
| Chart annotation (ReferenceLine) | MEDIUM | MEDIUM | P2 |
| Cookieless analytics | LOW | LOW | P3 |
| Dark mode (media query only, no toggle) | LOW | LOW | P3 |
| Date range filter | LOW | HIGH | P3 |
| Dynamic OG image generation | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

These are public data awareness / journalism sites that represent the UX standard Estonian users are implicitly comparing to.

| Feature | RIA kuberturvalisus report (ria.ee) | UK Finance Fraud Report sites | Our Approach |
|---------|------|------|------|
| Tooltips | Static tables, no interactive charts | PDF-based, no interactivity | Interactive tooltips on hover + touch — this is a differentiator |
| Mobile | Responsive page layout but charts are images or PDFs | PDF, not mobile-optimized | Fully responsive SVG chart — better than incumbent |
| Data attribution | Author and report title | Publisher name | Direct links to source pages on politsei.ee and pensionikeskus.ee |
| Methodology | Buried in report body | Footnotes | Short visible section — more prominent than typical |
| Social sharing | Generic OG from CMS | None | Custom OG image with chart preview — above average |
| Data freshness | Report publication date | Annual report date | Nightly build date shown — more frequent than competitors |
| Emotional framing | Informational | Informational | Comparison to pension contributions — this is the unique framing |

## Sources

- [U.S. Web Design System — Data Visualizations](https://designsystem.digital.gov/components/data-visualizations/) — government accessibility and UX standards; HIGH confidence
- [Highcharts: 10 Guidelines for DataViz Accessibility](https://www.highcharts.com/blog/tutorials/10-guidelines-for-dataviz-accessibility/) — WCAG for charts; HIGH confidence
- [Smashing Magazine: From Data To Decisions — UX for Dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/) — data freshness UX patterns; MEDIUM confidence (enterprise-focused but patterns transfer)
- [DataSense: Best Practices for Adapting Data Visualization for Mobile](https://datasense.to/2025/05/07/best-practices-for-adapting-data-visualization-for-the-mobile-devices/) — mobile-first patterns; MEDIUM confidence
- [Recharts Tooltip API](https://recharts.github.io/en-US/api/Tooltip/) — library capability confirmation; HIGH confidence
- [Recharts GitHub Issue #444 — touch tooltip on area charts](https://github.com/recharts/recharts/issues/444) — known mobile touch limitation; HIGH confidence
- [Ahrefs: Open Graph Meta Tags Guide](https://ahrefs.com/blog/open-graph-meta-tags/) — social sharing implementation; HIGH confidence
- [RIA: Surge in scams costs Estonian people 29 million euros](https://www.ria.ee/en/surge-scams-costs-estonian-people-29-million-euros) — confirms Estonian scam data exists and is published; HIGH confidence
- [A11Y Collective: Accessible Charts Checklist](https://www.a11y-collective.com/blog/accessible-charts/) — WCAG accessibility for charts; HIGH confidence

---
*Feature research for: Eesti petturite statistika — public scam loss awareness visualization*
*Researched: 2026-03-05*
