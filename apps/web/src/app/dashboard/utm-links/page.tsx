import type { Metadata } from "next";
import { notFound } from "next/navigation";
import sitemap from "@/app/sitemap";
import { UtmBuilder, type BuilderPage } from "@/components/dashboard/utm-builder";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";

export const metadata: Metadata = {
  title: "UTM links",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function groupOf(path: string): string {
  if (path === "/") return "Home";
  if (path.startsWith("/blog/")) return "Blog";
  if (path.startsWith("/tools")) return "Tool";
  if (path.startsWith("/docs")) return "Docs";
  if (path.startsWith("/videos") || path.startsWith("/video-")) return "Video";
  return "Page";
}

/** Every public page and blog post, from the sitemap, so new posts appear on their own. */
async function publicPages(): Promise<BuilderPage[]> {
  const entries = await sitemap();
  const seen = new Set<string>();
  const out: BuilderPage[] = [];
  for (const e of entries) {
    let path: string;
    try {
      path = new URL(e.url).pathname;
    } catch {
      continue;
    }
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({ path, group: groupOf(path) });
  }
  const order = ["Home", "Page", "Tool", "Blog", "Docs", "Video"];
  return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.path.localeCompare(b.path));
}

export default async function UtmLinksPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user)) notFound();
  const pages = await publicPages();

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">UTM links</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-ink-secondary">
          Tagged links for any page or blog post, landing on any section. Use them wherever you post outside mykavo.app: social, email,
          ads, guest posts. Google Analytics reads the tags, and every new account records the campaign, page and section it came from
          (Tracking, open a user). Every page also reports section views and clicks on its own, as section_view and cta_click.
        </p>
      </div>
      <UtmBuilder pages={pages} />
    </div>
  );
}
