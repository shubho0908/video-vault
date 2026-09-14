import { unstable_cache } from "next/cache";

import {
  getEntryForOwner as readEntry,
  getImagesForEntry as readEntryImages,
  getPlaylistEntries as readPlaylistEntries,
  getPlaylistForOwner as readPlaylist,
  listEntries as readEntries,
  listEntryChoices as readEntryChoices,
  listPlaylists as readPlaylists,
  listTopics as readTopics,
} from "@/lib/journal";
import {
  entryTag,
  ownerEntriesTag,
  ownerPlaylistsTag,
  playlistTag,
} from "@/lib/cache-tags";

const HOUR = 3600;

function cached<T>(key: string[], tags: string[], read: () => Promise<T>) {
  return unstable_cache(read, key, { revalidate: HOUR, tags })();
}

// The authenticated owner ID is part of every key and every invalidation tag.
// Auth itself remains request-scoped and is never cached here.
export function listEntries(ownerId: string, query = "", topic = "") {
  return cached(
    ["entries", ownerId, query, topic],
    [ownerEntriesTag(ownerId)],
    () => readEntries(ownerId, query, topic)
  );
}

export function listEntryChoices(ownerId: string) {
  return cached(["entry-choices", ownerId], [ownerEntriesTag(ownerId)], () =>
    readEntryChoices(ownerId)
  );
}

export function listTopics(ownerId: string) {
  return cached(["topics", ownerId], [ownerEntriesTag(ownerId)], () =>
    readTopics(ownerId)
  );
}

export function getEntryForOwner(ownerId: string, entryId: string) {
  return cached(["entry", ownerId, entryId], [entryTag(ownerId, entryId)], () =>
    readEntry(ownerId, entryId)
  );
}

export function getImagesForEntry(ownerId: string, entryId: string) {
  return cached(
    ["entry-images", ownerId, entryId],
    [entryTag(ownerId, entryId)],
    () => readEntryImages(ownerId, entryId)
  );
}

export function listPlaylists(ownerId: string) {
  return cached(
    ["playlists", ownerId],
    [ownerPlaylistsTag(ownerId), ownerEntriesTag(ownerId)],
    () => readPlaylists(ownerId)
  );
}

export function getPlaylistForOwner(ownerId: string, playlistId: string) {
  return cached(
    ["playlist", ownerId, playlistId],
    [playlistTag(ownerId, playlistId)],
    () => readPlaylist(ownerId, playlistId)
  );
}

export function getPlaylistEntries(ownerId: string, playlistId: string) {
  return cached(
    ["playlist-entries", ownerId, playlistId],
    [
      ownerPlaylistsTag(ownerId),
      ownerEntriesTag(ownerId),
      playlistTag(ownerId, playlistId),
    ],
    () => readPlaylistEntries(ownerId, playlistId)
  );
}
