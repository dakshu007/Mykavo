import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, PenLine, UserRound } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession } from "@/lib/session";
import { isBlogAdmin } from "@/lib/blog-admin";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Blog authors" };

async function loadAuthors() {
  try {
    const authors = await prisma.blogAuthor.findMany({ orderBy: { name: "asc" } });
    const counts = await Promise.all(
      authors.map((a) =>
        prisma.blogPost.count({ where: { authorName: { equals: a.name, mode: "insensitive" } } }),
      ),
    );
    return { ok: true as const, authors: authors.map((a, i) => ({ ...a, posts: counts[i] })) };
  } catch {
    // The blog_author table arrives with a migration applied by hand.
    return { ok: false as const, authors: [] };
  }
}

export default async function BlogAuthorsPage() {
  const session = await requireSession();
  if (!isBlogAdmin(session.user.email)) notFound();
  const { ok, authors } = await loadAuthors();

  const back = (
    <Link href="/dashboard/blog" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> Blog posts
    </Link>
  );

  if (!ok) {
    return (
      <div>
        {back}
        <Card>
          <CardHeader title="Authors" />
          <p className="text-sm leading-6 text-ink-secondary">
            The authors table is not in the database yet. Apply the migration{" "}
            <code className="font-mono text-[13px]">20260926090000_blog_author</code> (see docs/OPERATIONS.md), then reload.
            Posts keep working in the meantime.
          </p>
        </Card>
      </div>
    );
  }

  if (authors.length === 0) {
    return (
      <div>
        {back}
        <EmptyState
          icon={UserRound}
          title="No authors yet"
          description="Add the people who write for the blog - photo, role, a short description, highlights and profile links. Every post by them shows it, which is what Google and AI answers look for."
          action={<ButtonLink href="/dashboard/blog/authors/new">Add an author</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div>
      {back}
      <Card>
        <CardHeader
          title="Authors"
          action={
            <ButtonLink href="/dashboard/blog/authors/new" size="sm">
              Add author
            </ButtonLink>
          }
        />
        <ul className="divide-y divide-line">
          {authors.map((a) => (
            <li key={a.id} className="flex items-center gap-4 py-4">
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small avatar
                <img src={a.imageUrl} alt="" className="size-11 rounded-full border border-line object-cover" />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft font-semibold text-ink">
                  {a.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/dashboard/blog/authors/${a.id}/edit`} className="text-sm font-semibold text-ink hover:text-accent">
                  {a.name}
                </Link>
                <p className="truncate text-[13px] text-ink-secondary">
                  {[a.role, `${a.posts} ${a.posts === 1 ? "post" : "posts"}`].filter(Boolean).join(" · ")}
                  {!a.bio && " · no description yet"}
                </p>
              </div>
              <Link
                href={`/blog/author/${a.slug}`}
                target="_blank"
                aria-label={`View ${a.name}'s public page`}
                className="inline-flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
              >
                <ExternalLink className="size-4" aria-hidden />
              </Link>
              <Link
                href={`/dashboard/blog/authors/${a.id}/edit`}
                aria-label={`Edit ${a.name}`}
                className="inline-flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
              >
                <PenLine className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
