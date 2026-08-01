"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME_MAX_LENGTH } from "@/app/api/workspace/branding/schema";

/** Logos keep their aspect ratio inside this bounding box (px). */
const LOGO_MAX_EDGE = 320;

/** PNG first (logos want transparency); JPEG fallbacks keep size in check. */
const LOGO_MAX_LENGTH = 260_000;

type Status = "idle" | "processing" | "saving" | "saved";

/**
 * Agency branding editor (settings page, Pro): name, logo, and accent color
 * for white-label client reports. Mirrors ProfileForm's avatar pipeline -
 * client-side canvas downscale to a data URL, server re-validates and stores
 * bytes in object storage. Free workspaces see a preview + upgrade path
 * instead of the form.
 */
export function BrandingForm({
  initialName,
  initialLogoUrl,
  initialColor,
  isPro,
  canEdit,
}: {
  initialName: string | null;
  initialLogoUrl: string | null;
  initialColor: string | null;
  isPro: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName ?? "");
  const [logo, setLogo] = useState<string | null>(initialLogoUrl);
  const [logoChanged, setLogoChanged] = useState(false);
  const [color, setColor] = useState(initialColor ?? "#FFD400");
  const [useColor, setUseColor] = useState(initialColor !== null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const busy = status === "saving" || status === "processing";

  if (!isPro) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-secondary">
          Put your agency&apos;s name, logo, and color on every client report -
          your clients see your brand, not ours.
        </p>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Upgrade to Pro to white-label reports
        </Link>
      </div>
    );
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setStatus("processing");
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setLogo(dataUrl);
      setLogoChanged(true);
    } catch {
      setError("Could not process that image. Try a JPEG or PNG file.");
    }
    setStatus("idle");
  }

  function removeLogo() {
    setLogo(null);
    setLogoChanged(true);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !canEdit) return;
    setStatus("saving");
    setError("");
    try {
      const trimmed = name.trim();
      const body: {
        brandName: string | null;
        brandColor: string | null;
        logo?: string | null;
      } = {
        brandName: trimmed || null,
        brandColor: useColor ? color : null,
      };
      if (logoChanged) body.logo = logo;
      const res = await fetch("/api/workspace/branding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save branding.");
      setLogoChanged(false);
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not save branding.");
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <p className="text-sm text-ink-secondary">
        Shown on every shared client report instead of MyKavo branding. Leave
        the name empty to switch reports back to MyKavo branding.
      </p>

      <div className="flex items-center gap-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo may be an inline data URL, which next/image cannot optimize
          <img
            src={logo}
            alt="Agency logo"
            className="size-16 shrink-0 rounded-tile border border-line bg-card object-contain p-1"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-tile border border-dashed border-line text-[11px] text-ink-faint"
          >
            Logo
          </span>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || !canEdit}
            >
              {status === "processing" && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Upload logo
            </Button>
            {logo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeLogo}
                disabled={busy || !canEdit}
              >
                Remove logo
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[13px] text-ink-faint">
            JPEG or PNG, scaled to fit {LOGO_MAX_EDGE}px. Transparent PNGs keep
            their transparency.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
          aria-label="Choose agency logo"
        />
      </div>

      <div>
        <label htmlFor="brand-name" className="mb-1.5 block text-sm font-medium text-ink">
          Agency name
        </label>
        <input
          id="brand-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={BRAND_NAME_MAX_LENGTH}
          placeholder="Northwind Digital"
          disabled={!canEdit}
          className="h-11 w-full max-w-sm rounded-field border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none disabled:opacity-60"
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Accent color</span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={useColor}
              onChange={(e) => setUseColor(e.target.checked)}
              disabled={!canEdit}
              className="size-4 accent-[#101010]"
            />
            Use a custom accent
          </label>
          {useColor && (
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={!canEdit}
              aria-label="Accent color"
              className="h-9 w-14 cursor-pointer rounded-field border border-line bg-card p-1"
            />
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy || !canEdit}>
        {status === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {status === "saved" && <Check className="size-4" aria-hidden />}
        {status === "saved" ? "Saved" : "Save branding"}
      </Button>
      {!canEdit && (
        <p className="text-[13px] text-ink-faint">
          Only workspace owners and admins can change branding.
        </p>
      )}
    </form>
  );
}

/**
 * Downscale a picked file to fit LOGO_MAX_EDGE, preserving aspect ratio and
 * PNG transparency. Falls back through JPEG qualities if PNG is too large.
 */
async function fileToLogoDataUrl(file: File): Promise<string> {
  const img = await decodeImageFile(file);
  if (img.naturalWidth === 0 || img.naturalHeight === 0) throw new Error("Empty image");

  const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.imageSmoothingQuality = "high";
  context.drawImage(img, 0, 0, width, height);

  const png = canvas.toDataURL("image/png");
  if (png.length <= LOGO_MAX_LENGTH) return png;
  for (const quality of [0.85, 0.7, 0.5]) {
    const jpeg = canvas.toDataURL("image/jpeg", quality);
    if (jpeg.length <= LOGO_MAX_LENGTH) return jpeg;
  }
  throw new Error("Image too large after compression");
}

function decodeImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}
