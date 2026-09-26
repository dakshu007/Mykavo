import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@mykavo/database";
import { requireSession } from "@/lib/session";
import { isBlogAdmin } from "@/lib/blog-admin";
import { AuthorForm } from "@/components/blog/author-form";

export const metadata: Metadata = { title: "Edit author" };

type Params = { params: Promise<{ id: string }> };

export default async function EditBlogAuthorPage({ params }: Params) {
  const session = await requireSession();
  if (!isBlogAdmin(session.user.email)) notFound();
  const { id } = await params;
  const author = await prisma.blogAuthor.findUnique({ where: { id } }).catch(() => null);
  if (!author) notFound();
  return (
    <AuthorForm
      author={{
        id: author.id,
        slug: author.slug,
        name: author.name,
        role: author.role,
        bio: author.bio,
        imageUrl: author.imageUrl,
        linkedinUrl: author.linkedinUrl,
        xUrl: author.xUrl,
        githubUrl: author.githubUrl,
        websiteUrl: author.websiteUrl,
        highlights: author.highlights,
      }}
    />
  );
}
