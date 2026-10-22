import type { NextConfig } from "next";

// Cache stable wallpaper and icon URLs; permit background revalidation.
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
