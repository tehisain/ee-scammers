import { chromium } from 'playwright';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DIST = path.resolve('dist');
const PORT = 4173;
// Astro builds with base: '/ee-scammers' — strip that prefix from incoming requests
const BASE = '/ee-scammers';

// Minimal static file server for dist/
const server = http.createServer((req, res) => {
  let url = req.url ?? '/';
  // Strip base prefix so /ee-scammers/_astro/... → /_astro/...
  if (url.startsWith(BASE)) {
    url = url.slice(BASE.length) || '/';
  }
  const rel = url === '/' ? 'index.html' : url.replace(/^\//, '');
  const file = path.join(DIST, rel);
  try {
    const data = fs.readFileSync(file);
    // Serve JS files with correct content-type for ES modules
    if (file.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (file.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

await new Promise<void>(r => server.listen(PORT, r));

console.log(`OG screenshot: serving dist/ on port ${PORT}`);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1200, height: 630 }
});
const page = await context.newPage();

// Navigate directly to the index page (with base path)
await page.goto(`http://localhost:${PORT}${BASE}/`);

// Wait for Chart.js animation.onComplete sentinel (set in index.astro)
await page.waitForSelector('canvas[data-chart-ready="true"]', { timeout: 15000 });

const outPath = path.join(DIST, 'og-preview.png');
await page.screenshot({
  path: outPath,
  clip: { x: 0, y: 0, width: 1200, height: 630 }
});

console.log(`OG screenshot saved: ${outPath}`);

await browser.close();
server.close();
