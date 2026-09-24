// Stand-in for mykavo.app's /connect/wordpress + /api/wp/v1 contract, for
// driving the plugin end to end. Verifies PKCE exactly like the real server.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PORT = 9501;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = 'mkv_wp_' + crypto.randomBytes(24).toString('base64url');
const pending = new Map(); // code -> {challenge, site}
const log = [];
const now = Date.now();
const ago = (m) => new Date(now - m * 60000).toISOString();
const ahead = (m) => new Date(now + m * 60000).toISOString();

const changes = [
  { id: 'chg0000000001', title: '"Add to cart" button is missing', severity: 'CRITICAL', category: 'CONVERSION', status: 'NEW', detectedAt: ago(42), pagePath: '/shop/ethiopia-yirgacheffe', description: 'The monitored element "Add to cart" (#cta) was not found on the page.', previousValue: 'Add to cart', currentValue: null, images: true, diff: true },
  { id: 'chg0000000002', title: 'Page changed from index to noindex', severity: 'CRITICAL', category: 'SEO', status: 'NEW', detectedAt: ago(42), pagePath: '/subscribe', description: 'Search engines are now told not to index this page.', previousValue: 'index, follow', currentValue: 'noindex, nofollow', images: false },
  { id: 'chg0000000003', title: 'Title tag changed', severity: 'MEDIUM', category: 'SEO', status: 'REVIEWED', detectedAt: ago(42), pagePath: '/', description: 'The page title shown in search results changed.', previousValue: 'Northwind Coffee | Single-origin beans, roasted this week', currentValue: 'Northwind Coffee | Fresh coffee, delivered', images: false },
  { id: 'chg0000000004', title: '3 internal links became broken', severity: 'HIGH', category: 'LINKS', status: 'NEW', detectedAt: ago(42), pagePath: '/about', description: 'Links on this page now return errors.', previousValue: null, currentValue: null, images: false, brokenLinks: [ { url: 'https://northwind-coffee.test/wholesale', status: 404, pageCount: 2 }, { url: 'https://northwind-coffee.test/careers', status: 404, pageCount: 1 }, { url: 'https://northwind-coffee.test/blog/roasting-guide', status: 500, pageCount: 1 } ] },
  { id: 'chg0000000005', title: 'Hero section changed visually (18.4% of the page)', severity: 'LOW', category: 'VISUAL', status: 'NEW', detectedAt: ago(42), pagePath: '/shop/ethiopia-yirgacheffe', description: 'A visible part of the page looks different from the approved baseline.', previousValue: null, currentValue: null, images: true, diff: true },
  { id: 'chg0000000006', title: 'Google Tag Manager script added', severity: 'INFO', category: 'SCRIPT', status: 'APPROVED', detectedAt: ago(60 * 26), pagePath: '/', description: 'A known third-party script was added.', previousValue: null, currentValue: 'www.googletagmanager.com/gtm.js', images: false },
];
let scans = [
  { id: 'scn0000000003', status: 'COMPLETED', triggerType: 'SCHEDULED', createdAt: ago(45), startedAt: ago(45), completedAt: ago(42), pagesRequested: 8, pagesScanned: 8, pagesFailed: 0, changesDetected: 5, highestSeverity: 'CRITICAL' },
  { id: 'scn0000000002', status: 'COMPLETED', triggerType: 'SCHEDULED', createdAt: ago(60 * 25), startedAt: ago(60 * 25), completedAt: ago(60 * 25 - 3), pagesRequested: 8, pagesScanned: 8, pagesFailed: 0, changesDetected: 1, highestSeverity: 'INFO' },
  { id: 'scn0000000001', status: 'PARTIAL', triggerType: 'BASELINE', createdAt: ago(60 * 49), startedAt: ago(60 * 49), completedAt: ago(60 * 49 - 4), pagesRequested: 8, pagesScanned: 7, pagesFailed: 1, changesDetected: 0, highestSeverity: null },
];
let running = null;
const pages = ['/', '/shop', '/shop/ethiopia-yirgacheffe', '/subscribe', '/about', '/cart', '/checkout', '/contact'];
const isOpen = (c) => c.status === 'NEW' || c.status === 'REVIEWED';
const scanOf = (c) => scans.find((s) => s.id === (c.scanId || 'scn0000000003')) || {};
const listItem = (c) => ({ id: c.id, title: c.title, severity: c.severity, category: c.category, status: c.status, detectedAt: c.detectedAt, websiteId: 'web1', websiteName: 'Northwind Coffee', pagePath: c.pagePath, scanId: c.scanId || 'scn0000000003', afterUpdate: scanOf(c).triggerType === 'DEPLOY' ? scanOf(c).note : null });
const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
const scanItem = (s) => ({ ...s, websiteId: 'web1', websiteName: 'Northwind Coffee', websiteUrl: 'https://northwind-coffee.test' });

