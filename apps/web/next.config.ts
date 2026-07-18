import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Monorepo: trace files from the repo root so workspace packages and the
  // Prisma query engine are bundled into the serverless functions. During
  // `next build` the cwd is apps/web, so ../.. is the repo root.
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  // Keep Prisma out of the bundle (its `export *` is CommonJS and breaks the
  // server bundle) — load it from node_modules at runtime; the engine binary is
  // included via output-file tracing above. Required for Prisma on Netlify/Lambda.
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/engines"],
  experimental: {
    // Client Router Cache: recently visited dashboard sections re-render
    // instantly from cache when switching back — dynamic pages stay fresh for
    // 30s, prefetched static content for 3 minutes.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // Dev-only CORS so the Expo WEB dev preview (http://localhost:8081) can call
  // the local Next dev server with credentials. No-op in production builds.
  async headers() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "http://localhost:8081" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PATCH,PUT,DELETE,OPTIONS",
          },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Accept" },
        ],
      },
    ];
  },
};

export default nextConfig;
