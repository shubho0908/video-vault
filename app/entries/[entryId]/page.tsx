import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Images, Pencil } from "lucide-react";

import { DeleteEntryButton } from "@/components/journal/delete-entry-button";
import { JournalShell } from "@/components/journal/journal-shell";
import { NoteMarkdown } from "@/components/journal/note-markdown";
import { NotesComposer } from "@/components/journal/notes-composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSignedImageKitUrl } from "@/lib/imagekit";
import { getEntryForOwner, getImagesForEntry } from "@/lib/journal-cache";
import { requireOwner } from "@/lib/session";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default async function EntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const session = await requireOwner();
  const { entryId } = await params;
  const [entry, images] = await Promise.all([
    getEntryForOwner(session.user.id, entryId),
    getImagesForEntry(session.user.id, entryId),
  ]);
  if (!entry) notFound();
  const imagesWithSignedUrls = images.map(image => ({
    ...image,
    signedUrl: createSignedImageKitUrl(image.filePath),
  }));

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
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="sm">
              <Link href={`/entries/${entry.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <DeleteEntryButton entryId={entry.id} redirectAfterDelete />
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.7fr)]">
          <article className="min-w-0">
            <div className="reveal reveal-d1">
              <Badge variant="outline" className="font-mono text-[11px]">
                {entry.topic}
              </Badge>
              <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
                {entry.title}
              </h1>
              <p className="tnum mt-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Recorded {dateFormat.format(entry.createdAt)}
              </p>
            </div>
            <div className="reveal reveal-d2 mt-7 overflow-hidden rounded-xl border border-border bg-black shadow-[0_24px_70px_-30px_oklch(0.1_0.04_265_/_0.6)]">
              <iframe
                className="aspect-video w-full"
                src={getYouTubeEmbedUrl(entry.youtubeId)}
                title={entry.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <section className="reveal reveal-d3 mt-9 rounded-xl border border-border/80 bg-card/80 px-5 py-7 hairline-top sm:px-8">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Learning notes
              </p>
              <div className="mt-5">
                <NoteMarkdown
                  markdown={entry.notesMarkdown}
                  images={imagesWithSignedUrls}
                  emptyMessage="No notes added yet. Start writing below."
                />
              </div>
            </section>
            <NotesComposer
              entryId={entry.id}
              title={entry.title}
              youtubeUrl={entry.youtubeUrl}
              topic={entry.topic}
              initialNotes={entry.notesMarkdown}
              imageRefs={imagesWithSignedUrls}
            />
          </article>

          <aside className="lg:pt-15">
            <section className="reveal reveal-d2 rounded-xl border border-border/80 bg-card/80 p-5 hairline-top">
              <div className="flex items-center gap-2">
                <Images className="size-4 text-primary" />
                <h2 className="text-base font-semibold tracking-tight">
                  Reference images
                </h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Visual context stored with this entry.
              </p>
              {imagesWithSignedUrls.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {imagesWithSignedUrls.map(image => (
                    <figure
                      key={image.id}
                      className="group overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      <img
                        src={image.signedUrl}
                        alt={image.altText ?? "Reference image"}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <figcaption className="truncate px-3 py-2 font-mono text-xs text-muted-foreground">
                        {image.altText ?? "Reference image"}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-7 text-center text-sm leading-6 text-muted-foreground">
                  No reference images yet.
                </p>
              )}
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={`/entries/${entry.id}/edit`}>Manage images</Link>
              </Button>
            </section>
          </aside>
        </div>
      </main>
    </JournalShell>
  );
}
