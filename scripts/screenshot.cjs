const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('FAILED URL:', res.status(), res.url());
    }
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));

  await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });

  // Let's inspect sections and their dimensions
  const sections = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('section, main > *').forEach(el => {
      const rect = el.getBoundingClientRect();
      list.push({
        tag: el.tagName,
        id: el.id,
        className: el.className ? el.className.toString().substring(0, 50) : '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top)
      });
    });
    return list;
  });

  console.log('SECTIONS:', JSON.stringify(sections, null, 2));

  await browser.close();
})();
