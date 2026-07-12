"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROFILE_IMAGE_MAX_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
} from "@/app/api/profile/schema";

/** Avatars are cropped to a centered square and resized to this edge length. */
const AVATAR_SIZE = 256;

/** JPEG qualities to try, best first; a 256×256 JPEG at 0.85 is ~10–30 KB. */
const JPEG_QUALITIES = [0.85, 0.7, 0.5] as const;

type Status = "idle" | "processing" | "saving" | "saved";

/**
 * Profile editor (settings page): circular avatar preview with client-side
 * canvas downscaling, plus name editing. Persists through POST /api/profile,
 * which re-validates everything server-side.
 */
export function ProfileForm({
  initialName,
  initialImage,
}: {
  initialName: string;
  initialImage: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState<string | null>(initialImage);
  const [imageChanged, setImageChanged] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const initial = (name.trim().charAt(0) || initialName.charAt(0) || "?").toUpperCase();
  const busy = status === "saving" || status === "processing";

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again re-triggers onChange.
    event.target.value = "";
    if (!file) return;
    setError("");
    setStatus("processing");
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setImage(dataUrl);
      setImageChanged(true);
    } catch {
      setError("Could not process that image. Try a JPEG or PNG file.");
    }
    setStatus("idle");
  }

  function removePhoto() {
    setImage(null);
    setImageChanged(true);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your name.");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      // Only send `image` when it changed — OAuth avatars can be remote URLs,
      // which the API (correctly) refuses to accept back.
      const body: { name: string; image?: string | null } = { name: trimmed };
      if (imageChanged) body.image = image;
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save your profile.");
      setImageChanged(false);
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center gap-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar may be an inline data URL, which next/image cannot optimize
          <img
            src={image}
            alt="Profile photo"
            className="size-16 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary"
          >
            {initial}
          </span>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {status === "processing" && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Upload photo
            </Button>
            {image && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removePhoto}
                disabled={busy}
              >
                Remove photo
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[13px] text-ink-faint">
            JPEG or PNG. Cropped to a square and resized to {AVATAR_SIZE}×{AVATAR_SIZE}.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
          aria-label="Choose profile photo"
        />
      </div>

      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-ink">
          Name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={PROFILE_NAME_MAX_LENGTH}
          required
          autoComplete="name"
          className="h-11 w-full max-w-sm rounded-field border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy}>
        {status === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {status === "saved" && <Check className="size-4" aria-hidden />}
        {status === "saved" ? "Saved" : "Save profile"}
      </Button>
    </form>
  );
}

/**
 * Downscale/crop a picked file to a centered 256×256 square JPEG data URL.
 * Steps down quality if the encoded result would exceed the server's cap.
 */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const img = await decodeImageFile(file);
  const sourceSide = Math.min(img.naturalWidth, img.naturalHeight);
  if (sourceSide === 0) throw new Error("Empty image");

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");

  // JPEG has no alpha channel — flatten transparent PNGs onto white.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingQuality = "high";
  context.drawImage(
    img,
    (img.naturalWidth - sourceSide) / 2,
    (img.naturalHeight - sourceSide) / 2,
    sourceSide,
    sourceSide,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  for (const quality of JPEG_QUALITIES) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= PROFILE_IMAGE_MAX_LENGTH) return dataUrl;
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
