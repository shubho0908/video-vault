import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";

import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Shubhojeet's Videos",
    template: "%s · Shubhojeet's Videos",
  },
  description:
    "Shubhojeet's private collection of unlisted YouTube explanations, notes, and references. Built for learning that lasts.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* preload the wallpaper the current viewport will paint (dark is the default theme) */}
        <link rel="preload" as="image" type="image/avif" href="/wp/mac-dark-1280.avif" media="(min-width: 1024px) and (hover: hover) and (pointer: fine) and (max-width: 1499px)" fetchPriority="high" />
        <link rel="preload" as="image" type="image/avif" href="/wp/mac-dark-2048.avif" media="(min-width: 1500px) and (hover: hover) and (pointer: fine)" fetchPriority="high" />
        <link rel="preload" as="image" type="image/avif" href="/wp/ios-dark-645.avif" media="(max-width: 499px), (hover: none)" fetchPriority="high" />
      </head>
      <body
        className={`${sans.variable} ${mono.variable} ${serif.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          {children}
          {modal}
        </ThemeProvider>
      </body>
    </html>
  );
}

