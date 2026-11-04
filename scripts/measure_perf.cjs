const { chromium } = require('playwright-core');

const EXE = 'C:/Users/studi/AppData/Local/ms-playwright/chromium-1148/chrome-win/chrome.exe';

async function measure(url, { w, h, mobile, dsf }) {
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: w || 390, height: h || (mobile ? 844 : 900) },
    isMobile: !!mobile,
    hasTouch: !!mobile,
    deviceScaleFactor: dsf || (mobile ? 2.6 : 1),
  });
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(4000);
  const data = await page.evaluate(() => {
    const fcpE = performance.getEntriesByType('firstContentfulPaint');
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcpLast = fcpE.length ? fcpE[fcpE.length - 1] : null;
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      window.__lcpEntries = entries;
    });
    lcpObs.observe({ type: 'largestContentfulPaint', buffered: true });
    const lcpE = window.__lcpEntries || [];
    const slow = performance.getEntriesByType('resource')
      .filter((r) => (r.duration || 0) > 300)
      .map((r) => ({ name: (r.name || '').split('/').pop(), duration: Math.round(r.duration), size: r.transferSize || r.encodedBodySize || 0 }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 8);
    return {
      fcp: fcpLast ? { start: Math.round(fcpLast.startTime), name: fcpLast.name, size: fcpLast.size } : null,
      lcp: lcpE.length ? { start: Math.round(lcpE[lcpE.length - 1].startTime), name: lcpE[lcpE.length - 1].name, size: lcpE[lcpE.length - 1].size } : null,
      nav: nav ? { ttfb: Math.round(nav.responseStart), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) } : null,
      firstPaint: paint.map((p) => ({ name: p.name, start: Math.round(p.startTime) })),
      slowResources: slow,
    };
  });
  await page.waitForTimeout(1500);
  const lcpFinal = await page.evaluate(() => {
    const lcpE = window.__lcpEntries || performance.getEntriesByType('largestContentfulPaint');
    const last = lcpE[lcpE.length - 1];
    return last ? { start: Math.round(last.startTime), name: last.name, size: last.size } : null;
  });
  data.lcpFinal = lcpFinal;
  data.wallTimeMs = loadMs;
  await browser.close();
  return data;
}

(async () => {
  const out = {};
  out['home-mobile'] = await measure('https://simkah.web.id/', { w: 390, h: 844, mobile: true, dsf: 2.6 });
  out['home-desktop'] = await measure('https://simkah.web.id/', { w: 1440, h: 900, mobile: false, dsf: 1 });
  out['blog-mobile'] = await measure('https://simkah.web.id/blog/cara-daftar-nikah-online-simkah4', { w: 390, h: 844, mobile: true, dsf: 2.6 });
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error('ERR', e); process.exit(1); });
