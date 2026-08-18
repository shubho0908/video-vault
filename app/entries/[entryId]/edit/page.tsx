import { notFound } from "next/navigation";

import { EntryForm } from "@/components/journal/entry-form";
import { ImagePanel } from "@/components/journal/image-panel";
import { JournalShell } from "@/components/journal/journal-shell";
import { createSignedImageKitUrl } from "@/lib/imagekit";
import { getEntryForOwner, getImagesForEntry } from "@/lib/journal";
import { requireOwner } from "@/lib/session";

export default async function EditEntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const session = await requireOwner();
  const { entryId } = await params;
  const entry = await getEntryForOwner(session.user.id, entryId);
  if (!entry) notFound();
  const images = await getImagesForEntry(session.user.id, entryId);
  return <JournalShell userName={session.user.name}><main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12"><p className="text-sm font-medium tracking-[0.14em] text-primary uppercase">Edit entry</p><h1 className="mt-3 truncate font-serif text-4xl tracking-[-0.045em] sm:text-5xl">{entry.title}</h1><div className="mt-8"><EntryForm entry={entry} /></div><div className="mt-6"><ImagePanel entryId={entry.id} images={images.map((image) => ({ ...image, signedUrl: createSignedImageKitUrl(image.filePath) }))} /></div></main></JournalShell>;
}
