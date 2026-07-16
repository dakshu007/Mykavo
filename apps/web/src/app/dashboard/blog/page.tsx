import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, PenLine, Plus } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession } from "@/lib/session";
import { isBlogAdmin } from "@/lib/blog-admin";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { PostStatusBadge } from "@/components/blog/status-badge";
import { DeletePostButton } from "@/components/blog/delete-post-button";

export const metadata: Metadata = { title: "Blog" };

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function DashboardBlogPage() {
  const session = await requireSession();
  if (!isBlogAdmin(session.user.email)) notFound();

  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={PenLine}
        title="No posts yet"
        description="Write your first post in Markdown and publish it straight to /blog — no redeploy needed. Drafts stay private until you publish."
        action={<ButtonLink href="/dashboard/blog/new">Write your first post</ButtonLink>}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="Blog posts"
        action={
          <ButtonLink href="/dashboard/blog/new" size="sm">
            <Plus className="size-4" aria-hidden /> New Post
          </ButtonLink>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-140 text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="label-micro py-3 pr-4 font-semibold">Title</th>
              <th className="label-micro px-4 py-3 font-semibold">Status</th>
              <th className="label-micro px-4 py-3 font-semibold">Updated</th>
              <th className="label-micro px-4 py-3 font-semibold">Published</th>
              <th className="py-3 pl-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="max-w-90 py-3.5 pr-4">
                  <Link
                    href={`/dashboard/blog/${post.id}/edit`}
                    className="block truncate text-sm font-medium text-ink hover:text-primary"
                  >
                    {post.title}
                  </Link>
                  <span className="block truncate font-mono text-xs text-ink-faint">
                    /blog/{post.slug}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <PostStatusBadge status={post.status} />
                </td>
                <td className="px-4 py-3.5 text-sm text-ink-secondary">
                  {dateFormat.format(post.updatedAt)}
                </td>
                <td className="px-4 py-3.5 text-sm text-ink-secondary">
                  {post.publishedAt ? dateFormat.format(post.publishedAt) : "—"}
                </td>
                <td className="py-3.5 pl-4">
                  <div className="flex items-center justify-end gap-1">
                    {post.status === "PUBLISHED" && (
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        aria-label={`View "${post.title}" on the public blog`}
                        className="inline-flex size-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
                      >
                        <ExternalLink className="size-4" aria-hidden />
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/blog/${post.id}/edit`}
                      aria-label={`Edit "${post.title}"`}
                      className="inline-flex size-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                      <PenLine className="size-4" aria-hidden />
                    </Link>
                    <DeletePostButton postId={post.id} title={post.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
