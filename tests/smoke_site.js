const { chromium } = require('playwright');
const fs = require('fs');

const baseUrl = process.argv[2] || 'http://127.0.0.1:8124';
const pages = [
  'index.html',
  'research.html',
  'projects.html',
  'itas.html',
  'publications.html',
  'media.html',
  '404.html',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const installedBrowser = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const launchOptions = { headless: true };
  if (fs.existsSync(installedBrowser)) launchOptions.executablePath = installedBrowser;
  const browser = await chromium.launch(launchOptions);
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  for (const filename of pages) {
    const page = await desktop.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(`${baseUrl}/${filename}`, { waitUntil: 'networkidle' });
    assert(response && response.ok(), `${filename}: HTTP request failed`);
    assert((await page.locator('h1').count()) === 1, `${filename}: expected one h1`);
    assert((await page.locator('nav[aria-label="Primary navigation"] a', { hasText: 'Notes' }).count()) === 0, `${filename}: draft Notes link is visible`);
    assert(errors.length === 0, `${filename}: browser error: ${errors.join('; ')}`);
    await page.close();
  }

  const home = await desktop.newPage();
  await home.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  assert(await home.locator('.about-portrait img').evaluate((image) => image.complete && image.naturalWidth > 0), 'Home portrait did not load');
  await home.locator('[data-career-tab="brgm"]').click();
  assert(await home.locator('[data-career-panel="brgm"]').isVisible(), 'Career explorer did not switch panels');
  await home.screenshot({ path: 'tests/final-home-desktop.png', fullPage: true });

  const research = await desktop.newPage();
  await research.goto(`${baseUrl}/research.html`, { waitUntil: 'networkidle' });
  await research.locator('[data-research-theme="arctic"]').click();
  assert(await research.locator('[data-research-panel="arctic"]').isVisible(), 'Research theme explorer did not switch panels');

  const publications = await desktop.newPage();
  await publications.goto(`${baseUrl}/publications.html`, { waitUntil: 'networkidle' });
  await publications.locator('input[data-publication-search]').fill('Cape Coral');
  assert((await publications.locator('.publication-entry:visible').count()) > 0, 'Publication search returned no matching record');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobileHome = await mobile.newPage();
  await mobileHome.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await mobileHome.locator('[data-nav-toggle]').click();
  assert((await mobileHome.locator('[data-nav-toggle]').getAttribute('aria-expanded')) === 'true', 'Mobile navigation did not open');
  await mobileHome.screenshot({ path: 'tests/final-home-mobile.png', fullPage: true });

  await browser.close();
  console.log('Browser smoke test passed');
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
