import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getBlogAdminGate } from "@/lib/blog-admin-server";
import { authorInputSchema } from "@/lib/blog-authors";
import { logger } from "@/lib/logger";
import { isNameConflict, uniqueAuthorSlug } from "@/lib/blog-authors-server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;

  const existing = await prisma.blogAuthor.findUnique({ where: { id }, select: { id: true, name: true, slug: true } });
  if (!existing) return NextResponse.json({ error: "Author not found." }, { status: 404 });

  const parsed = authorInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid author.", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  try {
    // The author page URL follows a rename; otherwise it stays put.
    const slug = parsed.data.name === existing.name ? existing.slug : await uniqueAuthorSlug(parsed.data.name, id);
    const author = await prisma.blogAuthor.update({ where: { id }, data: { ...parsed.data, slug } });
    logger.info("blog author updated", { authorId: id, userId: gate.userId });
    return NextResponse.json({ author });
  } catch (err) {
    if (isNameConflict(err)) {
      return NextResponse.json({ error: "An author with this name already exists." }, { status: 409 });
    }
    throw err;
  }
}

/** Removes the profile only - posts keep their author name as plain text. */
export async function DELETE(_request: Request, { params }: Params) {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;
  const existing = await prisma.blogAuthor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Author not found." }, { status: 404 });
  await prisma.blogAuthor.delete({ where: { id } });
  logger.info("blog author deleted", { authorId: id, userId: gate.userId });
  return NextResponse.json({ ok: true });
}
