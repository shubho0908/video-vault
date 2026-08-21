import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { VaultMark } from "@/components/journal/vault-mark";

export function JournalShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string | null | undefined;
}) {
  return (
    <div className="dot-grid relative min-h-[100dvh]">
      <div className="ambient-glow" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 text-sm font-medium tracking-tight"
          >
            <VaultMark className="transition-transform duration-300 group-hover:scale-105" />
            <span className="hidden sm:inline">
              Learning Video <span className="text-primary">Vault</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="tnum hidden max-w-44 truncate font-mono text-xs text-muted-foreground md:block">
              {userName}
            </span>
            <ThemeToggle />
            <Button asChild size="sm" className="ml-1">
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
