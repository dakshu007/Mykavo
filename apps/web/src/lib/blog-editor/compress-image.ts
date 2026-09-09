/**
 * Shrink an image to a byte budget in the browser, before it is uploaded.
 *
 * WHY IN THE BROWSER, NOT PYTHON OR SHARP
 * ---------------------------------------
 * The obvious instinct is to compress server-side. It is the wrong place here:
 *
 *  - Python is not an option at all. This app runs as Next.js serverless
 *    functions on Netlify (Node runtime); there is no Python interpreter in
 *    that sandbox, and adding one is not possible.
 *  - sharp - which the scanner already uses to squeeze screenshots to 200 KB -
 *    is a native binary. It is a dependency of @mykavo/scanner, NOT of the web
 *    app, and pulling it into a Lambda purely for uploads risks breaking the
 *    bundle for a route that currently works.
 *  - Compressing server-side still means uploading the full original first,
 *    so a 9 MB phone photo has to cross the wire and clear the function's
 *    request-size limit before anything can shrink it.
 *
 * Doing it in the browser avoids all three: the big file never leaves the
 * machine, no new dependency ships, and the upload is small and fast. Canvas
 * re-encoding is what every CMS worth using does client-side.
 *
 * The strategy mirrors the scanner's compressScreenshot: try descending JPEG
 * quality first (which preserves dimensions, so the image stays sharp), and
 * only start reducing pixel dimensions when quality alone cannot reach the
 * budget. That order is what "best quality under the limit" actually means -
 * a slightly softer 1600px image beats a crisp 600px one.
 */

/** Byte budget for uploaded blog images, inline and banner alike. */
export const IMAGE_BUDGET_BYTES = 150 * 1024;

/** Quality ladder tried before any downscaling happens. */
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.45];

/** Width ladder, tried only once quality alone has failed. */
const WIDTH_STEPS = [2400, 1920, 1600, 1280, 1024, 800];

/** Formats we re-encode. GIF is passed through - re-encoding kills animation. */
const RE_ENCODABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface CompressionResult {
  file: File;
  /** Original size in bytes, for telling the user what happened. */
  originalBytes: number;
  /** Final size in bytes. */
  bytes: number;
  /** False when the image was already small enough, or could not be re-encoded. */
  compressed: boolean;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  // Safari fallback: decode through an <img> and a blob URL.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not decode the image."));
      img.src = url;
    });
    return img;
  } finally {
    // Revoking immediately is safe: the element has already decoded.
    URL.revokeObjectURL(url);
  }
}

function draw(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // Best available resampling - the difference is visible when downscaling.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // JPEG has no alpha; paint white underneath so transparent PNGs do not go black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Return a file at or below `budget` bytes, or the original when it is already
 * small enough or cannot safely be re-encoded (animated GIF). Never throws:
 * a failure to compress degrades to the original file, and the upload route's
 * own size limit remains the backstop.
 */
export async function compressImage(
  file: File,
  budget: number = IMAGE_BUDGET_BYTES,
): Promise<CompressionResult> {
  const originalBytes = file.size;
  const unchanged: CompressionResult = {
    file,
    originalBytes,
    bytes: originalBytes,
    compressed: false,
  };

  if (originalBytes <= budget) return unchanged;
  if (!RE_ENCODABLE.has(file.type.toLowerCase())) return unchanged;

  try {
    const source = await loadBitmap(file);
    const naturalWidth = "width" in source ? source.width : 0;
    const naturalHeight = "height" in source ? source.height : 0;
    if (!naturalWidth || !naturalHeight) return unchanged;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    let best: Blob | null = null;

    // Widths: the natural size first, then progressively smaller ones. Quality
    // is exhausted at each width before the image is allowed to shrink.
    const widths = [naturalWidth, ...WIDTH_STEPS.filter((w) => w < naturalWidth)];
    for (const width of widths) {
      const canvas = draw(source, width, (naturalHeight * width) / naturalWidth);
      if (!canvas) break;
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, "image/jpeg", quality);
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= budget) {
          return {
            file: new File([blob], name, { type: "image/jpeg" }),
            originalBytes,
            bytes: blob.size,
            compressed: true,
          };
        }
      }
    }

    // Nothing reached the budget - hand back the smallest we produced, which is
    // still far better than the original.
    if (best && best.size < originalBytes) {
      return {
        file: new File([best], name, { type: "image/jpeg" }),
        originalBytes,
        bytes: best.size,
        compressed: true,
      };
    }
    return unchanged;
  } catch {
    return unchanged;
  }
}

/** "2.4 MB" / "148 KB" - for telling the user what was shrunk. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
