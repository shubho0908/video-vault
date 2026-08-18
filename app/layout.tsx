import type { Metadata } from "next";
import { DM_Sans, Newsreader } from "next/font/google";

import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Learning Video Vault",
  description: "A private journal for video-based learning.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
