# ee-scammers

A static website that visualizes how monthly scam losses in Estonia compare to second pillar pension contributions. Built with [Astro](https://astro.build/) and [Chart.js](https://www.chartjs.org/), deployed to [GitHub Pages](https://tehisain.github.io/ee-scammers/).

## How It Works

Data is collected nightly via GitHub Actions:
- **Pension contributions** — fetched live from the [Pensionikeskus API](https://www.pensionikeskus.ee)
- **Scam losses** — aggregated from police data (pre-scraped JSONL)

Both sources are merged, validated with [Zod](https://zod.dev/), and written to `src/data/chart-data.json`. Astro imports this at build time — no runtime API calls.

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build + OG image generation
npm run preview    # preview production build
npm run scrape     # refresh data from sources
npx vitest         # run tests
```

> **Note:** `npm run build` requires Playwright Chromium for OG image screenshot generation. Install it with `npx playwright install chromium`.

## License

[MIT](LICENSE)
