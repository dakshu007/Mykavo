const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  require('fs').mkdirSync(__dirname + '/media', { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + __dirname + '/sample-page.html');
  await p.screenshot({ path: __dirname + '/media/before.png', fullPage: true });
  await p.evaluate(() => { document.getElementById('cta').remove(); document.getElementById('h').textContent = 'Fresh coffee, delivered.'; });
  await p.screenshot({ path: __dirname + '/media/after.png', fullPage: true });
  await p.evaluate(() => {
    document.body.style.filter = 'grayscale(1) opacity(.35)';
    const mk = (t,l,w,h) => { const d=document.createElement('div'); d.style.cssText=`position:absolute;top:${t}px;left:${l}px;width:${w}px;height:${h}px;background:rgba(229,72,77,.75);filter:none`; document.documentElement.appendChild(d); };
    mk(130,60,560,130); mk(410,60,200,56);
  });
  await p.screenshot({ path: __dirname + '/media/diff.png', fullPage: true });
  await b.close();
})();
