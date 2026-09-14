import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT_DIR = process.env.SHOT_DIR ?? './screenshots';
mkdirSync(SHOT_DIR, { recursive: true });

const BASE = process.env.STOREFRONT_URL ?? 'http://localhost:3000';

/* CHROMIUM_PATH lets CI point at a preinstalled browser instead of running
   `npx playwright install`. Unset, Playwright resolves its own download. */
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
});

const pages = [
  ['home',    '/'],
  ['shop',    '/shop'],
  ['product', '/product/idli-podi'],
  ['search',  '/search?q=podi'],
  ['cart',    '/cart'],
];

// Phone first — this is a mobile-first build, so that is the real test.
for (const [name, path] of pages) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  // Measure BEFORE the screenshot: a fullPage capture temporarily resizes the
  // viewport, and measuring after it reports phantom overflow.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: `${SHOT_DIR}/mobile-${name}.png`, fullPage: true });
  console.log(`mobile ${name.padEnd(8)} overflow=${overflow}px errors=${errors.length}${errors.length ? ' :: ' + errors.slice(0,2).join(' | ') : ''}`);
  await ctx.close();
}

for (const [name, path] of [['home','/'],['product','/product/idli-podi']]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/desktop-${name}.png`, fullPage: true });
  console.log(`desktop ${name}`);
  await ctx.close();
}

await browser.close();
