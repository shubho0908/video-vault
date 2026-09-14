"use client";

import { ArrowUpRight, Play } from "lucide-react";
import { useCallback, useState } from "react";

import { PerformanceLink as Link } from "@/components/journal/performance-link";
import { DeleteEntryButton } from "@/components/journal/delete-entry-button";
import {
  DashboardViewSwitch,
  type DashboardView,
} from "@/components/journal/dashboard-view-switch";
import { noteExcerpt } from "@/lib/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DashboardEntry = {
  id: string;
  title: string;
  topic: string;
  youtubeId: string;
  createdAt: Date;
  notesMarkdown: string;
};
const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function DashboardEntryCollection({
  entries,
}: {
  entries: DashboardEntry[];
}) {
  const [view, setView] = useState<DashboardView>("grid");
  const changeView = useCallback(
    (nextView: DashboardView) => setView(nextView),
    []
  );

  return (
    <section className="reveal reveal-d2 mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="tnum text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} ready to
          revisit
        </p>
        <DashboardViewSwitch value={view} onChange={changeView} />
      </div>
      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry, index) => (
            <GridCard key={entry.id} entry={entry} index={index} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card/40">
          <div className="divide-y divide-border/70">
            {entries.map(entry => (
              <ListRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function GridCard({ entry, index }: { entry: DashboardEntry; index: number }) {
  return (
    <Card
      className={`reveal group overflow-hidden border-border/80 bg-card py-0 shadow-xs transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_10px_28px_-16px_oklch(0.1_0.04_265_/_0.25)] ${index > 0 ? `reveal-d${Math.min(index, 5)}` : ""}`}
    >
      <Link
        href={`/entries/${entry.id}`}
        className="relative block overflow-hidden bg-muted"
        aria-label={entry.title}
      >
        <img
          src={`https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full border border-border/60 bg-background/85 text-primary opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
          <Play className="size-3.5 translate-x-px" fill="currentColor" />
        </span>
      </Link>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <Badge
            variant="outline"
            className="max-w-[170px] truncate font-mono text-[11px]"
          >
            {entry.topic}
          </Badge>
          <DeleteEntryButton entryId={entry.id} />
        </div>
        <Link href={`/entries/${entry.id}`} className="mt-3.5 block">
          <h2 className="line-clamp-2 text-lg leading-snug font-semibold tracking-tight text-balance transition-colors duration-200 group-hover:text-primary">
            {entry.title}
          </h2>
        </Link>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3.5 text-xs text-muted-foreground">
          <span className="tnum font-mono">
            {dateFormat.format(entry.createdAt)}
          </span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-mr-2 h-7 px-2 text-primary"
          >
            <Link href={`/entries/${entry.id}`}>
              Open <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ListRow({ entry }: { entry: DashboardEntry }) {
  return (
    <div className="group flex items-center gap-4 p-3 transition-colors duration-200 hover:bg-accent/40 sm:gap-5 sm:p-4">
      <Link
        href={`/entries/${entry.id}`}
        className="relative shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
        aria-label={entry.title}
      >
        <img
          src={`https://i.ytimg.com/vi/${entry.youtubeId}/default.jpg`}
          alt=""
          loading="lazy"
          className="aspect-video w-28 object-cover sm:w-36"
        />
        <Play
          className="absolute inset-0 m-auto size-6 text-white drop-shadow"
          fill="currentColor"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="max-w-[150px] truncate font-mono text-[11px]"
          >
            {entry.topic}
          </Badge>
          <span className="tnum font-mono text-xs text-muted-foreground">
            {dateFormat.format(entry.createdAt)}
          </span>
        </div>
        <Link href={`/entries/${entry.id}`} className="mt-1.5 block">
          <h2 className="truncate text-base font-semibold tracking-tight transition-colors duration-200 group-hover:text-primary sm:text-lg">
            {entry.title}
          </h2>
        </Link>
        <div className="mt-1 hidden sm:block">
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {noteExcerpt(entry.notesMarkdown) || "No learning notes added yet."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="hidden text-muted-foreground group-hover:text-primary sm:inline-flex"
          aria-label={`Open ${entry.title}`}
        >
          <Link href={`/entries/${entry.id}`}>
            <ArrowUpRight />
          </Link>
        </Button>
        <DeleteEntryButton entryId={entry.id} />
      </div>
    </div>
  );
}
