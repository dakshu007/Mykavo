import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@mykavo/database";
import { requireSession } from "@/lib/session";
import { isBlogAdmin } from "@/lib/blog-admin";
import { BlogPostEditor } from "@/components/blog/post-editor";

export const metadata: Metadata = { title: "Edit Post" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!isBlogAdmin(session.user.email)) notFound();

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      status: true,
      authorName: true,
      seoTitle: true,
      seoDescription: true,
    },
  });
  if (!post) notFound();

  return <BlogPostEditor post={post} />;
}
