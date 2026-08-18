import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function JournalShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string | null | undefined;
}) {
  return (
    <div className="min-h-screen paper-grid">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-medium tracking-[-0.02em]">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"><BookOpenText className="size-4" /></span>
            <span>Learning Video Vault</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground md:block">{userName}</span>
            <Button asChild size="sm" className="rounded-lg">
              <Link href="/entries/new"><Plus /> New entry</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
