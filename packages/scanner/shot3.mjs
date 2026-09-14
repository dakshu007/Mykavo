import { chromium } from "playwright";
const OUT = process.argv[2];
const me = { user: { id: "u1", name: "Dakshesh Babu", email: "d@e.com", image: null, twoFactorEnabled: false }, admin: { usage: true, blog: true }, workspaces: [{ id: "w1", name: "Dakshesh's Workspace", role: "OWNER", isActive: true }], plan: { id: "pro", name: "Pro", limits: { websites: 8, pagesPerSite: 15, scanFrequency: "DAILY", seats: 3 } } };
const session = { session: { id: "s", userId: "u1", expiresAt: "2030-01-01T00:00:00Z" }, user: me.user };

const changes = {
  total: 152,
  websites: [{ id: "w1", name: "JP Fitness - CBE" }],
  changes: [
    { id: "c1", title: "Visual difference of 12.4% detected", severity: "MEDIUM", status: "NEW", category: "VISUAL", websiteName: "JP Fitness - CBE", pageUrl: "https://jpfitness.co.in/success-stories", detectedAt: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { id: "c2", title: "Response time increased 121%", severity: "LOW", status: "NEW", category: "PERFORMANCE", websiteName: "JP Fitness - CBE", pageUrl: "https://jpfitness.co.in/success-stories", detectedAt: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { id: "c3", title: "Visual difference of 32.3% detected", severity: "CRITICAL", status: "NEW", category: "VISUAL", websiteName: "JP Fitness - CBE", pageUrl: "https://jpfitness.co.in/pricing", detectedAt: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { id: "c4", title: "Visual difference of 14.7% detected", severity: "MEDIUM", status: "NEW", category: "VISUAL", websiteName: "JP Fitness - CBE", pageUrl: "https://jpfitness.co.in/gallery", detectedAt: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { id: "c5", title: "Visual difference of 24.5% detected", severity: "HIGH", status: "NEW", category: "VISUAL", websiteName: "JP Fitness - CBE", pageUrl: "https://jpfitness.co.in/events", detectedAt: new Date(Date.now() - 3 * 3600e3).toISOString() },
  ],
};

const day = (i, clicks, impressions) => ({ date: `2026-08-${String(i).padStart(2, "0")}`, clicks, impressions });
const trend = [3,5,4,8,6,9,12,7,11,14,9,13,18,15,12,17,21,16,19,24,20,18,26,22,25,29,24,31].map((c, i) => day(i + 1, c, c * 27));
const sc = {
  websites: [{
    websiteId: "w1", name: "JP Fitness - CBE", url: "https://jpfitness.co.in",
    property: "sc-domain:jpfitness.co.in",
    lastSyncAt: new Date(Date.now() - 5 * 3600e3).toISOString(), lastError: null, windowDays: 28,
    current: { clicks: 438, impressions: 12840, ctr: 0.0341, position: 14.2 },
    previous: { clicks: 362, impressions: 13910, ctr: 0.026, position: 17.8 },
    trend,
    topQueries: [
      { key: "gym in coimbatore", clicks: 96, impressions: 1840, ctr: 0.052, position: 4.1, clicksDelta: 22 },
      { key: "best fitness centre cbe", clicks: 61, impressions: 1290, ctr: 0.047, position: 6.8, clicksDelta: -9 },
      { key: "personal trainer coimbatore", clicks: 44, impressions: 2100, ctr: 0.021, position: 11.4, clicksDelta: null },
    ],
    topPages: [
      { key: "https://jpfitness.co.in/", clicks: 188, impressions: 5120, ctr: 0.037, position: 8.9, clicksDelta: 41 },
      { key: "https://jpfitness.co.in/pricing", clicks: 97, impressions: 2340, ctr: 0.041, position: 10.2, clicksDelta: -13 },
    ],
  }],
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [name, path, theme] of [
  ["changes-filters", "/(tabs)/changes", "dark"],
  ["searchconsole", "/search-console", "dark"],
  ["searchconsole-light", "/search-console", "light"],
]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme, deviceScaleFactor: 2 });
  await ctx.route("**/api/mobile/search-console", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sc) }));
  await ctx.route("**/api/mobile/changes**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(changes) }));
  await ctx.route("**/api/changes**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(changes) }));
  await ctx.route("**/api/mobile/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(me) }));
  await ctx.route("**/api/auth/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 80)));
  await page.goto(`http://127.0.0.1:4500${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(`${name.padEnd(20)} overflow=${overflow} errors=${errs.length ? errs[0] : "none"}`);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
}
await browser.close();
