// Server-side checks for the 1.3.0 features, without a browser: rollback
// (one click and automatic), robots.txt rules, plugin health, AI history,
// checkout guard and update windows. Drives this site's own MyKavo REST
// routes through probe/plus.php, against mock-server.cjs started with
// MOCK_TOKEN=mkv_wp_probe. See README.md.
const WP = process.env.WP_URL || 'http://127.0.0.1:9400';
const MOCK = 'http://127.0.0.1:9501';
let failures = 0;

const probe = async (q, body) => {
  const r = await fetch(WP + '/wp-content/mu-plugins/probe/plus.php?' + new URLSearchParams(q), body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) });
  const text = await r.text();
  try { return JSON.parse(text); } catch (e) { throw new Error('probe ' + JSON.stringify(q) + ' said: ' + text.slice(0, 300)); }
};
const rest = (method, route, body, query) => probe({ do: 'rest', method, route, ...(query ? { query } : {}) }, body);
const plan = (paid) => fetch(MOCK + '/__mock/plan?paid=' + (paid ? 1 : 0), { method: 'POST' });
const check = (cond, what) => { if (!cond) throw new Error(what); };
const step = async (name, fn) => {
  try { const note = await fn(); console.log('ok  ', name + (note ? ' | ' + note : '')); } catch (e) { failures++; console.log('FAIL', name, '-', e.message); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const latest = async () => (await probe({ do: 'log' }))[0];
const fakeUpdate = () => fetch(WP + '/wp-content/mu-plugins/probe/fake-update.php').then((r) => r.text());

(async () => {
  // A fresh Playground can take a while to answer.
  for (let i = 0; i < 30; i++) { try { const r = await fetch(WP + '/'); if (r.ok) break; } catch (e) { /* not up yet */ } await sleep(2000); }

  await step('connect (probe) on a paid plan', async () => {
    await plan(true);
    check((await probe({ do: 'connect' })).connected, 'not connected');
    await rest('POST', '/update-window', { window: null }); // No window left over from an earlier run.
    await rest('POST', '/updates', { autoRollback: true });
  });

  await step('features from GET /status', async () => {
    const r = await rest('GET', '/features', undefined, 'fresh=1');
    check(r.status === 200 && r.data.known && Object.values(r.data.features).every(Boolean), JSON.stringify(r));
    return JSON.stringify(r.data.features);
  });

  await step('robots.txt: AI training blocked, AI search untouched', async () => {
    const on = await rest('POST', '/robots', { enabled: true });
    check(on.data.enabled && !on.data.physical, JSON.stringify(on.data));
    const txt = await (await fetch(WP + '/?robots=1')).text();
    for (const a of ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'Meta-ExternalAgent']) check(txt.includes('User-agent: ' + a + '\nDisallow: /'), 'missing ' + a);
    for (const a of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User']) check(!txt.includes(a), 'touched ' + a);
    await rest('POST', '/robots', { enabled: false });
    const off = await (await fetch(WP + '/?robots=1')).text();
    check(!off.includes('GPTBot'), 'rules still there when off');
    return txt.split('\n').length + ' lines when on';
  });

  let updateId = '';
  await step('safe updates: plugin update logged with its file, watch scheduled', async () => {
    await probe({ do: 'wporg' }); // Before the update, as WordPress has it when it updates.
    await fakeUpdate();
    await probe({ do: 'activate' });
    const e = await latest();
    updateId = e.id;
    check(e.items[0].file === 'demo-shop/demo-shop.php' && e.items[0].from === '8.1.0' && e.items[0].to === '8.2.0', JSON.stringify(e.items));
    check(e.scan_id && e.watch && e.watch.state === 'watching', 'no watch: ' + JSON.stringify(e));
    const cron = await probe({ do: 'cron' });
    const ev = cron.find((c) => c.hook === 'mykavo_rollback_watch' && c.args[0] === e.id);
    check(ev && ev.in > 200 && ev.in <= 300, 'cron: ' + JSON.stringify(cron));
    return 'watch in ' + ev.in + 's';
  });

  await step('update history offers "Roll back to 8.1.0"', async () => {
    const r = await rest('GET', '/updates');
    const it = r.data.log[0].items[0];
    check(it.canRollback === true && r.data.autoRollback === true, JSON.stringify(r.data.log[0]));
  });

  await step('auto-rollback: keeps watching while the check runs', async () => {
    const e = await probe({ do: 'watch', id: updateId });
    check(e.watch.state === 'watching' && !e.rollback, JSON.stringify(e.watch));
    const cron = await probe({ do: 'cron' });
    check(cron.some((c) => c.hook === 'mykavo_rollback_watch'), 'not rescheduled');
  });

  await step('auto-rollback: rolls back when MyKavo recommends it', async () => {
    await sleep(22000); // The mock scan takes 20 s and finds a CRITICAL change.
    const e = await probe({ do: 'watch', id: updateId });
    check(e.rollback && e.rollback.trigger === 'auto' && e.rollback.done[0] === 'Demo Shop', JSON.stringify(e));
    check(e.watch.state === 'rolled-back' && /Critical/.test(e.watch.reason), JSON.stringify(e.watch));
    const p = await probe({ do: 'plugin' });
    check(p.version === '8.1.0' && p.active === true && p.holds['demo-shop/demo-shop.php'] === '8.2.0', JSON.stringify(p));
    const rb = await latest();
    check(rb.items[0].action === 'rollback' && rb.rollback_of === updateId && rb.trigger === 'auto' && rb.items[0].from === '8.2.0' && rb.items[0].to === '8.1.0', JSON.stringify(rb));
    check(!rb.watch, 'a rollback must never be watched: ' + JSON.stringify(rb));
    return 'note: ' + rb.note;
  });

  await step('rollback hold: no automatic update straight back to 8.2.0', async () => {
    const held = await probe({ do: 'autoupdate', v: '8.2.0' });
    const other = await probe({ do: 'autoupdate', v: '8.3.0' });
    check(held.plugin === false && other.plugin === true && held.ui_query === null && held.plugin_off === false, JSON.stringify({ held, other }));
  });

  let manualId = '';
  await step('one-click rollback (auto rollback off)', async () => {
    await rest('POST', '/updates', { autoRollback: false });
    await sleep(21000); // Let the rollback's own check finish so the next report gets a scan.
    await probe({ do: 'wporg' });
    await fakeUpdate();
    const e = await latest();
    manualId = e.id;
    check(!e.watch, 'watched although auto rollback is off');
    const hold = (await probe({ do: 'plugin' })).holds;
    check(!hold || !hold['demo-shop/demo-shop.php'], 'hold not released by a deliberate update: ' + JSON.stringify(hold));
    const r = await rest('POST', '/rollback', { entry: e.id, file: 'demo-shop/demo-shop.php' });
    check(r.status === 200 && r.data.result.rolledBack[0] === 'Demo Shop', JSON.stringify(r));
    const p = await probe({ do: 'plugin' });
    check(p.version === '8.1.0' && p.active, JSON.stringify(p));
    const rb = r.data.log[0];
    check(rb.items[0].action === 'rollback' && rb.trigger === 'manual', JSON.stringify(rb));
    return rb.note || rb.reason;
  });

  await step('the same rollback cannot run twice', async () => {
    const r = await rest('POST', '/rollback', { entry: manualId, file: 'demo-shop/demo-shop.php' });
    check(r.status === 409, JSON.stringify(r));
    return r.data.message;
  });

  await step('rollback is offered only for WordPress.org plugins', async () => {
    await fakeUpdate();
    const r = await rest('GET', '/updates');
    // The rollback's install cleared WordPress's update data, so this update of Demo Shop is not known to come from WordPress.org.
    check(r.data.log[0].items[0].canRollback === false, JSON.stringify(r.data.log[0].items[0]));
    const denied = await rest('POST', '/rollback', { entry: r.data.log[0].id, file: 'demo-shop/demo-shop.php' });
    check(denied.status === 409, JSON.stringify(denied));
    return denied.data.message;
  });

  await step('older MyKavo: rollback reported as an update, no features', async () => {
    await fetch(MOCK + '/__mock/legacy?on=1', { method: 'POST' });
    try {
      await probe({ do: 'flush' });
      const f = await rest('GET', '/features', undefined, 'fresh=1');
      check(f.status === 200 && Object.values(f.data.features).every((v) => v === false), JSON.stringify(f.data));
      await sleep(21000);
      await probe({ do: 'wporg' });
      await fakeUpdate();
      const e = await latest();
      const r = await rest('POST', '/rollback', { entry: e.id, file: 'demo-shop/demo-shop.php' });
      const rb = r.data.log[0];
      check(r.status === 200 && rb.items[0].action === 'rollback' && rb.scan_id && rb.reason !== 'unreachable', JSON.stringify(rb));
      return rb.note;
    } finally {
      await fetch(MOCK + '/__mock/legacy?on=0', { method: 'POST' });
      await probe({ do: 'flush' });
      await rest('GET', '/features', undefined, 'fresh=1');
    }
  });

  await step('plugin health: inventory sent, flagged list returned', async () => {
    const r = await rest('GET', '/plugin-health', undefined, 'fresh=1');
    check(r.data.allowed && r.data.flagged.some((f) => f.slug === 'demo-shop' && f.status === 'closed'), JSON.stringify(r.data));
    const sent = require(require('path').join(__dirname, 'media', 'plugins.json'));
    const slugs = sent.plugins.map((p) => p.slug);
    check(!slugs.includes('mykavo') && !slugs.includes('hello') && slugs.includes('demo-shop'), slugs.join(','));
    return 'sent: ' + slugs.join(', ');
  });

  await step('AI crawler history (12 months)', async () => {
    const r = await rest('GET', '/ai-history');
    check(r.data.allowed && r.data.days.length > 100 && r.data.firstSeen.GPTBot, JSON.stringify(r.data).slice(0, 200));
    return r.data.days.length + ' rows';
  });

  await step('WooCommerce checkout guard', async () => {
    const r = await rest('POST', '/checkout-guard');
    check(r.data.allowed && r.data.pages === 3 && r.data.elements === 3, JSON.stringify(r.data));
    const again = await rest('POST', '/checkout-guard');
    check(again.data.pages === 3, 'not idempotent');
    return Object.values(r.data.urls).join(' ');
  });

  await step('update window: open now lets automatic updates run', async () => {
    const r = await rest('POST', '/update-window', { window: { enabled: true, days: [0, 1, 2, 3, 4, 5, 6], startHour: 0, endHour: 24, timezone: 'UTC' } });
    check(r.data.allowed && r.data.open === true && r.data.updateWindow.days.length === 7, JSON.stringify(r.data));
    const a = await probe({ do: 'autoupdate', v: '8.3.0' });
    check(a.plugin === true && a.theme === true && a.core === true, JSON.stringify(a));
  });

  await step('update window: closed now holds automatic updates', async () => {
    const start = (new Date().getUTCHours() + 3) % 24;
    const r = await rest('POST', '/update-window', { window: { enabled: true, days: [0, 1, 2, 3, 4, 5, 6], startHour: start, endHour: (start + 1) % 24 || 24, timezone: 'UTC' } });
    check(r.data.open === false, JSON.stringify(r.data));
    const a = await probe({ do: 'autoupdate', v: '8.3.0' });
    check(a.plugin === false && a.theme === false && a.core === false && a.ui_query === null, JSON.stringify(a));
    const bad = await rest('POST', '/update-window', { window: { enabled: true, days: [1], startHour: 1, endHour: 2, timezone: 'Mars/Olympus' } });
    check(bad.status === 400, 'bad time zone accepted');
  });

  await step('update window maths', async () => {
    const w = await probe({ do: 'window' });
    check(w.mon_23h && w.tue_03h && !w.mon_03h && w.sat_03h && !w.tue_12h && w.bad_zone_is_utc === 'UTC' && w.sun_10h_utc && !w.sun_17h_utc, JSON.stringify(w));
  });

  await step('daily job: plugin list and settings refreshed', async () => {
    const d = await probe({ do: 'daily' });
    check(d.health && d.health.allowed && d.settings && d.settings.allowed.updateWindows, JSON.stringify(d).slice(0, 300));
  });

  await step('free plan: paid features fall back to upsell data', async () => {
    await plan(false);
    await probe({ do: 'flush' });
    const f = await rest('GET', '/features', undefined, 'fresh=1');
    check(Object.values(f.data.features).every((v) => v === false), JSON.stringify(f.data));
    const h = await rest('GET', '/ai-history');
    check(h.status === 200 && h.data.allowed === false, JSON.stringify(h));
    const g = await rest('POST', '/checkout-guard');
    check(g.status === 200 && g.data.allowed === false, JSON.stringify(g));
    const w = await rest('POST', '/update-window', { window: { enabled: true, days: [1], startHour: 1, endHour: 2, timezone: 'UTC' } });
    check(w.status === 200 && w.data.allowed === false, JSON.stringify(w));
    const a = await probe({ do: 'autoupdate', v: '8.3.0' });
    check(a.plugin === true, 'window still enforced on the free plan: ' + JSON.stringify(a));
    const p = await rest('GET', '/plugin-health', undefined, 'fresh=1');
    check(p.data.allowed === false && p.data.flagged.length === 0, JSON.stringify(p.data));
  });

  await step('free plan: no auto-rollback watch after an update', async () => {
    await rest('POST', '/updates', { autoRollback: true });
    await sleep(21000);
    await fakeUpdate();
    const e = await latest();
    check(e.scan_id && !e.watch, JSON.stringify(e));
  });

  await step('front end is untouched', async () => {
    const html = await (await fetch(WP + '/')).text();
    check(!/mykavo/i.test(html), 'MyKavo appears on the home page');
  });

  await step('disconnect clears plan data and pending checks', async () => {
    await plan(true);
    await rest('GET', '/features', undefined, 'fresh=1');
    await rest('POST', '/disconnect');
    const cron = await probe({ do: 'cron' });
    check(!cron.some((c) => c.hook === 'mykavo_rollback_watch'), JSON.stringify(cron));
  });

  console.log(failures ? failures + ' failed' : 'all passed');
  process.exit(failures ? 1 : 0);
})();
