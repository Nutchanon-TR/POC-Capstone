// Preview-only verification. Opens a private headless browser; writes screenshots here.
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/USER HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const root = __dirname;
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'Catalog.html')).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const images = await page.locator('img').evaluateAll(nodes => nodes.map(img => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 })));
    if (images.some(img => !img.loaded)) throw Error('Unloaded images: ' + JSON.stringify(images));
    if (await page.locator('.frame-cell').count() !== 24) throw Error('Expected 24 labeled frames');
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')));
    for (const link of links) {
      if (!link.startsWith('#') && !fs.existsSync(path.resolve(root, link))) throw Error('Missing linked file: ' + link);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw Error('Desktop horizontal overflow');
    await page.screenshot({ path: path.join(root, 'CatalogPreview.png'), fullPage: true });
    await page.locator('#character').screenshot({ path: path.join(root, 'CharacterPreview.png') });
    await page.locator('#direction').selectOption('12');
    if ((await page.locator('#frame-label').textContent()) !== 'frame 12') throw Error('Direction preview did not update');
    await page.locator('#play').click();
    await page.waitForFunction(() => document.getElementById('frame-label').textContent !== 'frame 12');
    await page.locator('#play').click();
    if ((await page.locator('#frame-label').textContent()) !== 'frame 12') throw Error('Idle reset did not update');
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (mobileOverflow) throw Error('Mobile horizontal overflow');
    if (errors.length) throw Error('Browser errors: ' + errors.join('; '));
    await page.screenshot({ path: path.join(root, 'CatalogMobilePreview.png'), fullPage: true });
    console.log(JSON.stringify({ images: images.length, frameCards: 24, links: links.length, desktopOverflow: overflow, mobileOverflow, animationPreview: 'passed', browserErrors: errors, screenshots: ['CatalogPreview.png', 'CharacterPreview.png', 'CatalogMobilePreview.png'] }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
