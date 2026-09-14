import Link from "next/link";
import { ChevronLeft, Layers3, Play } from "lucide-react";
import { notFound } from "next/navigation";

import { PlaylistDialog } from "@/components/journal/playlist-dialog";
import { JournalShell } from "@/components/journal/journal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPlaylistEntries,
  getPlaylistForOwner,
  listEntryChoices,
} from "@/lib/journal-cache";
import { requireOwner } from "@/lib/session";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const session = await requireOwner();
  const { playlistId } = await params;
  const [playlist, entries, allEntries] = await Promise.all([
    getPlaylistForOwner(session.user.id, playlistId),
    getPlaylistEntries(session.user.id, playlistId),
    listEntryChoices(session.user.id),
  ]);
  if (!playlist) notFound();
  return (
    <JournalShell userName={session.user.name}>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="reveal flex flex-wrap items-center justify-between gap-4">
          <Button
            asChild
            variant="ghost"
            className="-ml-3 text-muted-foreground"
          >
            <Link href="/dashboard">
              <ChevronLeft /> All entries
            </Link>
          </Button>
          <PlaylistDialog
            entries={allEntries}
            playlist={{ ...playlist, entryIds: entries.map(entry => entry.id) }}
            triggerLabel="Edit playlist"
          />
        </div>
        <header className="reveal reveal-d1 mt-9 max-w-3xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Curated learning path
          </p>
          <div className="mt-4 flex items-start gap-4">
            <span className="mt-1 grid size-12 shrink-0 place-items-center rounded-xl border border-border/70 bg-secondary/60 text-primary">
              <Layers3 className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
                {playlist.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {playlist.description ||
                  "A focused collection from your private learning journal."}
              </p>
              <Badge variant="outline" className="mt-4 font-mono text-[11px]">
                {entries.length} {entries.length === 1 ? "video" : "videos"}
              </Badge>
            </div>
          </div>
        </header>
        {entries.length ? (
          <ol className="reveal reveal-d2 mt-10 grid gap-5">
            <li className="group grid gap-5 overflow-hidden rounded-xl border border-border/80 bg-card/80 p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)] sm:p-5">
              <Link
                href={`/entries/${entries[0].id}`}
                className="relative overflow-hidden rounded-lg bg-black"
              >
                <img
                  src={`https://i.ytimg.com/vi/${entries[0].youtubeId}/maxresdefault.jpg`}
                  alt=""
                  className="aspect-video h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-12 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur">
                    <Play
                      className="size-4 translate-x-px"
                      fill="currentColor"
                    />
                  </span>
                </span>
              </Link>
              <div className="flex flex-col justify-center">
                <p className="font-mono text-xs text-primary">UP NEXT · 01</p>
                <Badge
                  variant="outline"
                  className="mt-3 inline-flex w-auto self-start font-mono text-[11px]"
                >
                  {entries[0].topic}
                </Badge>
                <h2 className="mt-3 break-words text-2xl font-semibold leading-tight tracking-tight">
                  {entries[0].title}
                </h2>
                <Button asChild className="mt-5 w-fit">
                  <Link href={`/entries/${entries[0].id}`}>
                    <Play /> Start watching
                  </Link>
                </Button>
              </div>
            </li>
            {entries.slice(1).map((entry, index) => (
              <li
                key={entry.id}
                className="group flex items-center gap-4 rounded-xl bg-card/60 p-4 shadow-xs transition-[transform,background-color] hover:-translate-y-px hover:bg-card sm:gap-5 sm:p-5"
              >
                <span className="tnum hidden w-7 shrink-0 text-center font-mono text-sm text-muted-foreground min-[430px]:block">
                  {String(index + 2).padStart(2, "0")}
                </span>
                <Link
                  href={`/entries/${entry.id}`}
                  className="relative shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
                >
                  <img
                    src={`https://i.ytimg.com/vi/${entry.youtubeId}/default.jpg`}
                    alt=""
                    className="aspect-video w-24 object-cover min-[430px]:w-28 sm:w-36"
                  />
                  <Play
                    className="absolute inset-0 m-auto size-5 text-white drop-shadow"
                    fill="currentColor"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Badge
                    variant="outline"
                    className="max-w-[150px] truncate font-mono text-[11px]"
                  >
                    {entry.topic}
                  </Badge>
                  <Link href={`/entries/${entry.id}`}>
                    <h2 className="mt-2 truncate text-base font-semibold tracking-tight transition-colors group-hover:text-primary sm:text-lg">
                      {entry.title}
                    </h2>
                  </Link>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  <Link href={`/entries/${entry.id}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-10 grid min-h-56 place-items-center rounded-xl bg-card/45 px-6 text-center">
            <div>
              <Layers3 className="mx-auto size-6 text-primary" />
              <h2 className="mt-4 text-xl font-semibold">
                This playlist is ready for its first video.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use Edit playlist to add entries in the order you want to
                revisit them.
              </p>
            </div>
          </div>
        )}
      </main>
    </JournalShell>
  );
}
