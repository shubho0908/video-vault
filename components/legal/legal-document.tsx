import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

import { VaultMark } from "@/components/journal/vault-mark";

/**
 * Single point of contact shown across the legal pages.
 * Update this if the owner contact address changes.
 */
export const LEGAL_CONTACT_EMAIL = "hey@shubhojeet.com";

export const LEGAL_LAST_UPDATED = "February 2026";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export type LegalDoc = {
  /** Small uppercase label above the title, e.g. "Legal". */
  kicker: string;
  title: string;
  /** Short lede paragraph rendered directly under the title. */
  intro: ReactNode;
  sections: LegalSection[];
};

function Email({ children }: { children?: ReactNode }) {
  return (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className="break-all text-primary underline decoration-primary/40 underline-offset-[0.18em] transition-colors hover:text-accent-foreground"
    >
      {children ?? LEGAL_CONTACT_EMAIL}
    </a>
  );
}

/** Body paragraph. */
function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[0.9375rem] sm:leading-[1.75rem]">
      {children}
    </p>
  );
}

/** Accent-bulleted list. Items may be strings or nodes. */
function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3.5 space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-primary/70"
          />
          <span className="min-w-0 text-sm leading-6 text-muted-foreground sm:text-[0.9375rem]">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export { Email, P, UL };

export function LegalDocument({
  doc,
  other,
}: {
  doc: LegalDoc;
  /** Link to the sibling legal page shown in the footer. */
  other: { href: "/privacy" | "/terms"; label: string };
}) {
  return (
    <main className="dot-grid relative min-h-[100dvh]">
      <div className="ambient-glow" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[42rem] px-4 py-8 sm:px-6 sm:py-14">
        {/* Masthead */}
        <header className="reveal flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <VaultMark className="size-9 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-none tracking-tight">
                Shubhojeet&apos;s Videos
              </p>
              <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">
                Private learning journal
              </p>
            </div>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to sign-in
          </Link>
        </header>

        <article className="hairline-top reveal reveal-d1 mt-8 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-[0_32px_90px_-40px_oklch(0.1_0.04_265_/_0.65)] backdrop-blur-2xl sm:mt-10 sm:p-9 lg:p-11">
          {/* Title block */}
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-primary">
              {doc.kicker}
            </p>
            <h1 className="mt-3 font-serif text-[1.85rem] font-medium leading-[1.08] tracking-[-0.02em] text-balance sm:text-4xl lg:text-[2.6rem]">
              {doc.title}
            </h1>
            <div className="mt-4 max-w-[58ch] text-pretty text-sm leading-6 text-muted-foreground sm:leading-7">
              {doc.intro}
            </div>
            <p className="tnum mt-4 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
              Last updated · {LEGAL_LAST_UPDATED}
            </p>
          </div>

          {/* Table of contents */}
          <nav
            aria-label="On this page"
            className="mt-8 rounded-xl border border-border/70 bg-background/50 p-4 sm:mt-10 sm:p-5"
          >
            <p className="px-0.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              On this page
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {doc.sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="tnum rounded-md border border-transparent px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground"
                >
                  <span className="mr-1.5 text-[0.65rem] text-primary/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </a>
              ))}
            </div>
          </nav>

          {/* Sections */}
          <div className="mt-8 divide-y divide-border/60 sm:mt-10">
            {doc.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-6 py-7 first:pt-0 last:pb-0 sm:py-8 [&>p:first-child]:mt-0 [&>ul:first-child]:mt-0"
              >
                <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    aria-hidden="true"
                    className="tnum font-mono text-[0.7rem] tracking-widest text-primary/80"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-xl font-medium leading-snug tracking-[-0.01em] sm:text-[1.35rem]">
                    {section.title}
                  </span>
                </h2>
                {section.body}
              </section>
            ))}
          </div>
        </article>

        {/* Footer navigation */}
        <footer className="reveal reveal-d3 mt-6 sm:mt-8">
          <div className="hairline-top rounded-2xl border border-border/80 bg-card/50 p-4 backdrop-blur-xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ShieldCheck className="size-3.5 text-primary/80" aria-hidden="true" />
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <FileText className="size-3.5 text-primary/80" aria-hidden="true" />
                  Terms of Service
                </Link>
              </div>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-accent-foreground"
              >
                Continue to sign-in
                <ArrowLeft className="size-3.5 rotate-180" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-4 border-t border-border/50 pt-3.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              Questions? <Email />
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
