import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getBlogAdminGate } from "@/lib/blog-admin-server";

/**
 * Blog posts for the phone: every post, drafts included, newest edit first.
 *
 * Deliberately does NOT return `content`. Markdown bodies run to thousands of
 * words and the phone screen cannot edit them anyway - sending them would
 * cost mobile data to display nothing. The app lists and publishes; writing
 * stays on the web editor, which this list links out to.
 */
export async function GET() {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      status: p.status,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}
