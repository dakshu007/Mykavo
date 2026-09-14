import { chromium } from "playwright";
const OUT = process.argv[2];
const me = { user: { id: "u1", name: "Dakshesh", email: "d@e.com", image: null, twoFactorEnabled: false }, admin: { usage: true, blog: true }, workspaces: [{ id: "w1", name: "W", role: "OWNER", isActive: true }], plan: { id: "pro", name: "Pro", limits: { websites: 8, pagesPerSite: 15, scanFrequency: "DAILY", seats: 3 } } };
const session = { session: { id: "s", userId: "u1", expiresAt: "2030-01-01T00:00:00Z" }, user: me.user };
const blog = { posts: [
  { id: "p1", slug: "a", title: "Why websites break silently after a deploy", excerpt: "The changes that cost you money are rarely the ones you notice.", status: "PUBLISHED", publishedAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-12T08:30:00Z" },
  { id: "p2", slug: "b", title: "Canonical tags: one character that de-indexed a shop", excerpt: null, status: "DRAFT", publishedAt: null, updatedAt: "2026-09-14T06:15:00Z" },
]};
const changes = { total: 152, websites: [{ id: "w1", name: "JP Fitness" }], changes: [
  { id: "c1", title: "Visual difference of 12.4% detected", severity: "MEDIUM", status: "NEW", category: "VISUAL", websiteName: "JP Fitness - CBE", pagePath: "/success-stories", detectedAt: new Date(Date.now() - 3*3600e3).toISOString() },
]};
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

// Blog in LIGHT mode - the theme where the panel bug hid.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light", deviceScaleFactor: 2 });
  await ctx.route("**/api/mobile/blog", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(blog) }));
  await ctx.route("**/api/mobile/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(me) }));
  await ctx.route("**/api/auth/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4500/blog", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/blog-light.png` });
  console.log("blog-light captured");
  await ctx.close();
}

// The filter sheet, opened - must sit ABOVE the floating tab bar.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark", deviceScaleFactor: 2 });
  await ctx.route("**/api/mobile/changes**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(changes) }));
  await ctx.route("**/api/changes**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(changes) }));
  await ctx.route("**/api/mobile/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(me) }));
  await ctx.route("**/api/auth/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4500/(tabs)/changes", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.getByText("Any severity", { exact: true }).first().click();
  await page.waitForTimeout(700);
  const text = await page.evaluate(() => document.body.innerText);
  console.log("sheet shows options?", text.includes("Something is broken or gone"));
  await page.screenshot({ path: `${OUT}/filter-sheet.png` });
  await ctx.close();
}
await browser.close();
