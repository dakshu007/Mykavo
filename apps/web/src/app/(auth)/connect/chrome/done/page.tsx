import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@mykavo/database";
import { getSession, getCurrentMembership } from "@/lib/session";
import { bareHost } from "@/lib/integrations/site-connection";
import { ExtensionHandoff } from "./extension-handoff";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website connected",
  robots: { index: false },
  // The URL carries a one-time code: never send it anywhere as a referrer.
  referrer: "no-referrer",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * The end of the extension's connect flow. Renders the one-time code where
 * the extension's content script (and only a page on mykavo.app) can read
 * it; the extension trades it for a token with the PKCE verifier only it
 * holds. Then it sends the user on: to page selection for a new website, to
 * the website itself otherwise.
 */
export default async function ConnectChromeDonePage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const code = first(raw.code) ?? "";
  const state = first(raw.state) ?? "";
  const websiteId = first(raw.w) ?? "";
  const page = first(raw.page);

  const session = await getSession();
  if (!session) redirect("/login");
  const { workspace } = await getCurrentMembership(session.user.id, session.user.name);

  const website = /^[a-z0-9]{10,40}$/i.test(websiteId)
    ? await prisma.website.findFirst({
        where: { id: websiteId, workspaceId: workspace.id },
        select: { id: true, name: true, url: true, _count: { select: { monitoredPages: true } } },
      })
    : null;
  if (!website) redirect("/dashboard/websites");

  const validHandoff = /^[A-Za-z0-9_-]{20,100}$/.test(code) && /^[A-Za-z0-9_-]{16,128}$/.test(state);
  const needsSetup = website._count.monitoredPages === 0;
  const setupQuery = new URLSearchParams({ website: website.id });
  if (page && /^https?:\/\/[^\s]{1,2000}$/i.test(page)) setupQuery.set("page", page);

  return (
    <ExtensionHandoff
      code={validHandoff ? code : null}
      state={validHandoff ? state : null}
      host={bareHost(new URL(website.url).hostname)}
      needsSetup={needsSetup}
      nextHref={needsSetup ? `/dashboard/websites/new?${setupQuery.toString()}` : `/dashboard/websites/${website.id}`}
    />
  );
}
