import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getDefaultStorage } from "@fluxen/scanner/storage";
import { getBlogAdminGate } from "@/lib/blog-admin-server";
import { logger } from "@/lib/logger";

/**
 * Blog image upload — CMS admins only. Accepts multipart form data (field
 * "file") or a raw image body, stores the bytes in the artifact store under
 * `blog-images/<id>.<ext>`, and returns the public serving URL
 * (`/api/blog-images/<name>`, no auth — blog images are public).
 */

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  const gate = await getBlogAdminGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const requestType = (request.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  let mime: string;
  let data: Buffer;
  if (requestType === "multipart/form-data") {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field." }, { status: 400 });
    }
    mime = file.type.toLowerCase();
    data = Buffer.from(await file.arrayBuffer());
  } else {
    mime = requestType;
    data = Buffer.from(await request.arrayBuffer());
  }

  const extension = EXTENSION_BY_MIME[mime];
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." },
      { status: 415 },
    );
  }
  if (data.byteLength === 0) {
    return NextResponse.json({ error: "Empty image." }, { status: 400 });
  }
  if (data.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is larger than 2 MB." }, { status: 413 });
  }

  const name = `${randomBytes(16).toString("hex")}.${extension}`;
  await getDefaultStorage().put(`blog-images/${name}`, data, mime);

  logger.info("blog image uploaded", {
    userId: gate.userId,
    name,
    bytes: data.byteLength,
    mime,
  });
  return NextResponse.json({ url: `/api/blog-images/${name}` }, { status: 201 });
}
