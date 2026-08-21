import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { VaultMark } from "@/components/journal/vault-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="dot-grid relative flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="reveal relative max-w-md text-center">
        <div className="flex justify-center"><VaultMark className="size-12 rounded-xl" /></div>
        <p className="tnum mt-8 font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight">This page isn&apos;t in the vault.</h1>
        <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground">
          The entry you are looking for may have been deleted or never existed.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/dashboard"><ChevronLeft /> Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
