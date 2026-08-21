import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Image as ImageIcon,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  Youtube,
} from "lucide-react";

import { SignInButton } from "@/components/auth/sign-in-button";
import { VaultMark } from "@/components/journal/vault-mark";
import { getOwnerSession } from "@/lib/session";

export const metadata: Metadata = {
  description:
    "Shubhojeet's Videos is a private, single-owner learning journal: save unlisted YouTube explanations, write lasting notes, and keep references together.",
};

const features = [
  {
    icon: Youtube,
    title: "Unlisted video library",
    body: "Save YouTube explanations you learn from — unlisted links stay private, organized, and searchable.",
  },
  {
    icon: ListChecks,
    title: "Notes that stick",
    body: "Write Markdown notes with live preview so every explanation comes with the understanding you built around it.",
  },
  {
    icon: ImageIcon,
    title: "Private references",
    body: "Attach screenshots and diagrams. Images upload privately and are served through signed, expiring links.",
  },
] as const;

export default async function HomePage() {
  const session = await getOwnerSession();
  if (session) redirect("/dashboard");

  return (
    <main className="dot-grid relative flex min-h-[100dvh] flex-col px-5 py-10 sm:px-8">
      <div className="ambient-glow" aria-hidden="true" />

      <header className="reveal relative mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <VaultMark className="size-10 rounded-xl" />
          <div>
            <p className="text-sm font-medium leading-none tracking-tight">Shubhojeet&apos;s Videos</p>
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">Private learning journal</p>
          </div>
        </div>
        <Link
          href="/sign-in"
          className="group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          Sign in
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </header>

      <section className="reveal reveal-d1 relative mx-auto mt-16 w-full max-w-3xl text-center sm:mt-24">
        <h1 className="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
          A private home for the videos you learn from.
        </h1>
        <p className="mx-auto mt-6 max-w-[58ch] text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          Shubhojeet&apos;s Videos is a personal learning journal: collect unlisted YouTube explanations,
          capture them as Markdown notes, and keep the references that make them stick — all in one
          owner-only vault secured by Google sign-in.
        </p>
        <div className="mx-auto mt-9 w-full max-w-xs">
          <SignInButton />
        </div>
        <p className="mt-4 font-mono text-xs text-muted-foreground">Access is restricted to the journal&apos;s designated owner.</p>
      </section>

      <section className="reveal reveal-d2 relative mx-auto mt-20 grid w-full max-w-5xl gap-4 sm:mt-28 sm:grid-cols-3" aria-label="What this app does">
        {features.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="hairline-top rounded-2xl border border-border/80 bg-card/70 p-6 backdrop-blur-xl"
          >
            <span className="glow-primary inline-flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-base font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <section className="reveal reveal-d3 relative mx-auto mt-16 w-full max-w-3xl rounded-2xl border border-border/80 bg-card/50 p-6 backdrop-blur-xl sm:p-7">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="size-4 text-primary/80" aria-hidden="true" />
          About Google sign-in &amp; your data
        </h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-6 text-muted-foreground">
          This app uses Google sign-in solely to verify the identity of its single authorized owner.
          It requests only basic profile information (name and email address) and stores no other
          Google data. Access is denied to every other account, and journal contents are never shared.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/privacy" className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </section>

      <footer className="reveal reveal-d4 relative mx-auto mt-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 pt-16 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          Shubhojeet&apos;s Videos — a single-owner learning journal.
        </p>
        <p className="font-mono">Your videos remain unlisted. Your notes remain yours.</p>
      </footer>
    </main>
  );
}
