import { redirect } from "next/navigation";
import { BookOpenText, LockKeyhole, Sparkles } from "lucide-react";

import { SignInButton } from "@/components/auth/sign-in-button";
import { Card, CardContent } from "@/components/ui/card";
import { getOwnerSession } from "@/lib/session";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ restricted?: string }> }) {
  const session = await getOwnerSession();
  if (session) redirect("/dashboard");
  const { restricted } = await searchParams;

  return (
    <main className="paper-grid flex min-h-screen items-center justify-center px-5 py-10">
      <Card className="w-full max-w-md border-border/80 bg-card/95 py-0 shadow-[0_24px_80px_-36px_oklch(0.23_0.06_270_/_0.45)]">
        <CardContent className="p-7 sm:p-9">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><BookOpenText className="size-5" /></span>
            <div><p className="font-medium leading-none">Learning Video Vault</p><p className="mt-1 text-sm text-muted-foreground">Private learning journal</p></div>
          </div>
          <h1 className="font-serif text-4xl leading-[0.98] tracking-[-0.04em]">Return to your notes.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">A focused place for the explanations you record, the ideas you keep, and the references that make them stick.</p>
          {restricted ? <p className="mt-5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">This journal is restricted to its designated owner account.</p> : null}
          <div className="mt-8"><SignInButton /></div>
          <div className="mt-7 flex items-center gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="size-3.5 shrink-0" /> Owner-only access is verified after Google sign-in.</div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="size-3.5 shrink-0" /> Your videos remain unlisted. Your notes remain yours.</div>
        </CardContent>
      </Card>
    </main>
  );
}
