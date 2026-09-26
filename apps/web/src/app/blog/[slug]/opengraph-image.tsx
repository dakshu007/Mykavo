import { ImageResponse } from "next/og";
import { prisma } from "@mykavo/database";
import { livePostWhere } from "@/lib/blog-schedule";
import { authorNameResolver } from "@/lib/blog-authors-server";
import { loadOgFonts } from "@/lib/og-fonts";

/**
 * The share card for one post - what LinkedIn, X, WhatsApp and Slack show,
 * and the image Google uses for the article. Generated from the post
 * itself, so every post gets its own without any design work: its title,
 * its author, its read time, in MyKavo's paper-gold-ink style.
 */

export const alt = "MyKavo blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/** Cached for an hour: the card changes only when the title does, and the
 *  blog index uses it as every post's thumbnail. */
export const revalidate = 3600;

const PAPER = "#FBFAF3";
const INK = "#151515";
const GOLD = "#FFD400";
const DIM = "#6B6B60";

type Params = { params: Promise<{ slug: string }> };

function Mark({ size: s }: { size: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path
        d="M5.4 3.3 L13.9 3.3 Q15.6 3.3 14.6 4.45 L3.8 15.45 Q3.25 16 3.8 16.55 L14.6 27.55 Q15.6 28.7 13.9 28.7 L5.4 28.7 Q3.2 28.7 3.2 26.5 L3.2 5.5 Q3.2 3.3 5.4 3.3 Z"
        fill={GOLD}
      />
      <path
        d="M10.35 16 L19.45 3.4 L15.85 12 L23.7 8.2 L16.55 14.5 L29.1 16 L16.55 17.5 L23.7 23.8 L15.85 20 L19.45 28.6 Z"
        fill={GOLD}
      />
    </svg>
  );
}

export default async function Image({ params }: Params) {
  const { slug } = await params;
  const fonts = await loadOgFonts();
  const post = await prisma.blogPost
    .findFirst({
      where: { slug, ...livePostWhere() },
      select: { title: true, authorName: true, content: true, tags: true },
    })
    .catch(() => null);

  const title = post?.title ?? "The MyKavo blog";
  const author = post ? (await authorNameResolver())(post.authorName) : "MyKavo";
  const minutes = post ? Math.max(1, Math.ceil(post.content.split(/\s+/).filter(Boolean).length / 200)) : null;
  // Long titles step down so they never overflow three lines.
  const fontSize = title.length > 90 ? 56 : title.length > 60 ? 66 : 76;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPER,
          padding: 36,
          fontFamily: fonts ? "Poppins" : undefined,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#FFFFFF",
            border: `4px solid ${INK}`,
            borderRadius: 32,
            boxShadow: `14px 14px 0 ${GOLD}`,
            padding: "52px 60px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 16,
                background: INK,
              }}
            >
              <Mark size={42} />
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: INK }}>MyKavo</div>
            <div
              style={{
                display: "flex",
                marginLeft: 12,
                padding: "6px 18px",
                borderRadius: 999,
                background: GOLD,
                border: `2px solid ${INK}`,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 3,
                color: INK,
              }}
            >
              BLOG
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -2,
              color: INK,
            }}
          >
            {title}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: DIM }}>
              {`By ${author}${minutes ? `  ·  ${minutes} min read` : ""}`}
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: INK }}>mykavo.app</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
