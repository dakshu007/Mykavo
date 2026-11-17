import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { getOwnedWebsite } from "@/lib/api-auth";
import { noStore, videoContext } from "@/lib/brand-video/api";
import { kitView } from "@/lib/brand-video/data";
import { imageSize } from "@/lib/brand-video/image-size";

type Params = { params: Promise<{ websiteId: string }> };
const MAX_BYTES = 1024 * 1024;

/** POST (multipart "file"): replace the logo with the owner's own PNG or JPEG. */
export async function POST(request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: true, bucket: "logo", limit: 10 });
  if (!gate.ok) return gate.response;
  const { websiteId } = await params;
  const website = await getOwnedWebsite(gate.ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const kit = await prisma.brandKit.findUnique({ where: { websiteId: website.id } });
  if (!kit) return NextResponse.json({ error: "The brand kit isn't ready yet." }, { status: 409 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    file = null;
  }
  if (!file) return NextResponse.json({ error: "Choose a PNG or JPEG file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Logos can be up to 1 MB." }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const size = imageSize(buf);
  if (!size) return NextResponse.json({ error: "That file isn't a PNG or JPEG image." }, { status: 400 });
  if (size.width < 16 || size.height < 16 || size.width > 4000 || size.height > 4000) {
    return NextResponse.json({ error: "Use a logo between 16 and 4000 pixels on each side." }, { status: 400 });
  }

  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 32);
  const key = `ws/${gate.ctx.workspace.id}/brand/${website.id}/logo-${hash}.${size.type === "png" ? "png" : "jpg"}`;
  const storage = getDefaultStorage();
  await storage.put(key, buf, size.type === "png" ? "image/png" : "image/jpeg");
  const saved = await prisma.brandKit.update({
    where: { websiteId: website.id },
    data: { logoKey: key, logoWidth: size.width, logoHeight: size.height, editedAt: new Date() },
  });
  if (kit.logoKey && kit.logoKey !== key) await storage.delete(kit.logoKey).catch(() => {});
  return NextResponse.json({ kit: await kitView(saved) }, { headers: noStore });
}
