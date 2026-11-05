// Stand-in for mykavo.app's /connect/wordpress + /api/wp/v1 contract, for
// driving the plugin end to end. Verifies PKCE exactly like the real server.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PORT = 9501;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = process.env.MOCK_TOKEN || 'mkv_wp_' + crypto.randomBytes(24).toString('base64url');
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
// Plan features (GET /status). PAID=0 starts on the free plan; POST /__mock/plan?paid=0|1 switches.
let paid = process.env.PAID !== '0';
// POST /__mock/legacy?on=1: behave like a MyKavo from before 1.3.0 (no "rollback" action, no /status features).
let legacy = false;
let settings = { updateWindow: null };
const guard = { pages: new Set(), elements: new Set() };
// PLAN=free|starter|pro|agency picks the plan the site API reports (1.3.1 Plan tab).
let planId = process.env.PLAN || (paid ? 'pro' : 'free');
const features = () => ({
  autoRollback: paid, aiInsights: paid, pluginHealth: paid, checkoutGuard: paid, updateWindows: paid,
  instantAlerts: paid, baselineBeforeUpdate: paid, llmsSummaries: paid, redirectSuggestions: paid, watchElements: paid,
  riskHold: paid, vulnDetails: paid, vulnAutoUpdate: paid, formChecks: paid, formSubmissions: paid,
  clientReports: planId === 'agency', aiAssistants: paid,
});
const PLAN_NAMES = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };
const PLAN_PAGES = { free: 5, starter: 10, pro: 15, agency: 25 };
const elements = [];
const reportBranding = { name: 'Northwind Studio', logoUrl: null, color: '#FFD400' };
const planError = (res) => json(res, 403, { error: 'This feature is not included in your plan.', reason: 'PLAN' });
const addedPages = [];
const pages = ['/', '/shop', '/shop/ethiopia-yirgacheffe', '/subscribe', '/about', '/cart', '/checkout', '/contact'];
const isOpen = (c) => c.status === 'NEW' || c.status === 'REVIEWED';
const scanOf = (c) => scans.find((s) => s.id === (c.scanId || 'scn0000000003')) || {};
const listItem = (c) => ({ id: c.id, title: c.title, severity: c.severity, category: c.category, status: c.status, detectedAt: c.detectedAt, websiteId: 'web1', websiteName: 'Northwind Coffee', pagePath: c.pagePath, scanId: c.scanId || 'scn0000000003', afterUpdate: scanOf(c).triggerType === 'DEPLOY' ? scanOf(c).note : null });
const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
const scanItem = (s) => {
  const out = { ...s, websiteId: 'web1', websiteName: 'Northwind Coffee', websiteUrl: 'https://northwind-coffee.test' };
  delete out.isRollback;
  if (s.triggerType === 'DEPLOY') {
    const done = s.status === 'COMPLETED' || s.status === 'PARTIAL';
    out.rollback = { recommended: paid && done && s.highestSeverity === 'CRITICAL', reason: 'Critical change found after this update' };
  }
  return out;
};

