import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { isBlogAdmin } from "@/lib/blog-admin";
import { AuthorForm } from "@/components/blog/author-form";

export const metadata: Metadata = { title: "Add author" };

export default async function NewBlogAuthorPage() {
  const session = await requireSession();
  if (!isBlogAdmin(session.user.email)) notFound();
  return <AuthorForm />;
}
