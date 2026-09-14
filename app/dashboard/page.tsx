import { BookOpenText } from "lucide-react";
import Link from "next/link";

import { DashboardEntryCollection } from "@/components/journal/dashboard-entry-collection";
import { DashboardFilter } from "@/components/journal/dashboard-filter";
import { JournalShell } from "@/components/journal/journal-shell";
import { PlaylistShelf } from "@/components/journal/playlist-shelf";
import { Button } from "@/components/ui/button";
import {
  listEntries,
  listEntryChoices,
  listPlaylists,
  listTopics,
} from "@/lib/journal-cache";
import { requireOwner } from "@/lib/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; topic?: string }>;
}) {
  const session = await requireOwner();
  const { q = "", topic = "" } = await searchParams;
  const [entries, entryChoices, topics, playlists] = await Promise.all([
    listEntries(session.user.id, q, topic),
    listEntryChoices(session.user.id),
    listTopics(session.user.id),
    listPlaylists(session.user.id),
  ]);
  const filtering = Boolean(q || topic);

  return (
    <JournalShell userName={session.user.name}>
      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="reveal grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Private learning journal
            </p>
            <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Make your learning{" "}
              <em className="font-medium italic text-primary">revisitable.</em>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
              A growing archive of your explanations, supporting notes, and the
              visual references that help ideas settle in.
            </p>
          </div>
          <dl className="flex gap-8 border-border/70 lg:gap-10 lg:border-l lg:pl-10">
            <div>
              <dd className="tnum font-mono text-4xl font-medium tracking-tight sm:text-[2.75rem]">
                {entries.length}
              </dd>
              <dt className="mt-1.5 text-sm text-muted-foreground">
                Entries in view
              </dt>
            </div>
            <div>
              <dd className="tnum font-mono text-4xl font-medium tracking-tight sm:text-[2.75rem]">
                {topics.length}
              </dd>
              <dt className="mt-1.5 text-sm text-muted-foreground">
                Topics explored
              </dt>
            </div>
          </dl>
        </div>

        <div className="reveal reveal-d1 mt-12">
          <DashboardFilter topics={topics} />
        </div>

        <PlaylistShelf playlists={playlists} entries={entryChoices} />

        {entries.length ? (
          <DashboardEntryCollection entries={entries} />
        ) : (
          <div className="reveal reveal-d2 mt-6 flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-8 text-center">
            <span className="grid size-12 place-items-center rounded-xl border border-border/70 bg-secondary/60 text-primary">
              <BookOpenText className="size-5" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Your next explanation belongs here.
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {filtering
                ? "No entries match this search. Try another term or clear the current filter."
                : "Add your first unlisted video, write what you learned, and keep the important references alongside it."}
            </p>
            {filtering ? null : (
              <Button asChild size="sm" className="mt-6">
                <Link href="/entries/new">Create your first entry</Link>
              </Button>
            )}
          </div>
        )}
      </main>
    </JournalShell>
  );
}
