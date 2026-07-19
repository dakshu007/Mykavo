import { NextResponse } from "next/server";
import { Prisma, prisma } from "@mykavo/database";
import { getBlogAdminGate } from "@/lib/blog-admin-server";
import { blogPostInputSchema } from "@/lib/blog-validation";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

function isSlugConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Update a post. An explicit editor-supplied publishedAt always wins;
 * otherwise it is set on first publish and preserved on re-publish and
 * unpublish (only ever set while null).
 */
export async function PATCH(request: Request, { params }: Params) {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, publishedAt: true },
  });
  if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

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
    const post = await prisma.blogPost.update({
      where: { id },
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
          input.publishedAt ??
          (input.status === "PUBLISHED" && !existing.publishedAt
            ? new Date()
            : existing.publishedAt),
      },
    });
    logger.info("blog post updated", {
      postId: post.id,
      slug: post.slug,
      status: post.status,
      userId: gate.userId,
    });
    return NextResponse.json({ post });
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

/** Permanently delete a post. */
export async function DELETE(_request: Request, { params }: Params) {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  await prisma.blogPost.delete({ where: { id } });
  logger.info("blog post deleted", { postId: id, userId: gate.userId });
  return NextResponse.json({ ok: true });
}
