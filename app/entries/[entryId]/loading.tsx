import { JournalShell } from "@/components/journal/journal-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function EntryLoading() {
  return (
    <JournalShell userName={undefined}>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.7fr)]">
          <div>
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="mt-4 h-12 w-full max-w-xl sm:h-14" />
            <Skeleton className="mt-4 h-3.5 w-44" />
            <Skeleton className="mt-7 aspect-video w-full rounded-xl" />
            <Skeleton className="mt-9 h-48 w-full rounded-xl" />
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </JournalShell>
  );
}
