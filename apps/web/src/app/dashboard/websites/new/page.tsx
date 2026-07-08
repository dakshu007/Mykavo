import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import { AddWebsiteWizard } from "./add-website-wizard";

export default async function NewWebsitePage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const [plan, websiteCount, pagesUsed] = await Promise.all([
    getWorkspacePlan(workspace.id),
    prisma.website.count({ where: { workspaceId: workspace.id } }),
    prisma.monitoredPage.count({ where: { website: { workspaceId: workspace.id } } }),
  ]);

  if (websiteCount >= plan.limits.websites) redirect("/dashboard/websites");

  const pageBudget =
    plan.limits.monitoredPages === Infinity
      ? Infinity
      : Math.max(0, plan.limits.monitoredPages - pagesUsed);

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
            ? "Your Pro plan monitors unlimited pages."
            : `Your ${plan.name} plan can monitor ${pageBudget} more page${pageBudget === 1 ? "" : "s"}.`}
        </p>
      </div>
      <AddWebsiteWizard pageBudget={pageBudget} />
    </div>
  );
}
