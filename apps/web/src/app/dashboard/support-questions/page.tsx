import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheck, CircleHelp, MessagesSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { loadSupportReport, type SupportQuestionRow } from "@/lib/support/report";
import { SUPPORT_ARTICLES } from "@/config/support-kb";

export const metadata: Metadata = {
  title: "Support questions",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, { label: string; tone: string }> = {
  answer: { label: "Answered", tone: "bg-success-soft text-success-strong" },
  pick: { label: "Picked", tone: "bg-success-soft text-success-strong" },
  suggest: { label: "Unsure", tone: "bg-warning-soft text-warning-strong" },
  fallback: { label: "No answer", tone: "bg-critical-soft text-critical-strong" },
  smalltalk: { label: "Chat", tone: "bg-surface text-ink-faint" },
};

const when = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function percent(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)}%` : "-";
}

function QuestionList({ rows, empty }: { rows: SupportQuestionRow[]; empty: string }) {
  if (rows.length === 0) return <p className="text-[13.5px] text-ink-secondary">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => {
        const kind = KIND_LABEL[row.kind] ?? KIND_LABEL.smalltalk;
        return (
          <li key={row.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="break-words text-[14px] text-ink">{row.question}</p>
              <p className="text-[12px] text-ink-faint">
                {when.format(row.createdAt)} UTC
                {row.articleTitle ? ` · ${row.articleTitle}` : ""}
                {row.signedIn ? " · signed in" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {row.helpful === true ? <ThumbsUp className="size-3.5 text-success-strong" aria-label="Rated helpful" /> : null}
              {row.helpful === false ? <ThumbsDown className="size-3.5 text-critical" aria-label="Rated not helpful" /> : null}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${kind.tone}`}>{kind.label}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * What people ask the assistant on /support. Operator only, and notFound()
 * for everyone else, like the other admin pages.
 */
export default async function SupportQuestionsPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();

  const report = await loadSupportReport();
  const t = report.totals;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Support questions</h1>
        <p className="mt-1 text-[14px] text-ink-secondary">
          What people ask the assistant on <Link href="/support" className="underline">/support</Link>, last {report.days} days. The
          knowledge base has {SUPPORT_ARTICLES.length} answers; questions it could not answer are the ones to add next.
        </p>
      </div>

      {!report.ready ? (
        <Card>
          <p className="text-[14px] text-warning-strong">
            Questions are not being recorded yet: run the support_question migration on the server.
          </p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Questions", value: String(t.asked) },
          { label: "Answered", value: percent(t.answered, t.asked) },
          { label: "No answer", value: String(t.unanswered), note: `${t.suggested} unsure` },
          { label: "Rated helpful", value: percent(t.helpful, t.helpful + t.notHelpful), note: `${t.helpful} up · ${t.notHelpful} down` },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-[12px] font-medium text-ink-secondary">{k.label}</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-ink">{k.value}</p>
            {k.note ? <p className="text-[12px] text-ink-faint">{k.note}</p> : null}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader icon={CircleHelp} title="Needs an answer" />
        <p className="-mt-2 mb-3 text-[13px] text-ink-secondary">
          No answer, unsure, or rated not helpful. Add these to the knowledge base or reply to whoever asked.
        </p>
        <QuestionList rows={report.needsAnswer} empty="Nothing waiting. Every question got an answer people liked." />
      </Card>

      <Card>
        <CardHeader icon={BookOpenCheck} title="Most used answers" />
        {report.topArticles.length === 0 ? (
          <p className="text-[13.5px] text-ink-secondary">No answers given yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {report.topArticles.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{a.title}</span>
                <span className="text-[12px] text-ink-faint">
                  {a.helpful} up · {a.notHelpful} down
                </span>
                <span className="w-10 text-right text-[14px] font-semibold tabular-nums text-ink">{a.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader icon={MessagesSquare} title="Latest questions" />
        <QuestionList rows={report.recent} empty="No questions yet." />
      </Card>
    </div>
  );
}
