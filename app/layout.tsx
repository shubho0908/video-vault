import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";

import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { wallpaperBootScript } from "@/lib/wallpaper-boot";

// The Finder/iOS UI (every route) renders in system fonts via `.fx`, so none of these faces is needed for
// first paint. They only show up in secondary UI: Geist in Radix dialog portals outside `.fx`, Geist Mono
// in the notes editor and code blocks, Newsreader in the editor preview's headings. Don't preload them;
// the @font-face rules stay, so the browser still fetches a face (with swap) as soon as it is rendered.
const sans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const serif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
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
        {/*
          Paint the saved wallpaper on the very first frame: this sync script copies the stored choice onto
          <html data-wall-*> (finder.css does the painting) and preloads the exact image for this
          viewport, theme and choice. It must stay inline and blocking, like the next-themes class script.
        */}
        <script dangerouslySetInnerHTML={{ __html: wallpaperBootScript() }} />
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

