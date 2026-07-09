import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client Router Cache: recently visited dashboard sections re-render
    // instantly from cache when switching back — dynamic pages stay fresh for
    // 30s, prefetched static content for 3 minutes.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
