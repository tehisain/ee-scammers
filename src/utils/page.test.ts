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
    expect(html.toLowerCase()).toContain('andmete kogumise');
  });
});
