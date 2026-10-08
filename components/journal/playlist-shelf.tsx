import { ArrowUpRight, Layers3, Play } from "lucide-react";

import { PerformanceLink as Link } from "@/components/journal/performance-link";
import { PlaylistDialog } from "@/components/journal/playlist-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Entry = { id: string; title: string; topic: string; youtubeId: string };
type Playlist = {
  id: string;
  name: string;
  description: string;
  entryCount: number;
  previewEntries: Entry[];
};

export function PlaylistShelf({
  playlists,
  entries,
}: {
  playlists: Playlist[];
  entries: Entry[];
}) {
  return (
    <section className="reveal reveal-d2 mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Playlists
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Less clutter. More continuity.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Group videos into intentional learning paths without duplicating
            them.
          </p>
        </div>
        <PlaylistDialog entries={entries} />
      </div>
      {playlists.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map(playlist => (
            <Card
              key={playlist.id}
              className="group overflow-hidden border-border/80 bg-card py-0 shadow-xs transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_10px_28px_-16px_oklch(0.1_0.04_265_/_0.25)]"
            >
              <Link
                href={`/playlists/${playlist.id}`}
                className="relative block aspect-[16/7] overflow-hidden bg-muted"
              >
                <div
                  className={cn(
                    "absolute inset-0 grid gap-px opacity-70",
                    playlist.previewEntries.length <= 1 && "grid-cols-1",
                    playlist.previewEntries.length === 2 && "grid-cols-2",
                    playlist.previewEntries.length >= 3 && "grid-cols-3"
                  )}
                >
                  {playlist.previewEntries.map(entry => (
                    <img
                      key={entry.id}
                      src={`https://i.ytimg.com/vi/${entry.youtubeId}/mqdefault.jpg`}
                      alt=""
                      className="h-full min-w-0 w-full object-cover"
                    />
                  ))}
                </div>
                <span className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
                <span className="absolute left-5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl border border-border/70 bg-background/80 text-primary backdrop-blur">
                  <Layers3 className="size-4" />
                </span>
              </Link>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {playlist.entryCount}{" "}
                    {playlist.entryCount === 1 ? "video" : "videos"}
                  </Badge>
                  <Play className="size-4 text-primary" />
                </div>
                <Link href={`/playlists/${playlist.id}`}>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                    {playlist.name}
                  </h3>
                </Link>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                  {playlist.description ||
                    "A focused collection from your private learning journal."}
                </p>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="-ml-2 mt-3 text-primary"
                >
                  <Link href={`/playlists/${playlist.id}`}>
                    Open playlist <ArrowUpRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex min-h-36 flex-col items-start justify-between gap-5 rounded-xl bg-card/45 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="font-medium">
              Your first playlist starts with two related videos.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one without moving or duplicating any entry.
            </p>
          </div>
          <PlaylistDialog entries={entries} triggerLabel="Create playlist" />
        </div>
      )}
    </section>
  );
}