function tick() {
  if (!running) return;
  const secs = (Date.now() - running.t0) / 1000;
  running.scan.pagesScanned = Math.min(8, Math.floor(secs / 2.5));
  running.scan.status = 'RUNNING';
  if (running.scan.pagesScanned >= 8) {
    const deploy = running.scan.triggerType === 'DEPLOY';
    Object.assign(running.scan, { status: 'COMPLETED', completedAt: new Date().toISOString(), changesDetected: deploy ? 1 : 0, highestSeverity: deploy ? 'CRITICAL' : null });
    if (deploy) changes.unshift({ id: 'chg' + Date.now(), scanId: running.scan.id, title: 'Checkout button text changed', severity: 'CRITICAL', category: 'CONVERSION', status: 'NEW', detectedAt: new Date().toISOString(), pagePath: '/checkout', description: 'The monitored element "Place order" changed its text.', previousValue: 'Place order', currentValue: 'Proceed', images: true, diff: true });
    running = null;
  }
}

function site() {
  tick();
  const open = changes.filter(isOpen);
  const by = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  open.forEach((c) => by[c.severity]++);
  const top = [...open].sort((a, b) => rank[b.severity] - rank[a.severity]).filter((c) => rank[c.severity] >= 1).slice(0, 5).map(listItem);
  const highest = open.length ? open.reduce((a, c) => (rank[c.severity] > rank[a] ? c.severity : a), 'INFO') : null;
  return {
    website: { id: 'web1', name: 'Northwind Coffee', url: 'https://northwind-coffee.test', status: 'ACTIVE', scanFrequency: 'DAILY', lastScanAt: ago(42), nextScanAt: ahead(60 * 23) },
    workspace: { name: 'Northwind Studio', plan: { id: 'pro', name: 'Pro' } },
    stats: { monitoredPages: 8, baselinedPages: 8, openChanges: open.length, bySeverity: by, highestOpenSeverity: highest },
    health: { status: 'up', httpStatus: 200, checkedAt: ago(3), uptime24h: 100, avgResponseMs24h: 412, uptime7d: 99.9, checks7d: 2016, sslDaysLeft: 71, sslValidTo: ahead(60 * 24 * 71) },
    topChanges: top,
    recentScans: scans.slice(0, 5).map(scanItem),
    scanInProgress: running ? { scanId: running.scan.id, status: running.scan.status, pagesRequested: 8, pagesScanned: running.scan.pagesScanned } : null,
    capabilities: running ? { canRunManualScan: false, manualScanBlockedReason: 'A scan is already running.', updateChecks: true } : { canRunManualScan: true, manualScanBlockedReason: null, updateChecks: true },
    links: { website: BASE + '/dashboard/websites/web1', changes: BASE + '/dashboard/changes', pages: BASE + '/dashboard/websites/web1/pages', notifications: BASE + '/dashboard/notifications', billing: BASE + '/dashboard/billing' },
  };
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => resolve(d)); });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  log.push(`${req.method} ${url.pathname}${url.search}`);
  fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `${new Date().toISOString()} ${req.method} ${url.pathname}\n`);

  if (url.pathname === '/connect/wordpress') {
    const back = new URL(url.searchParams.get('return'));
    const code = crypto.randomBytes(24).toString('base64url');
    pending.set(code, { challenge: url.searchParams.get('challenge'), site: url.searchParams.get('site') });
    fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `   connect params: ${[...url.searchParams.keys()].join(',')} site=${url.searchParams.get('site')}\n`);
    back.searchParams.set('mykavo_code', code);
    back.searchParams.set('mykavo_state', url.searchParams.get('state'));
    res.writeHead(302, { location: back.toString() });
    return res.end();
  }

  if (url.pathname === '/api/wp/v1/connect/exchange' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const p = pending.get(body.code);
    const ok = p && crypto.createHash('sha256').update(body.verifier || '').digest('base64url') === p.challenge;
    fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `   exchange pkce_ok=${!!ok} site=${body.site}\n`);
    if (!ok) return json(res, 400, { error: 'This connect link expired or was already used.', code: 'INVALID_GRANT' });
    pending.delete(body.code);
    return json(res, 200, { token: TOKEN, website: { id: 'web1', name: 'Northwind Coffee', url: 'https://northwind-coffee.test' }, workspace: { name: 'Northwind Studio' }, dashboardUrl: BASE + '/dashboard/websites/web1' });
  }

  if (url.pathname === '/api/wp/v1/media') {
    const file = { shot_before: 'before.png', shot_after: 'after.png', diff: 'diff.png' }[url.searchParams.get('f')];
    if (!file) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'image/png' });
    return res.end(fs.readFileSync(path.join(__dirname, 'media', file)));
  }

  if (url.pathname.startsWith('/api/wp/v1/')) {
    if (req.headers.authorization !== 'Bearer ' + TOKEN) return json(res, 401, { error: 'not connected', code: 'NOT_CONNECTED' });
    const rest = url.pathname.slice('/api/wp/v1'.length);
    if (rest === '/site') return json(res, 200, site());
    if (rest === '/changes') {
      const all = url.searchParams.get('status') === 'all';
      const scanFilter = url.searchParams.get('scan');
      const list = changes.filter((c) => (all || isOpen(c)) && (!scanFilter || (c.scanId || 'scn0000000003') === scanFilter)).map(listItem);
      return json(res, 200, { changes: list, total: list.length });
    }
    let m = rest.match(/^\/changes\/(\w+)$/);
    if (m) {
      const c = changes.find((x) => x.id === m[1]);
      if (!c) return json(res, 404, { error: 'Not found' });
      if (req.method === 'PATCH') {
        const { action } = JSON.parse(await readBody(req));
        c.status = { review: 'REVIEWED', approve: 'APPROVED', ignore: 'IGNORED', resolve: 'RESOLVED', reopen: 'NEW' }[action];
        return json(res, 200, { change: { id: c.id, status: c.status } });
      }
      return json(res, 200, { change: {
        id: c.id, title: c.title, description: c.description, severity: c.severity, category: c.category, changeType: 'x', status: c.status,
        detectedAt: c.detectedAt, previousValue: c.previousValue, currentValue: c.currentValue, brokenLinks: c.brokenLinks || [],
        pageUrl: 'https://northwind-coffee.test' + c.pagePath, pageName: null, canUpdateBaseline: c.category !== 'LINKS',
        images: { before: c.images ? BASE + '/api/wp/v1/media?f=shot_before' : null, after: c.images ? BASE + '/api/wp/v1/media?f=shot_after' : null, diff: c.diff ? BASE + '/api/wp/v1/media?f=diff' : null },
        dashboardUrl: BASE + '/dashboard/changes/' + c.id,
        foundBy: { scanId: scanOf(c).id, triggerType: scanOf(c).triggerType, note: scanOf(c).note || null, at: scanOf(c).createdAt } } });
    }
    m = rest.match(/^\/changes\/(\w+)\/baseline$/);
    if (m && req.method === 'POST') {
      const c = changes.find((x) => x.id === m[1]);
      changes.filter((x) => x.pagePath === c.pagePath && isOpen(x)).forEach((x) => (x.status = 'APPROVED'));
      return json(res, 200, { baselineVersion: 4, approvedChanges: 2 });
    }
    if (rest === '/updates' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req) || '{}');
      const it = (body.items || [])[0] || {};
      const note = (body.trigger === 'auto' ? 'Auto-updated ' : 'Updated ') + (it.from && it.to ? `${it.name} ${it.from} → ${it.to}` : it.name) + ((body.items || []).length > 1 ? ` and ${body.items.length - 1} more` : '');
      fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `   update report: ${JSON.stringify(body)}\n`);
      if (running) return json(res, 200, { note, scan: { id: running.scan.id, status: 'RUNNING' }, reason: 'BUSY' });
      const scan = { id: 'scn' + Date.now(), status: 'QUEUED', triggerType: 'DEPLOY', note, createdAt: new Date().toISOString(), startedAt: null, completedAt: null, pagesRequested: 8, pagesScanned: 0, pagesFailed: 0, changesDetected: 0, highestSeverity: null };
      scans.unshift(scan);
      running = { scan, t0: Date.now() };
      return json(res, 201, { note, scan: { id: scan.id, status: 'QUEUED' } });
    }
    if (rest === '/scans' && req.method === 'POST') {
      if (running) return json(res, 409, { error: 'A scan is already in progress for this website.', scanId: running.scan.id });
      const scan = { id: 'scn' + Date.now(), status: 'QUEUED', triggerType: 'MANUAL', createdAt: new Date().toISOString(), startedAt: null, completedAt: null, pagesRequested: 8, pagesScanned: 0, pagesFailed: 0, changesDetected: 0, highestSeverity: null };
      scans.unshift(scan);
      running = { scan, t0: Date.now() };
      return json(res, 201, { scan: { id: scan.id, status: scan.status } });
    }
    if (rest === '/scans') { tick(); return json(res, 200, { scans: scans.map(scanItem) }); }
    if (rest === '/pages') {
      return json(res, 200, { pages: pages.map((p, i) => ({ id: 'pg' + i, url: 'https://northwind-coffee.test' + p, name: null, enabled: true, baselineVersion: i === 2 ? 3 : 1, baselineApprovedAt: ago(60 * 49), openChanges: changes.filter((c) => c.pagePath === p && isOpen(c)).length })) });
    }
    if (rest === '/disconnect') return json(res, 200, { ok: true });
  }
  json(res, 404, { error: 'mock: no route ' + url.pathname });
}).listen(PORT, '127.0.0.1', () => console.log('mock mykavo on', BASE));
