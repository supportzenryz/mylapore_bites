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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const fail = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fail.push(name);
};

console.log('\nCART FLOW — real browser, real client code, phone viewport');

await page.goto(`${BASE}/product/murukku`, { waitUntil: 'networkidle' });

// Pick the 500g variant, bump to 2, add.
await page.getByRole('button', { name: /500g/ }).click();
await page.getByRole('button', { name: 'Increase quantity' }).click();
await page.getByRole('button', { name: /Add to basket/ }).click();
await page.waitForTimeout(1000);

check('confirmation shown after adding', await page.getByText('Added to your basket.').isVisible());
await page.screenshot({ path: `${SHOT_DIR}/mobile-added.png` });

const badge = (await page.locator('.tab-count').first().textContent())?.trim();
check('tab bar badge shows 2', badge === '2', `got "${badge}"`);

await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

check('line present in basket', await page.getByText('Butter Murukku').first().isVisible());
check(
  'freshness banner explains the pre-order model',
  await page.getByText(/made fresh in Mylapore after you order/i).first().isVisible(),
);

const total = (await page.locator('.totals-row.is-total span').last().textContent())?.trim();
check('total is 2 x Rs300.00', total === '₹600.00', `got "${total}"`);
await page.screenshot({ path: `${SHOT_DIR}/mobile-cart-filled.png`, fullPage: true });

// Quantity must be repriced by the server, never computed in the browser.
await page.getByRole('button', { name: 'Increase quantity' }).first().click();
await page.waitForTimeout(900);
const total3 = (await page.locator('.totals-row.is-total span').last().textContent())?.trim();
check('server repriced after quantity change', total3 === '₹900.00', `got "${total3}"`);

// The per-variant ceiling comes from the production rule (murukku 500g = 6/order).
for (let i = 0; i < 4; i += 1) {
  const btn = page.getByRole('button', { name: /Increase quantity/ }).first();
  if (await btn.isEnabled().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}
const capped = await page
  .getByRole('button', { name: /Maximum 6 per order/ })
  .first()
  .isVisible()
  .catch(() => false);
check('stepper stops at the kitchen limit (6)', capped);

await page.getByRole('button', { name: 'Remove' }).first().click();
await page.waitForTimeout(900);
check('empty state returns after removal', await page.getByText('Your basket is empty').isVisible());
await page.screenshot({ path: `${SHOT_DIR}/mobile-cart-empty.png` });

console.log(fail.length ? `\n${fail.length} CHECK(S) FAILED\n` : '\nALL CART CHECKS PASSED\n');
await browser.close();
process.exit(fail.length ? 1 : 0);
