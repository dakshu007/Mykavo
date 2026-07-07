import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import { PageEditor } from "./page-editor";

export default async function EditPagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  const website = await prisma.website.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { monitoredPages: { orderBy: { createdAt: "asc" } } },
  });
  if (!website) notFound();

  const [plan, otherPages] = await Promise.all([
    getWorkspacePlan(workspace.id),
    prisma.monitoredPage.count({
      where: { website: { workspaceId: workspace.id }, websiteId: { not: website.id } },
    }),
  ]);
  const pageBudget = Math.max(0, plan.limits.monitoredPages - otherPages);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/dashboard/websites/${website.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> {website.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Monitored pages</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Your {plan.name} plan can monitor up to {pageBudget} page
          {pageBudget === 1 ? "" : "s"} on this website.
        </p>
      </div>
      <PageEditor
        websiteId={website.id}
        currentPages={website.monitoredPages.map((p) => p.url)}
        pageBudget={pageBudget}
      />
    </div>
  );
}
