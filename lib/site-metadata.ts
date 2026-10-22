import type { Metadata } from "next";

// Sharing URLs must use the public site, not an OAuth callback, localhost, or a Vercel preview host.
export const siteMetadata = {
  metadataBase: new URL("https://videos.shubhojeet.com"),
  title: {
    default: "Shubhojeet's Videos",
    template: "%s · Shubhojeet's Videos",
  },
  description:
    "Shubhojeet's private collection of unlisted YouTube explanations, notes, and references. Built for learning that lasts.",
  openGraph: {
    type: "website",
    url: "/",
  },
  // The opengraph-image.jpg file convention supplies the image, dimensions, MIME type and alt text.
  // Next.js also derives the Twitter large-image card and route-specific titles/descriptions from it.
  robots: { index: false, follow: false },
} satisfies Metadata;
