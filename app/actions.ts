"use server";

import { revalidatePath } from "next/cache";

import { createSignedImageKitUrl, removeImageKitAsset } from "@/lib/imagekit";
import {
  addEntryImage,
  createEntry,
  deleteEntry,
  deleteEntryImage,
  imageInputSchema,
  updateEntry,
  entryInputSchema,
  createPlaylist,
  deletePlaylist,
  playlistInputSchema,
  updatePlaylist,
} from "@/lib/journal";
import { requireOwner } from "@/lib/session";

type ActionResult = { ok: true; id?: string; signedUrl?: string } | { ok: false; error: string };

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export async function saveEntryAction(
  entryId: string | null,
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireOwner();
    const values = entryInputSchema.parse(input);
    const entry = entryId
      ? await updateEntry(session.user.id, entryId, values)
      : await createEntry(session.user.id, values);
    revalidatePath("/dashboard");
    revalidatePath(`/entries/${entry.id}`);
    revalidatePath(`/entries/${entry.id}/edit`);
    return { ok: true, id: entry.id };
  } catch (error) {
    return { ok: false, error: messageFromError(error) };
  }
}

export async function deleteEntryAction(entryId: string): Promise<ActionResult> {
  try {
    const session = await requireOwner();
    const images = await deleteEntry(session.user.id, entryId);
    await Promise.all(images.map((image) => removeImageKitAsset(image.fileId).catch(() => undefined)));
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFromError(error) };
  }
}

export async function attachImageAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireOwner();
    const values = imageInputSchema.parse(input);
    const image = await addEntryImage(session.user.id, values);
    revalidatePath(`/entries/${image.entryId}`);
    revalidatePath(`/entries/${image.entryId}/edit`);
    return { ok: true, id: image.id, signedUrl: createSignedImageKitUrl(image.filePath) };
  } catch (error) {
    return { ok: false, error: messageFromError(error) };
  }
}

export async function deleteEntryImageAction(imageId: string, entryId: string): Promise<ActionResult> {
  try {
    const session = await requireOwner();
    const image = await deleteEntryImage(session.user.id, imageId);
    await removeImageKitAsset(image.fileId).catch(() => undefined);
    revalidatePath(`/entries/${entryId}`);
    revalidatePath(`/entries/${entryId}/edit`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFromError(error) };
  }
}

export async function savePlaylistAction(playlistId: string | null, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireOwner();
    const values = playlistInputSchema.parse(input);
    const playlist = playlistId
      ? await updatePlaylist(session.user.id, playlistId, values)
      : await createPlaylist(session.user.id, values);
    revalidatePath("/dashboard");
    revalidatePath(`/playlists/${playlist.id}`);
    return { ok: true, id: playlist.id };
  } catch (error) {
    return { ok: false, error: messageFromError(error) };
  }
}

export async function deletePlaylistAction(playlistId: string): Promise<ActionResult> {
  try {
    const session = await requireOwner();
    await deletePlaylist(session.user.id, playlistId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFromError(error) };
  }
}
