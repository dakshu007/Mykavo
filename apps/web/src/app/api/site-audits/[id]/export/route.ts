import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { AUDIT_CHECKS, type AuditIssueGroup } from "@mykavo/seo-audit";
import { getApiContext } from "@/lib/api-auth";
import { toCsv } from "@/lib/csv";

type Params = { params: Promise<{ id: string }> };

/**
 * CSV export of a site audit: one row per affected URL, sortable in any
 * spreadsheet (severity / category / issue / URL / detail / found on / fix).
 */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const audit = await prisma.siteAudit.findFirst({
    where: { id, website: { workspaceId: ctx.workspace.id } },
    include: { website: { select: { name: true, url: true } } },
  });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const issues = (Array.isArray(audit.issues) ? audit.issues : []) as unknown as AuditIssueGroup[];
  const rows: string[][] = [
    ["Severity", "Category", "Issue", "URL", "Detail", "Found on", "How to fix"],
  ];
  for (const group of issues) {
    const def = AUDIT_CHECKS[group.checkId];
    if (!def) continue;
    for (const entry of group.urls) {
      rows.push([
        def.severity,
        def.category,
        def.title,
        entry.url,
        entry.detail ?? "",
        entry.foundOn?.join(" | ") ?? "",
        def.fix,
      ]);
    }
  }

  const host = (() => {
    try {
      return new URL(audit.website.url).hostname;
    } catch {
      return "site";
    }
  })();
  const date = (audit.completedAt ?? audit.createdAt).toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="mykavo-site-audit-${host}-${date}.csv"`,
    },
  });
}
