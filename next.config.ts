import type { NextConfig } from "next";

// public/ files are served with max-age=0 by default, which forces a revalidation round trip for the
// wallpaper (the LCP image) and every icon on each visit. These filenames are stable, so cache them
// for a day and let stale copies serve for a week while the browser refreshes in the background.
const staticAsset = [
  {
    key: "Cache-Control",
    value: "public, max-age=86400, stale-while-revalidate=604800",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/wp/:path*", headers: staticAsset },
      { source: "/icons/:path*", headers: staticAsset },
      { source: "/avatar.webp", headers: staticAsset },
    ];
  },
};

export default nextConfig;
