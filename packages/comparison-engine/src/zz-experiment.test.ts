import { it } from "vitest";
import { compareScreenshots } from "./visual";
// eslint-disable-next-line
const sharp = require("/home/user/Mykavo/node_modules/.pnpm/sharp@0.35.4_@types+node@20.19.43/node_modules/sharp");

function svgPage(height: number, variant = 0): string {
  let body = "";
  let y = 40;
  let i = 0;
  while (y < height - 100) {
    if (i % 7 === 0) { body += `<rect x="80" y="${y}" width="1280" height="220" fill="hsl(${(i*37)%360},50%,60%)"/>`; y += 260; }
    else { body += `<text x="80" y="${y}" font-family="DejaVu Sans" font-size="${i%5===0?32:16}" fill="#222">Paragraph ${i} lorem ipsum dolor sit amet consectetur adipiscing elit ${variant && i===3 ? "CHANGED" : ""} sed do eiusmod tempor</text>`; y += i%5===0?60:28; }
    i++;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="${height}"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`;
}
async function capture(height: number, variant = 0) {
  return sharp(Buffer.from(svgPage(height, variant))).jpeg({ quality: 80 }).toBuffer();
}
const CAP = 1440 * 2600;
async function store(raw: Buffer, rung: { quality: number; width?: number }) {
  const m = await sharp(raw).metadata();
  const px = m.width * m.height;
  const capW = px > CAP ? Math.max(640, Math.round(m.width * Math.sqrt(CAP / px))) : undefined;
  const width = capW ? Math.min(capW, rung.width ?? capW) : rung.width;
  let p = sharp(raw); if (width) p = p.resize({ width, withoutEnlargement: true });
  return p.jpeg({ quality: rung.quality, mozjpeg: true }).toBuffer();
}
it("experiment", async () => {
  const cases: Array<[string, number, number, any, any, number]> = [
    ["same h, same rung", 2400, 2400, { quality: 72 }, { quality: 72 }, 0],
    ["same h, q72 vs q44", 2400, 2400, { quality: 72 }, { quality: 44 }, 0],
    ["same h, q72 vs 1280w", 2400, 2400, { quality: 72 }, { quality: 60, width: 1280 }, 0],
    ["tall 4000 vs 4012 (pixel cap)", 4000, 4012, { quality: 72 }, { quality: 72 }, 0],
    ["tall 4000 vs 4000", 4000, 4000, { quality: 72 }, { quality: 72 }, 0],
    ["same h, one-word edit", 2400, 2400, { quality: 72 }, { quality: 72 }, 1],
  ];
  for (const [name, h1, h2, r1, r2, v] of cases) {
    const a = await store(await capture(h1), r1);
    const b = await store(await capture(h2, v), r2);
    const r = compareScreenshots(a, b)!;
    const ma = await sharp(a).metadata(); const mb = await sharp(b).metadata();
    process.stderr.write("XX "+`${name}: ${ma.width}x${ma.height} vs ${mb.width}x${mb.height} content=${r.contentDifferencePercentage.toFixed(1)} pixel=${r.differencePercentage.toFixed(1)}\n`);
  }
}, 60000);
