import { JournalShell } from "@/components/journal/journal-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <JournalShell userName={undefined}>
      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <Skeleton className="h-3 w-44" />
            <Skeleton className="mt-5 h-12 w-full max-w-xl sm:h-14" />
            <Skeleton className="mt-4 h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-8 lg:border-l lg:border-border/70 lg:pl-10">
            <div>
              <Skeleton className="h-10 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <div>
              <Skeleton className="h-10 w-16" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          </div>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(index => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-border/80 bg-card"
            >
              <Skeleton className="aspect-video rounded-none" />
              <div className="p-5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-4 h-5 w-full" />
                <Skeleton className="mt-2 h-5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </JournalShell>
  );
}
