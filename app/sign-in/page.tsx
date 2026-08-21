import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";

import { SignInButton } from "@/components/auth/sign-in-button";
import { VaultMark } from "@/components/journal/vault-mark";
import { getOwnerSession } from "@/lib/session";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ restricted?: string }> }) {
  const session = await getOwnerSession();
  if (session) redirect("/dashboard");
  const { restricted } = await searchParams;

  return (
    <main className="dot-grid relative flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="reveal relative w-full max-w-md">
        <div className="hairline-top rounded-2xl border border-border/80 bg-card/80 p-7 shadow-[0_32px_90px_-40px_oklch(0.1_0.04_265_/_0.65)] backdrop-blur-2xl sm:p-9">
          <div className="mb-8 flex items-center gap-3">
            <VaultMark className="size-10 rounded-xl" />
            <div>
              <p className="text-sm font-medium leading-none tracking-tight">Shubhojeet's Videos</p>
              <p className="mt-1.5 font-mono text-xs text-muted-foreground">Private learning journal</p>
            </div>
          </div>
          <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-balance sm:text-[2.75rem]">
            Return to your notes.
          </h1>
          <p className="mt-4 max-w-[42ch] text-sm leading-6 text-muted-foreground text-pretty">
            A focused place for the explanations you record, the ideas you keep, and the references that make them stick.
          </p>
          {restricted ? (
            <p role="alert" className="mt-5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              This journal is restricted to its designated owner account.
            </p>
          ) : null}
          <div className="mt-8"><SignInButton /></div>
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground">
              Privacy Policy
            </Link>.
          </p>
          <div className="mt-8 space-y-2.5 border-t border-border/60 pt-6">
            <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
              <LockKeyhole className="size-3.5 shrink-0 text-primary/80" /> Owner-only access is verified after Google sign-in.
            </p>
            <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0 text-primary/80" /> Your videos remain unlisted. Your notes remain yours.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
