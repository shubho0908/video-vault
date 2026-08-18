import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Pencil } from "lucide-react";
import { DeleteEntryButton } from "@/components/journal/delete-entry-button";
import { JournalShell } from "@/components/journal/journal-shell";
import { NoteMarkdown } from "@/components/journal/note-markdown";
import { NotesComposer } from "@/components/journal/notes-composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSignedImageKitUrl } from "@/lib/imagekit";
import { getEntryForOwner, getImagesForEntry } from "@/lib/journal";
import { requireOwner } from "@/lib/session";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

const dateFormat = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" });

export default async function EntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const session = await requireOwner();
  const { entryId } = await params;
  const entry = await getEntryForOwner(session.user.id, entryId);
  if (!entry) notFound();
  const images = await getImagesForEntry(session.user.id, entry.id);
  const imagesWithSignedUrls = images.map((image) => ({ ...image, signedUrl: createSignedImageKitUrl(image.filePath) }));
  return <JournalShell userName={session.user.name}><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10"><div className="flex flex-wrap items-center justify-between gap-4"><Button asChild variant="ghost" className="-ml-3 text-muted-foreground"><Link href="/dashboard"><ChevronLeft /> All entries</Link></Button><div className="flex items-center gap-1"><Button asChild variant="outline" size="sm" className="rounded-lg"><Link href={`/entries/${entry.id}/edit`}><Pencil /> Edit</Link></Button><DeleteEntryButton entryId={entry.id} redirectAfterDelete /></div></div><div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.7fr)]"><article><Badge variant="secondary" className="rounded-md px-2 py-0.5 font-normal">{entry.topic}</Badge><h1 className="mt-4 font-serif text-5xl leading-[0.95] tracking-[-0.055em] sm:text-6xl">{entry.title}</h1><p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />Recorded {dateFormat.format(entry.createdAt)}</p><div className="mt-8 overflow-hidden rounded-xl border border-border bg-black shadow-sm"><iframe className="aspect-video w-full" src={getYouTubeEmbedUrl(entry.youtubeId)} title={entry.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div><section className="mt-10 rounded-xl border border-border/80 bg-card/90 px-5 py-7 sm:px-8"><p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">Learning notes</p><div className="mt-5"><NoteMarkdown markdown={entry.notesMarkdown} images={imagesWithSignedUrls} emptyMessage="No notes added yet. Start writing below." /></div></section><NotesComposer entryId={entry.id} title={entry.title} youtubeUrl={entry.youtubeUrl} topic={entry.topic} initialNotes={entry.notesMarkdown} imageRefs={imagesWithSignedUrls} /></article><aside className="lg:pt-15"><section className="rounded-xl border border-border/80 bg-card/80 p-5"><h2 className="font-serif text-2xl tracking-[-0.035em]">Reference images</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Visual context stored with this entry.</p>{imagesWithSignedUrls.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{imagesWithSignedUrls.map((image) => <figure key={image.id} className="overflow-hidden rounded-lg border border-border bg-muted"><img src={image.signedUrl} alt={image.altText ?? "Reference image"} className="aspect-[4/3] w-full object-cover" /><figcaption className="px-3 py-2 text-xs text-muted-foreground">{image.altText ?? "Reference image"}</figcaption></figure>)}</div> : <p className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-7 text-center text-sm leading-6 text-muted-foreground">No reference images yet.</p>}<Button asChild variant="outline" className="mt-4 w-full rounded-lg"><Link href={`/entries/${entry.id}/edit`}>Manage images</Link></Button></section></aside></div></main></JournalShell>;
}
