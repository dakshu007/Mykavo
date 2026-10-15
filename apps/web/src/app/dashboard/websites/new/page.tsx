import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan, getEffectiveWebsiteLimit } from "@/lib/limits";
import { planLabel } from "@/config/plans";
import { connectReturnPath } from "@/lib/integrations/site-connection";
import { AddWebsiteWizard } from "./add-website-wizard";

export default async function NewWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; website?: string; page?: string; connect?: string }>;
}) {
  const { url: prefill, website: resumeId, page, connect } = await searchParams;
  // Came from the WordPress consent screen: go back there once the site is in.
  const connectReturn = typeof connect === "string" ? connectReturnPath(connect) : null;
  // Only a plain http(s) address is prefilled; the wizard still validates it
  // (and the API runs the full SSRF check) before anything is fetched.
  const initialUrl =
    typeof prefill === "string" && /^https?:\/\/[^\s]{1,2000}$/i.test(prefill) ? prefill : "";
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const [plan, websiteLimit, websiteCount] = await Promise.all([
    getWorkspacePlan(workspace.id),
    getEffectiveWebsiteLimit(workspace.id),
    prisma.website.count({ where: { workspaceId: workspace.id } }),
  ]);

  // Resume: a website added elsewhere (the Chrome extension) that has no
  // monitored pages yet picks up at page discovery. It already counts
  // toward the limit, so the limit check below doesn't apply to it.
  const resume =
    typeof resumeId === "string" && /^[a-z0-9]{10,40}$/i.test(resumeId)
      ? await prisma.website.findFirst({
          where: { id: resumeId, workspaceId: workspace.id },
          select: { id: true, url: true, _count: { select: { monitoredPages: true } } },
        })
      : null;
  if (resume && resume._count.monitoredPages > 0) redirect(`/dashboard/websites/${resume.id}`);
  const preferredPage = typeof page === "string" && /^https?:\/\/[^\s]{1,2000}$/i.test(page) ? page : null;

  if (!resume && websiteCount >= websiteLimit) redirect("/dashboard/websites");

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
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {resume ? "Choose pages to monitor" : "Add a website"}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {pageBudget === Infinity
            ? `Your ${planLabel(plan)} monitors unlimited pages per website.`
            : `Your ${planLabel(plan)} monitors up to ${pageBudget} pages per website.`}
        </p>
      </div>
      <AddWebsiteWizard
        pageBudget={pageBudget}
        initialUrl={resume ? resume.url : initialUrl}
        resume={resume ? { websiteId: resume.id, preferredPage } : undefined}
        connectReturn={connectReturn}
      />
    </div>
  );
}
