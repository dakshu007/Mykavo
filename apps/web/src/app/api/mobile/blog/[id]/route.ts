import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getBlogAdminGate } from "@/lib/blog-admin-server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/**
 * Status only. The web CMS's PATCH takes a whole post and rewrites every
 * field, which is right for an editor and wrong for a phone: to flip a draft
 * live the app would have to download the full markdown and send it back,
 * and any field the mobile client did not know about would be erased on the
 * round trip. This endpoint cannot damage a post's content because it never
 * receives it.
 */
const bodySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function PATCH(request: Request, { params }: Params) {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected a status of DRAFT or PUBLISHED." },
      { status: 400 },
    );
  }
  const { status } = parsed.data;

  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, publishedAt: true, title: true },
  });
  if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      status,
      // Stamped on FIRST publish and preserved thereafter - the same rule the
      // web editor follows, so a post unpublished and republished from the
      // phone keeps its original publication date rather than jumping to
      // today and reordering the blog.
      publishedAt:
        status === "PUBLISHED" && existing.publishedAt === null
          ? new Date()
          : existing.publishedAt,
    },
    select: { id: true, status: true, publishedAt: true, updatedAt: true },
  });

  logger.info("blog post status changed from mobile", {
    userId: gate.userId,
    postId: post.id,
    status,
  });

  return NextResponse.json({
    id: post.id,
    status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
  });
}
