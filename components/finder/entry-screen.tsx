import { notFound } from "next/navigation";
import { preconnect } from "react-dom";

import { createSignedImageKitUrl } from "@/lib/imagekit";
import { getEntryForOwner, getImagesForEntry } from "@/lib/journal-cache";
import { requireOwner } from "@/lib/session";
import { EntryScene, type SceneMode } from "./entry-scene";

/** Server half: same owner check and queries as the original entry pages, then hands the data to the in-shell scene. */
export async function EntryScreen({ mode, entryId, standalone }: { mode: SceneMode; entryId?: string; standalone: boolean }) {
  // Hint the browser during SSR so the poster thumbnail and the player origin are warm before hydration.
  preconnect("https://i.ytimg.com");
  preconnect("https://www.youtube-nocookie.com");
  const session = await requireOwner();
  if (!entryId) return <EntryScene mode="new" images={[]} standalone={standalone} />;
  const [entry, images] = await Promise.all([
    getEntryForOwner(session.user.id, entryId),
    getImagesForEntry(session.user.id, entryId),
  ]);
  if (!entry) notFound();
  const imageRefs = images.map(image => ({ ...image, signedUrl: createSignedImageKitUrl(image.filePath) }));
  return <EntryScene mode={mode} entry={entry} images={imageRefs} standalone={standalone} />;
}
