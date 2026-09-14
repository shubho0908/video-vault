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
  const imagesWithSignedUrls = images.map((image) => ({ ...image, signedUrl: createSignedImageKitUrl(image.filePath) }));
  return (
    <JournalShell userName={session.user.name}>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="reveal max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">Edit entry</p>
          <h1 className="mt-4 break-words text-balance text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{entry.title}</h1>
        </div>
        <div className="reveal reveal-d1 mt-9"><EntryForm entry={entry} imageRefs={imagesWithSignedUrls} /></div>
        <div className="reveal reveal-d2 mt-6"><ImagePanel entryId={entry.id} images={imagesWithSignedUrls} /></div>
      </main>
    </JournalShell>
  );
}
