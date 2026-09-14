import { JournalShell } from "@/components/journal/journal-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewEntryLoading() {
  return (
    <JournalShell userName={undefined}>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-5 h-12 w-full max-w-lg" />
        <div className="mt-9 max-w-3xl space-y-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    </JournalShell>
  );
}