function tick() {
  if (!running) return;
  const secs = (Date.now() - running.t0) / 1000;
  running.scan.pagesScanned = Math.min(8, Math.floor(secs / 2.5));
  running.scan.status = 'RUNNING';
  if (running.scan.pagesScanned >= 8) {
    const deploy = running.scan.triggerType === 'DEPLOY' && !running.scan.isRollback;
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
    workspace: { name: 'Northwind Studio', plan: { id: planId, name: PLAN_NAMES[planId], limits: { pagesPerWebsite: PLAN_PAGES[planId] }, includes: { aiAssistants: planId === 'pro' || planId === 'agency' } } },
    siteAudit: { id: 'aud1', status: 'COMPLETED', healthScore: 87, errors: 3, warnings: 14, completedAt: ago(60 * 26) },
    stats: { monitoredPages: 8, baselinedPages: 8, openChanges: open.length, bySeverity: by, highestOpenSeverity: highest },
    health: { status: 'up', httpStatus: 200, checkedAt: ago(3), uptime24h: 100, avgResponseMs24h: 412, uptime7d: 99.9, checks7d: 2016, sslDaysLeft: 71, sslValidTo: ahead(60 * 24 * 71) },
    // Response time in 6-hour buckets over 7 days, slower after the theme
    // switch, with the updates the plugin reported marked on the chart.
    vitals: {
      responseSeries: Array.from({ length: 28 }, (_, i) => ({
        t: new Date(Date.now() - (27 - i) * 6 * 3600 * 1000).toISOString(),
        ms: i < 20 ? 380 + Math.round(60 * Math.sin(i / 2)) : 380 + (i - 19) * 240,
      })),
      updates: [
        { at: ago(60 * 30), note: 'WooCommerce 9.3.1 → 9.4.0' },
        { at: ago(60 * 10), note: 'Switched theme to Hello Elementor' },
      ],
    },
    topChanges: top,
    recentScans: scans.slice(0, 5).map(scanItem),
    scanInProgress: running ? { scanId: running.scan.id, status: running.scan.status, pagesRequested: 8, pagesScanned: running.scan.pagesScanned } : null,
    capabilities: running ? { canRunManualScan: false, manualScanBlockedReason: 'A scan is already running.', updateChecks: true } : { canRunManualScan: true, manualScanBlockedReason: null, updateChecks: true },
    links: { website: BASE + '/dashboard/websites/web1', changes: BASE + '/dashboard/changes', pages: BASE + '/dashboard/websites/web1/pages', notifications: BASE + '/dashboard/notifications', billing: BASE + '/dashboard/billing', siteAudit: BASE + '/dashboard/site-audit/aud1', aiAssistants: BASE + '/dashboard/ai-assistants', mcpEndpoint: BASE + '/api/mcp' },
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

  if (url.pathname === '/api/wp/v1/ai-bots' && req.method === 'POST') {
    if (!/^Bearer mkv_wp_/.test(req.headers.authorization || '')) return json(res, 401, { error: 'unauthorized' });
    const body = JSON.parse((await readBody(req)) || '{}');
    fs.writeFileSync(path.join(__dirname, 'media', 'ai-bots.json'), JSON.stringify({ userAgent: req.headers['user-agent'], body }, null, 2));
    return json(res, 200, { stored: (body.days || []).reduce((n, d) => n + d.agents.length, 0) });
  }
  if (url.pathname === '/api/wp/v1/media') {
    const file = { shot_before: 'before.png', shot_after: 'after.png', diff: 'diff.png' }[url.searchParams.get('f')];
    if (!file) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'image/png' });
    return res.end(fs.readFileSync(path.join(__dirname, 'media', file)));
  }

  if (url.pathname === '/__mock/plan' && req.method === 'POST') {
    if (url.searchParams.get('id')) { planId = url.searchParams.get('id'); paid = planId !== 'free'; }
    else { paid = url.searchParams.get('paid') !== '0'; }
    return json(res, 200, { paid, planId });
  }
  if (url.pathname === '/__mock/legacy' && req.method === 'POST') {
    legacy = url.searchParams.get('on') === '1';
    return json(res, 200, { legacy });
  }
  if (url.pathname === '/__mock/log') return json(res, 200, { log: log.slice(-200) });

  if (url.pathname.startsWith('/api/wp/v1/')) {
    if (req.headers.authorization !== 'Bearer ' + TOKEN) return json(res, 401, { error: 'not connected', code: 'NOT_CONNECTED' });
    const rest = url.pathname.slice('/api/wp/v1'.length);
    if (rest === '/site') return json(res, 200, site());
    if (rest === '/status') return json(res, 200, legacy ? { website: site().website } : { website: site().website, features: features() });
    if (rest === '/ai-bots' && req.method === 'GET') {
      if (!paid) return planError(res);
      const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days')) || 90));
      const rows = [];
      for (let i = 0; i < days; i += 3) {
        const day = new Date(now - i * 86400000).toISOString().slice(0, 10);
        rows.push({ day, agent: 'GPTBot', hits: 20 + (i % 7), errors: i % 11 === 0 ? 1 : 0 });
        if (i < 200) rows.push({ day, agent: 'ClaudeBot', hits: 10 + (i % 5), errors: 0 });
        if (i < 60) rows.push({ day, agent: 'OAI-SearchBot', hits: 4, errors: 0 });
      }
      return json(res, 200, { days: rows, firstSeen: { GPTBot: new Date(now - 364 * 86400000).toISOString().slice(0, 10), ClaudeBot: new Date(now - 198 * 86400000).toISOString().slice(0, 10), 'OAI-SearchBot': new Date(now - 57 * 86400000).toISOString().slice(0, 10) } });
    }
    if (rest === '/plugins' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const list = Array.isArray(body.plugins) ? body.plugins : [];
      const bad = list.find((p) => !/^[a-z0-9_-]+$/.test(p.slug) || typeof p.active !== 'boolean');
      if (bad || list.length > 300) return json(res, 400, { error: 'Invalid request.' });
      fs.writeFileSync(path.join(__dirname, 'media', 'plugins.json'), JSON.stringify(body, null, 2));
      const flagged = !paid ? [] : list.filter((p) => p.slug === 'demo-shop' || p.slug === 'akismet').map((p) => (p.slug === 'demo-shop'
        ? { slug: p.slug, name: p.name, status: 'closed', lastUpdated: '2023-02-11', reason: 'Closed on WordPress.org: security issue' }
        : { slug: p.slug, name: p.name, status: 'outdated', lastUpdated: '2022-06-01', reason: 'Not updated in over 2 years' }));
      const vulnerabilities = { count: 1, items: paid ? [{ slug: 'akismet', name: 'Akismet Anti-spam', title: 'Stored XSS in the comment form', severity: 'high', fixedIn: '5.3.1', cve: 'CVE-2026-1234', url: 'https://example.test/vuln' }] : undefined };
      return json(res, 200, { allowed: paid, flagged, vulnerabilities });
    }
    if (rest === '/settings' && req.method === 'GET') return json(res, 200, { updateWindow: settings.updateWindow, allowed: { updateWindows: paid } });
    if (rest === '/settings' && req.method === 'PUT') {
      if (!paid) return planError(res);
      const body = JSON.parse((await readBody(req)) || '{}');
      const w = body.updateWindow;
      if (w !== null && (typeof w !== 'object' || !Array.isArray(w.days) || typeof w.timezone !== 'string')) return json(res, 400, { error: 'Invalid update window.' });
      settings.updateWindow = w;
      return json(res, 200, { updateWindow: settings.updateWindow, allowed: { updateWindows: paid } });
    }
    if (rest === '/checkout-guard' && req.method === 'POST') {
      if (!paid) return planError(res);
      const body = JSON.parse((await readBody(req)) || '{}');
      fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `   checkout guard: ${JSON.stringify(body)}\n`);
      const map = { cartUrl: 'Proceed to checkout', checkoutUrl: 'Place order', productUrl: 'Add to cart' };
      for (const k of Object.keys(map)) if (body[k]) { guard.pages.add(body[k]); guard.elements.add(map[k]); }
      return json(res, 200, { pages: guard.pages.size, elements: guard.elements.size });
    }
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
      const actions = ['update', 'activate', 'deactivate', 'switch', undefined].concat(legacy ? [] : ['rollback']);
      if ((body.items || []).some((x) => !actions.includes(x.action))) return json(res, 400, { error: 'Invalid request.' });
      const verb = { activate: 'Activated ', deactivate: 'Deactivated ', switch: 'Switched theme to ' }[it.action];
      const note = it.action === 'rollback'
        ? `Rolled back ${it.name} ${it.from} to ${it.to}`
        : (verb ? verb + it.name : (body.trigger === 'auto' ? 'Auto-updated ' : 'Updated ') + (it.from && it.to ? `${it.name} ${it.from} → ${it.to}` : it.name)) + ((body.items || []).length > 1 ? ` and ${body.items.length - 1} more` : '');
      fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `   update report: ${JSON.stringify(body)}\n`);
      if (running) return json(res, 200, { note, scan: { id: running.scan.id, status: 'RUNNING' }, reason: 'BUSY' });
      const scan = { id: 'scn' + Date.now(), isRollback: it.action === 'rollback', status: 'QUEUED', triggerType: 'DEPLOY', note, createdAt: new Date().toISOString(), startedAt: null, completedAt: null, pagesRequested: 8, pagesScanned: 0, pagesFailed: 0, changesDetected: 0, highestSeverity: null };
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
    if (rest === '/pages' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req) || '{}');
      const urls = (body.pages || []).map((x) => String(x.url));
      if (!urls.length || urls.length > 20) return json(res, 400, { error: 'Invalid request.' });
      const fresh = urls.filter((u) => !addedPages.includes(u));
      addedPages.push(...fresh);
      fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `   pages added: ${JSON.stringify(fresh)}\n`);
      return json(res, fresh.length ? 201 : 200, { added: fresh.length, alreadyMonitored: urls.length - fresh.length });
    }
    if (rest === '/pages') {
      const list = pages.map((p, i) => ({ id: 'pg' + i, url: 'https://northwind-coffee.test' + p, name: null, enabled: true, baselineVersion: i === 2 ? 3 : 1, baselineApprovedAt: ago(60 * 49), openChanges: changes.filter((c) => c.pagePath === p && isOpen(c)).length, elements: p === '/shop/ethiopia-yirgacheffe' ? [{ name: 'Add to cart', selector: '#cta', expectedText: 'Add to cart' }] : [] }));
      addedPages.forEach((u, i) => list.push({ id: 'pga' + i, url: u, name: null, enabled: true, baselineVersion: null, baselineApprovedAt: null, openChanges: 0 }));
      return json(res, 200, { pages: list });
    }
    if (rest === '/disconnect') return json(res, 200, { ok: true });
    // 1.3.1 service endpoints (see docs/service-api-1.3.md).
    if (rest === '/alerts' && req.method === 'POST') { const body = JSON.parse((await readBody(req)) || '{}'); fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `   alerts: ${JSON.stringify(body)}\n`); return json(res, 200, { received: (body.alerts || []).length, notified: paid }); }
    if (rest === '/crash-check' && req.method === 'POST') { const body = JSON.parse((await readBody(req)) || '{}'); fs.appendFileSync(path.join(__dirname, 'media', 'requests.log'), `   crash-check: ${body.state}\n`); return json(res, 200, { action: body.state === 'broken' && paid ? 'rollback' : 'none' }); }
    if (rest === '/elements' && req.method === 'POST') { if (!paid && elements.length >= 1) return json(res, 403, { error: 'The free plan watches one element. Upgrade to watch more.', reason: 'PLAN', code: 'element_limit' }); const body = JSON.parse((await readBody(req)) || '{}'); elements.push(body); return json(res, 201, { element: { id: 'el' + elements.length, name: body.name, selector: body.selector } }); }
    if (rest === '/llms-summaries' && req.method === 'POST') { if (!paid) return planError(res); const body = JSON.parse((await readBody(req)) || '{}'); return json(res, 200, { summaries: (body.urls || []).map((u) => ({ url: u, summary: 'Specialty coffee, roasted weekly in small batches.' })) }); }
    if (rest === '/redirect-suggestions' && req.method === 'POST') { if (!paid) return planError(res); const body = JSON.parse((await readBody(req)) || '{}'); return json(res, 200, { suggestions: (body.paths || []).map((p) => ({ path: p, url: 'https://northwind-coffee.test/shop/', title: 'Shop' })) }); }
    if (rest === '/update-risk' && req.method === 'POST') { const body = JSON.parse((await readBody(req)) || '{}'); return json(res, 200, { plugins: (body.plugins || []).map((p, i) => ({ slug: p.slug, to: p.to, sites: 214 + i, changedPercent: i === 0 ? 31 : 3, risky: i === 0 })) }); }
    if (rest === '/forms' && req.method === 'POST') { if (!paid) return planError(res); const body = JSON.parse((await readBody(req)) || '{}'); return json(res, 200, { submissions: true, forms: (body.pages || []).map((p) => ({ url: p.url, status: 'ok', checkedAt: ago(30), submission: { status: 'ok', at: ago(30) } })) }); }
    if (rest === '/reports' && req.method === 'GET') { if (planId !== 'agency') return planError(res); return json(res, 200, { enabled: true, settingsUrl: BASE + '/dashboard/websites/web1', brandingUrl: BASE + '/dashboard/settings', branding: reportBranding, reports: [{ month: 'Oct 6 - Nov 5, 2026', url: BASE + '/r/demo', pdfUrl: null, summary: { updates: 14, rollbacks: 1, uptimePermille: 999, sslDaysLeft: 71, changesCaught: 6, aiVisits: 1840 } }] }); }
    if (rest === '/report-branding' && req.method === 'PUT') { if (planId !== 'agency') return planError(res); const body = JSON.parse((await readBody(req)) || '{}'); reportBranding.name = body.brandName ?? null; reportBranding.color = body.color ?? null; return json(res, 200, { branding: { name: reportBranding.name, color: reportBranding.color } }); }
  }
  json(res, 404, { error: 'mock: no route ' + url.pathname });
}).listen(PORT, '127.0.0.1', () => console.log('mock mykavo on', BASE));
