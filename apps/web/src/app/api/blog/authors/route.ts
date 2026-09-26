import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getBlogAdminGate } from "@/lib/blog-admin-server";
import { authorInputSchema } from "@/lib/blog-authors";
import { logger } from "@/lib/logger";
import { isNameConflict, uniqueAuthorSlug } from "@/lib/blog-authors-server";

/** Every author - CMS admins only. */
export async function GET() {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const authors = await prisma.blogAuthor.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ authors });
}

export async function POST(request: Request) {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const parsed = authorInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid author.", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  try {
    const author = await prisma.blogAuthor.create({
      data: { ...parsed.data, slug: await uniqueAuthorSlug(parsed.data.name) },
    });
    logger.info("blog author created", { authorId: author.id, userId: gate.userId });
    return NextResponse.json({ author }, { status: 201 });
  } catch (err) {
    if (isNameConflict(err)) {
      return NextResponse.json({ error: "An author with this name already exists." }, { status: 409 });
    }
    throw err;
  }
}
