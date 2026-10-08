import { unstable_cache } from "next/cache";

import {
  getEntryForOwner as readEntry,
  getImagesForEntry as readEntryImages,
  getPlaylistEntries as readPlaylistEntries,
  getPlaylistForOwner as readPlaylist,
  listEntries as readEntries,
  listEntryChoices as readEntryChoices,
  listFolders as readFolders,
  listMemberships as readMemberships,
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
const CACHE_FORMAT_VERSION = "v2-date-tags";
const DATE_MARKER = "__videoVaultDate";

type EncodedDate = { [DATE_MARKER]: string };

export function serializeCacheValue(value: unknown): unknown {
  if (value instanceof Date) return { [DATE_MARKER]: value.toISOString() };
  if (Array.isArray(value)) return value.map(serializeCacheValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        serializeCacheValue(nested),
      ])
    );
  }
  return value;
}

function isEncodedDate(value: object): value is EncodedDate {
  return (
    Object.keys(value).length === 1 &&
    DATE_MARKER in value &&
    typeof (value as EncodedDate)[DATE_MARKER] === "string"
  );
}

export function reviveCacheValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviveCacheValue);
  if (value && typeof value === "object") {
    if (isEncodedDate(value)) return new Date(value[DATE_MARKER]);
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        reviveCacheValue(nested),
      ])
    );
  }
  return value;
}

async function cached<T>(
  key: string[],
  tags: string[],
  read: () => Promise<T>
): Promise<T> {
  const encoded = await unstable_cache(
    async () => serializeCacheValue(await read()),
    [CACHE_FORMAT_VERSION, ...key],
    { revalidate: HOUR, tags }
  )();
  return reviveCacheValue(encoded) as T;
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

export function listFolders(ownerId: string) {
  return cached(["folders", ownerId], [ownerPlaylistsTag(ownerId)], () =>
    readFolders(ownerId)
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


export function listMemberships(ownerId: string) {
  return cached(
    ["memberships", ownerId],
    [ownerPlaylistsTag(ownerId), ownerEntriesTag(ownerId)],
    () => readMemberships(ownerId)
  );
}
