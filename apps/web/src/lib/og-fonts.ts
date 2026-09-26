import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Poppins for generated images (share cards, blog covers), so they match
 * the site. SIL OFL - licence in assets/fonts/OFL.txt. Returns undefined if
 * the files cannot be read, and the image renders in the default face
 * instead of failing.
 */
export async function loadOgFonts() {
  try {
    const dir = join(process.cwd(), "assets/fonts");
    const [bold, medium] = await Promise.all([
      readFile(join(dir, "Poppins-Bold.ttf")),
      readFile(join(dir, "Poppins-Medium.ttf")),
    ]);
    return [
      { name: "Poppins", data: bold, weight: 700 as const, style: "normal" as const },
      { name: "Poppins", data: medium, weight: 500 as const, style: "normal" as const },
    ];
  } catch {
    return undefined;
  }
}
