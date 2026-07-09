import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { isBlogAdmin } from "@/lib/blog-admin";
import { BlogPostEditor } from "@/components/blog/post-editor";

export const metadata: Metadata = { title: "New Post" };

export default async function NewBlogPostPage() {
  const session = await requireSession();
  if (!isBlogAdmin(session.user.email)) notFound();

  return <BlogPostEditor />;
}
