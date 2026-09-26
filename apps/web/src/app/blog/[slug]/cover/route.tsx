import { ImageResponse } from "next/og";
import { prisma } from "@mykavo/database";
import { livePostWhere } from "@/lib/blog-schedule";
import { displayTags } from "@/lib/blog-display";
import { loadOgFonts } from "@/lib/og-fonts";
import { coverPalette, coverTopicSize } from "@/lib/blog-cover";

/**
 * A post's cover for the blog index - deliberately NOT the share card. The
 * share card carries the title, and on the index the title is printed right
 * under the image, so the cover shows what the title does not: the topic,
 * over MyKavo's before/after motif, in one of three palettes picked from the
 * slug so a page of covers never looks like one image repeated.
 */

const INK = "#151515";
const RED = "#C4262C";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const [fonts, post] = await Promise.all([
    loadOgFonts(),
    prisma.blogPost
      .findFirst({ where: { slug, ...livePostWhere() }, select: { tags: true, content: true } })
      .catch(() => null),
  ]);

  const topic = (post && displayTags(post.tags)[0]) || "Guide";
  const minutes = post ? Math.max(1, Math.ceil(post.content.split(/\s+/).filter(Boolean).length / 200)) : null;
  const p = coverPalette(slug);
  const topicSize = coverTopicSize(topic);

  const page = (changed: boolean) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: 200,
        padding: 18,
        borderRadius: 20,
        background: p.card,
        border: `3px solid ${p.edge}`,
      }}
    >
      <div style={{ display: "flex", height: 16, width: 96, borderRadius: 8, background: p.line }} />
      <div style={{ display: "flex", height: 11, width: 160, borderRadius: 6, background: p.line }} />
      <div style={{ display: "flex", height: 11, width: 136, borderRadius: 6, background: p.line }} />
      <div
        style={{
          display: "flex",
          height: 34,
          width: 120,
          borderRadius: 999,
          marginTop: 6,
          background: changed ? "transparent" : INK,
          border: changed ? `3px dashed ${RED}` : `3px solid ${INK}`,
        }}
      />
      <div style={{ display: "flex", height: 11, width: 150, borderRadius: 6, background: p.line }} />
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: p.bg,
          padding: "0 64px",
          gap: 40,
          fontFamily: fonts ? "Poppins" : undefined,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 6, color: p.sub }}>MYKAVO BLOG</div>
          <div style={{ display: "flex", fontSize: topicSize, fontWeight: 700, lineHeight: 1, letterSpacing: -3, color: p.fg }}>
            {topic}
          </div>
          {minutes && (
            <div style={{ display: "flex", marginTop: 14, fontSize: 30, fontWeight: 500, color: p.sub }}>{`${minutes} min read`}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
          <div style={{ display: "flex", transform: "rotate(-4deg)" }}>{page(false)}</div>
          <div style={{ display: "flex", transform: "rotate(3deg)" }}>{page(true)}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
