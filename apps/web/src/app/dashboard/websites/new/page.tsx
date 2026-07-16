import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan, getEffectiveWebsiteLimit } from "@/lib/limits";
import { AddWebsiteWizard } from "./add-website-wizard";

export default async function NewWebsitePage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const [plan, websiteLimit, websiteCount] = await Promise.all([
    getWorkspacePlan(workspace.id),
    getEffectiveWebsiteLimit(workspace.id),
    prisma.website.count({ where: { workspaceId: workspace.id } }),
  ]);

  if (websiteCount >= websiteLimit) redirect("/dashboard/websites");

  // Page limits are per website, so a new website starts with the full budget.
  const pageBudget = plan.limits.pagesPerWebsite;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/dashboard/websites"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Websites
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Add a website</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {pageBudget === Infinity
            ? `Your ${plan.name} plan monitors unlimited pages per website.`
            : `Your ${plan.name} plan monitors up to ${pageBudget} pages per website.`}
        </p>
      </div>
      <AddWebsiteWizard pageBudget={pageBudget} />
    </div>
  );
}
