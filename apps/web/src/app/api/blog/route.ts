import { NextResponse } from "next/server";
import { Prisma, prisma } from "@mykavo/database";
import { getBlogAdminGate } from "@/lib/blog-admin-server";
import { blogPostInputSchema } from "@/lib/blog-validation";
import { logger } from "@/lib/logger";

function isSlugConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** List every post (drafts included) - CMS admins only. */
export async function GET() {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ posts });
}

/**
 * Create a post. publishedAt honors an explicit editor value, otherwise it
 * is stamped when created directly as PUBLISHED.
 */
export async function POST(request: Request) {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = blogPostInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid post data.",
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    const post = await prisma.blogPost.create({
      data: {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content: input.content,
        status: input.status,
        authorName: input.authorName,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        primaryKeyword: input.primaryKeyword,
        secondaryKeyword: input.secondaryKeyword,
        tags: input.tags,
        publishedAt:
          input.publishedAt ?? (input.status === "PUBLISHED" ? new Date() : null),
      },
    });
    logger.info("blog post created", {
      postId: post.id,
      slug: post.slug,
      status: post.status,
      userId: gate.userId,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    if (isSlugConflict(err)) {
      return NextResponse.json(
        { error: "A post with this slug already exists.", code: "SLUG_TAKEN" },
        { status: 409 },
      );
    }
    throw err;
  }
}
