const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const OUT = process.argv[2];
const WP = process.env.WP_URL || 'http://127.0.0.1:9400';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  p.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace(WP, '')); });
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('requestfailed', (r) => { if (!r.url().includes('favicon')) errors.push('failed: ' + r.url()); });
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); } };

  await step('log in', async () => {
    await p.goto(WP + '/wp-login.php');
    await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password');
    await p.click('#wp-submit'); await p.waitForSelector('#wpadminbar', { timeout: 60000 });
  });

  await step('reset to disconnected', async () => {
    await p.goto(WP + '/wp-admin/admin.php?page=mykavo');
    await p.waitForSelector('.mk-welcome, .mk-hero, .mk-top');
    if (await p.locator('.mk-welcome').count()) return;
    await p.evaluate(() => wp.apiFetch({ path: '/mykavo/v1/disconnect', method: 'POST' }));
  });

  await step('front end is untouched', async () => {
    const r = await ctx.newPage(); const urls = [];
    r.on('request', (q) => urls.push(q.url()));
    await r.goto(WP + '/', { waitUntil: 'networkidle' });
    const html = await r.content();
    const hits = (html.match(/mykavo/gi) || []).length;
    const assetHits = urls.filter((u) => /mykavo/i.test(u));
    console.log('     homepage "mykavo" mentions:', hits, '| requests to plugin files:', assetHits.length);
    await r.close();
  });

  await step('plugins screen notice', async () => { await p.goto(WP + '/wp-admin/plugins.php'); await p.screenshot({ path: OUT + '/01-plugins.png', clip: { x: 0, y: 0, width: 1440, height: 420 } }); });

  await step('welcome screen', async () => { await p.goto(WP + '/wp-admin/admin.php?page=mykavo'); await p.waitForSelector('.mk-welcome'); await p.screenshot({ path: OUT + '/02-welcome.png', fullPage: true }); });

  await step('connect round trip', async () => {
    await p.click('text=Connect to MyKavo');
    await p.waitForSelector('.mk-hero', { timeout: 60000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: OUT + '/03-overview.png', fullPage: true });
  });

  await step('menu badge shows urgent count', async () => {
    await p.goto(WP + '/wp-admin/admin.php?page=mykavo');
    await p.waitForSelector('.mk-hero');
    const badge = await p.locator('#adminmenu .awaiting-mod .pending-count').first().textContent();
    console.log('     badge:', badge);
  });

  await step('change drawer with before/after', async () => {
    await p.click('.mk-row[data-id="chg0000000001"]');
    await p.waitForSelector('#mk-slider img');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: OUT + '/04-drawer.png' });
    await p.locator('.mk-range').fill('78');
    await p.waitForTimeout(200);
    await p.screenshot({ path: OUT + '/05-drawer-slider.png' });
    await p.click('[data-mode="diff"]'); await p.waitForTimeout(700);
    await p.screenshot({ path: OUT + '/06-drawer-diff.png' });
  });

  await step('accept as new baseline', async () => {
    await p.click('[data-action="baseline"]');
    await p.waitForSelector('.mk-toast');
    await p.waitForTimeout(900);
    await p.screenshot({ path: OUT + '/07-after-baseline.png' });
  });

  await step('values change (noindex)', async () => {
    await p.click('.mk-row[data-id="chg0000000002"]');
    await p.waitForSelector('.mk-values'); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + '/08-drawer-values.png' });
    await p.keyboard.press('Escape');
  });

  await step('changes tab + filter', async () => {
    await p.click('[data-tab="changes"]'); await p.waitForSelector('.mk-toolbar .mk-chip');
    await p.waitForSelector('.mk-list, .mk-empty'); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + '/09-changes.png', fullPage: true });
    await p.click('[data-status="all"]'); await p.waitForTimeout(800);
    await p.click('[data-sev="CRITICAL"]'); await p.waitForTimeout(200);
    await p.screenshot({ path: OUT + '/10-changes-all-critical.png', fullPage: true });
  });

  await step('broken links drawer', async () => {
    await p.click('[data-sev=""]'); await p.waitForTimeout(100);
    await p.click('.mk-row[data-id="chg0000000004"]'); await p.waitForSelector('.mk-links');
    await p.screenshot({ path: OUT + '/11-drawer-links.png' });
    await p.click('.mk-close');
  });

  await step('scans tab', async () => { await p.click('[data-tab="scans"]'); await p.waitForSelector('.mk-table'); await p.screenshot({ path: OUT + '/12-scans.png', fullPage: true }); });
  await step('pages tab', async () => { await p.click('[data-tab="pages"]'); await p.waitForSelector('.mk-list'); await p.screenshot({ path: OUT + '/13-pages.png', fullPage: true }); });

  await step('run scan with live progress', async () => {
    await p.click('[data-tab="overview"]'); await p.waitForSelector('.mk-hero');
    await p.click('[data-act="scan"]');
    await p.waitForSelector('.mk-tone-busy', { timeout: 20000 });
    await p.waitForTimeout(9000);
    await p.screenshot({ path: OUT + '/14-scanning.png', clip: { x: 160, y: 0, width: 1280, height: 520 } });
    await p.waitForSelector('.mk-toast', { timeout: 60000 });
    console.log('     toast:', await p.locator('.mk-toast').textContent());
  });

  const probe = (q) => p.request.get(WP + '/wp-content/mu-plugins/probe/fake-update.php' + (q || ''));

  await step('safe updates: an update is checked and attributed', async () => {
    const r = await probe(); if (!(await r.text()).includes('simulated')) throw new Error('probe not mounted');
    await p.goto(WP + '/wp-admin/admin.php?page=mykavo'); await p.waitForSelector('.mk-hero');
    await p.click('[data-tab="updates"]'); await p.waitForSelector('.mk-update');
    console.log('     entry:', (await p.locator('.mk-update-title').first().textContent()).trim(), '|', (await p.locator('.mk-verdict').first().textContent()).trim());
    await p.screenshot({ path: OUT + '/20-updates-checking.png', fullPage: true });
    await p.waitForSelector('.mk-update:first-child .mk-verdict-bad', { timeout: 90000 });
    console.log('     verdict:', (await p.locator('.mk-verdict').first().textContent()).trim());
    await p.screenshot({ path: OUT + '/21-updates-verdict.png', fullPage: true });
    await p.click('[data-act="update-changes"]'); await p.waitForSelector('.mk-filter-note');
    await p.waitForSelector('.mk-row'); console.log('     changes from that update:', await p.locator('.mk-row').count());
    await p.screenshot({ path: OUT + '/22-update-changes.png', fullPage: true });
    await p.click('.mk-row'); await p.waitForSelector('.mk-attrib'); await p.waitForTimeout(800);
    console.log('     drawer says:', (await p.locator('.mk-attrib').textContent()).trim());
    await p.screenshot({ path: OUT + '/23-drawer-attribution.png' });
    await p.keyboard.press('Escape');
  });

  await step('safe updates: automatic updates are labelled', async () => {
    await probe('?auto=1');
    await p.goto(WP + '/wp-admin/admin.php?page=mykavo'); await p.waitForSelector('.mk-hero');
    await p.click('[data-tab="updates"]'); await p.waitForSelector('.mk-update');
    const meta = await p.locator('.mk-update').first().textContent();
    if (!/Automatic/.test(meta)) throw new Error('not labelled automatic: ' + meta);
    console.log('     newest entry:', (await p.locator('.mk-update-title').first().textContent()).trim());
  });

  await step('safe updates: switching checks off', async () => {
    await p.click('[data-act="toggle-updates"]'); await p.waitForSelector('.mk-switch[aria-checked="false"]');
    await probe();
    await p.reload(); await p.waitForSelector('.mk-hero'); await p.click('[data-tab="updates"]'); await p.waitForSelector('.mk-update');
    console.log('     with checks off:', (await p.locator('.mk-verdict').first().textContent()).trim());
    await p.click('[data-act="toggle-updates"]'); await p.waitForSelector('.mk-switch[aria-checked="true"]');
  });

  await step('overview shows the latest update', async () => {
    await p.click('[data-tab="overview"]'); await p.waitForSelector('.mk-hero');
    await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + '/24-overview-safe-updates.png', fullPage: true });
  });

  await step('woocommerce: store pages guarded in one click', async () => {
    await p.goto(WP + '/wp-admin/admin.php?page=mykavo'); await p.waitForSelector('.mk-store');
    console.log('     store pages not monitored:', await p.locator('.mk-store .is-off').count());
    await p.screenshot({ path: OUT + '/25-store-guard.png', fullPage: true });
    await p.click('[data-act="guard-store"]'); await p.waitForSelector('.mk-store-ok', { timeout: 30000 });
    console.log('     after:', (await p.locator('.mk-store-ok').textContent()).trim(), '|', (await p.locator('.mk-toast').textContent()).trim());
  });

  await step('pages tab: monitor another page', async () => {
    await p.click('[data-tab="pages"]'); await p.waitForSelector('.mk-add-page');
    const before = await p.locator('.mk-list li').count();
    await p.fill('#mk-add-url', WP + '/sample-page/'); await p.click('.mk-add-page button');
    await p.waitForFunction((n) => document.querySelectorAll('.mk-list li').length > n, before, { timeout: 30000 });
    console.log('     pages:', before, '->', await p.locator('.mk-list li').count());
    await p.screenshot({ path: OUT + '/26-pages-add.png', fullPage: true });
  });

  await step('pages list: "Monitor with MyKavo" row action', async () => {
    await p.evaluate(() => wp.apiFetch({ path: '/wp/v2/pages', method: 'POST', data: { title: 'Pricing', status: 'publish' } }));
    await p.goto(WP + '/wp-admin/edit.php?post_type=page');
    const row = p.locator('tr', { has: p.locator('a.row-title', { hasText: /^Pricing$/ }) }).first();
    await row.hover(); await row.locator('.mykavo_monitor a').click();
    await p.waitForSelector('.notice-success');
    console.log('     notice:', (await p.locator('.notice-success p').first().textContent()).trim());
    await p.screenshot({ path: OUT + '/27-row-action.png', clip: { x: 0, y: 0, width: 1440, height: 520 } });
  });

  await step('plugins screen: update risk from the last check', async () => {
    await p.request.get(WP + '/wp-content/mu-plugins/probe/offer-update.php');
    await p.goto(WP + '/wp-admin/plugins.php');
    const risk = p.locator('.mykavo-risk, .mykavo-safe').first();
    await risk.waitFor({ timeout: 15000 });
    console.log('     demo shop row:', (await risk.textContent()).trim());
    await p.locator('tr[data-slug="demo-shop"]').first().screenshot({ path: OUT + '/28-plugin-risk.png' });
  });

  await step('updates screen notice', async () => {
    await p.goto(WP + '/wp-admin/update-core.php');
    console.log('     notice:', (await p.locator('.notice', { hasText: 'Safe Updates' }).first().textContent()).trim().slice(0, 60));
  });

  await step('site health test and info', async () => {
    await p.goto(WP + '/wp-admin/site-health.php');
    const t = p.locator('.health-check-accordion-trigger', { hasText: /MyKavo|monitored pages/ }).first();
    await t.waitFor({ timeout: 60000 });
    console.log('     site health:', (await t.textContent()).replace(/\s+/g, ' ').trim());
    await p.goto(WP + '/wp-admin/site-health.php?tab=debug');
    await p.waitForSelector('#health-check-accordion-block-mykavo', { state: 'attached' });
  });

  await step('dashboard widget', async () => {
    await p.goto(WP + '/wp-admin/'); await p.waitForSelector('#mykavo_status');
    await p.waitForTimeout(800);
    await p.locator('#mykavo_status').screenshot({ path: OUT + '/15-widget.png' });
  });

  await step('phone layout', async () => {
    const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    for (const c of await ctx.cookies()) await m.context().addCookies([c]);
    await m.goto(WP + '/wp-admin/admin.php?page=mykavo'); await m.waitForSelector('.mk-hero');
    await m.screenshot({ path: OUT + '/16-phone.png', fullPage: true });
    await m.click('.mk-row'); await m.waitForSelector('.mk-drawer-body h2, .mk-drawer h2'); await m.waitForTimeout(900);
    await m.screenshot({ path: OUT + '/17-phone-drawer.png' });
    const overflow = await m.evaluate(() => document.querySelector('.mk').scrollWidth > document.querySelector('.mk').clientWidth + 1);
    console.log('     app wider than screen:', overflow);
    await m.close();
  });

  await step('disconnect', async () => {
    await p.goto(WP + '/wp-admin/admin.php?page=mykavo'); await p.waitForSelector('.mk-hero');
    p.once('dialog', (d) => d.accept());
    await p.click('[data-act="menu"]');
    await p.screenshot({ path: OUT + '/18-menu.png', clip: { x: 900, y: 0, width: 540, height: 360 } });
    await p.click('[data-act="disconnect"]');
    await p.waitForSelector('.mk-welcome');
  });

  await step('an expired Connect button explains itself', async () => {
    await p.goto(WP + '/wp-admin/admin-post.php?action=mykavo_connect&_wpnonce=stale');
    await p.waitForSelector('.mk-welcome');
    const text = (await p.locator('.mk-banner').first().textContent()).trim();
    if (!/expired/.test(text)) throw new Error('no stale notice: ' + text);
    console.log('     banner:', text);
  });

  console.log('errors:', errors.length ? errors : 'none');
  await b.close();
})();
