import { randomUUID } from "crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  entryImages,
  playlistEntries,
  playlists,
  videoEntries,
} from "@/lib/schema";
import { getYouTubeVideoId } from "@/lib/youtube";

export type JournalEntry = typeof videoEntries.$inferSelect;
export type EntryImage = typeof entryImages.$inferSelect;
export type PlaylistEntryChoice = Pick<
  JournalEntry,
  "id" | "title" | "topic" | "youtubeId"
>;

const playlistEntryChoice = {
  id: videoEntries.id,
  title: videoEntries.title,
  topic: videoEntries.topic,
  youtubeId: videoEntries.youtubeId,
};

export const entryInputSchema = z.object({
  title: z.string().trim().min(1, "A title is required.").max(160),
  youtubeUrl: z.string().trim().url("Enter a complete YouTube URL."),
  topic: z.string().trim().min(1, "A topic is required.").max(60),
  notesMarkdown: z.string().max(50_000),
});

export const imageInputSchema = z.object({
  entryId: z.string().uuid(),
  fileId: z.string().min(1).max(255),
  filePath: z.string().min(1).max(1024),
  url: z.string().url(),
  altText: z.string().trim().max(180).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

function ensureYouTubeUrl(youtubeUrl: string) {
  const youtubeId = getYouTubeVideoId(youtubeUrl);
  if (!youtubeId) throw new Error("Use a valid YouTube or youtu.be video URL.");
  return youtubeId;
}

export async function listEntries(ownerId: string, query = "", topic = "") {
  const conditions = [eq(videoEntries.ownerId, ownerId)];
  if (query.trim()) {
    const term = `%${query.trim()}%`;
    conditions.push(
      or(ilike(videoEntries.title, term), ilike(videoEntries.topic, term))!
    );
  }
  if (topic.trim()) conditions.push(eq(videoEntries.topic, topic.trim()));

  return db
    .select()
    .from(videoEntries)
    .where(and(...conditions))
    .orderBy(desc(videoEntries.updatedAt));
}

export async function listEntryChoices(ownerId: string) {
  return db
    .select(playlistEntryChoice)
    .from(videoEntries)
    .where(eq(videoEntries.ownerId, ownerId))
    .orderBy(desc(videoEntries.updatedAt));
}

export async function listTopics(ownerId: string) {
  const rows = await db
    .selectDistinct({ topic: videoEntries.topic })
    .from(videoEntries)
    .where(eq(videoEntries.ownerId, ownerId))
    .orderBy(videoEntries.topic);
  return rows.map(row => row.topic);
}

export async function getEntryForOwner(ownerId: string, entryId: string) {
  const rows = await db
    .select()
    .from(videoEntries)
    .where(and(eq(videoEntries.id, entryId), eq(videoEntries.ownerId, ownerId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Ownership check that reads only the id, not the full row (notes_markdown can be up to 50 KB). */
async function ownsEntry(ownerId: string, entryId: string) {
  const rows = await db
    .select({ id: videoEntries.id })
    .from(videoEntries)
    .where(and(eq(videoEntries.id, entryId), eq(videoEntries.ownerId, ownerId)))
    .limit(1);
  return rows.length > 0;
}

export async function getImagesForEntry(ownerId: string, entryId: string) {
  const rows = await db
    .select({ image: entryImages })
    .from(entryImages)
    .innerJoin(videoEntries, eq(entryImages.entryId, videoEntries.id))
    .where(
      and(eq(entryImages.entryId, entryId), eq(videoEntries.ownerId, ownerId))
    )
    .orderBy(entryImages.createdAt);
  return rows.map(({ image }) => image);
}

export async function createEntry(
  ownerId: string,
  input: z.infer<typeof entryInputSchema>
) {
  const parsed = entryInputSchema.parse(input);
  const youtubeId = ensureYouTubeUrl(parsed.youtubeUrl);
  const id = randomUUID();
  const rows = await db
    .insert(videoEntries)
    .values({ id, ownerId, ...parsed, youtubeId })
    .returning();
  return rows[0];
}

export async function updateEntry(
  ownerId: string,
  entryId: string,
  input: z.infer<typeof entryInputSchema>
) {
  const parsed = entryInputSchema.parse(input);
  const youtubeId = ensureYouTubeUrl(parsed.youtubeUrl);
  const rows = await db
    .update(videoEntries)
    .set({ ...parsed, youtubeId, updatedAt: new Date() })
    .where(and(eq(videoEntries.id, entryId), eq(videoEntries.ownerId, ownerId)))
    .returning();
  if (!rows[0]) throw new Error("That journal entry was not found.");
  return rows[0];
}

export async function deleteEntry(ownerId: string, entryId: string) {
  const images = await getImagesForEntry(ownerId, entryId);
  const rows = await db
    .delete(videoEntries)
    .where(and(eq(videoEntries.id, entryId), eq(videoEntries.ownerId, ownerId)))
    .returning({ id: videoEntries.id });
  if (!rows[0]) throw new Error("That journal entry was not found.");
  return images;
}

export async function addEntryImage(
  ownerId: string,
  input: z.infer<typeof imageInputSchema>
) {
  const parsed = imageInputSchema.parse(input);
  if (!(await ownsEntry(ownerId, parsed.entryId)))
    throw new Error("That journal entry was not found.");
  const rows = await db
    .insert(entryImages)
    .values({ id: randomUUID(), ...parsed, altText: parsed.altText || null })
    .returning();
  return rows[0];
}

export async function deleteEntryImage(ownerId: string, imageId: string) {
  const rows = await db
    .select({ image: entryImages })
    .from(entryImages)
    .innerJoin(videoEntries, eq(entryImages.entryId, videoEntries.id))
    .where(and(eq(entryImages.id, imageId), eq(videoEntries.ownerId, ownerId)))
    .limit(1);
  const image = rows[0]?.image;
  if (!image) throw new Error("That reference image was not found.");
  await db.delete(entryImages).where(eq(entryImages.id, imageId));
  return image;
}

export const playlistInputSchema = z.object({
  name: z.string().trim().min(1, "A playlist name is required.").max(80),
  description: z.string().trim().max(240).default(""),
  entryIds: z.array(z.string().uuid()).max(500).default([]),
});

export type Playlist = typeof playlists.$inferSelect;

export async function listPlaylists(ownerId: string) {
  const [rows, memberships] = await Promise.all([
    db
      .select({
        playlist: playlists,
        count: sql<number>`count(${playlistEntries.entryId})::int`,
      })
      .from(playlists)
      .leftJoin(playlistEntries, eq(playlists.id, playlistEntries.playlistId))
      .where(eq(playlists.ownerId, ownerId))
      .groupBy(playlists.id)
      .orderBy(desc(playlists.updatedAt)),
    db
      .select({
        playlistId: playlistEntries.playlistId,
        entry: playlistEntryChoice,
      })
      .from(playlistEntries)
      .innerJoin(playlists, eq(playlistEntries.playlistId, playlists.id))
      .innerJoin(videoEntries, eq(playlistEntries.entryId, videoEntries.id))
      .where(
        and(
          eq(playlists.ownerId, ownerId),
          eq(videoEntries.ownerId, ownerId),
          sql`${playlistEntries.position} < 3`
        )
      )
      .orderBy(playlistEntries.playlistId, playlistEntries.position),
  ]);

  const previews = new Map<string, PlaylistEntryChoice[]>();
  for (const { playlistId, entry } of memberships) {
    const current = previews.get(playlistId) ?? [];
    current.push(entry);
    previews.set(playlistId, current);
  }

  return rows.map(({ playlist, count }) => ({
    ...playlist,
    entryCount: count,
    previewEntries: previews.get(playlist.id) ?? [],
  }));
}

/** Id + name only, newest first. The Finder needs nothing else, so skip the count/preview queries. */
export async function listFolders(ownerId: string) {
  return db
    .select({ id: playlists.id, name: playlists.name })
    .from(playlists)
    .where(eq(playlists.ownerId, ownerId))
    .orderBy(desc(playlists.updatedAt));
}

export async function getPlaylistForOwner(ownerId: string, playlistId: string) {
  const rows = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.ownerId, ownerId)))
    .limit(1);
  return rows[0] ?? null;
}

async function ownsPlaylist(ownerId: string, playlistId: string) {
  const rows = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.ownerId, ownerId)))
    .limit(1);
  return rows.length > 0;
}

export async function getPlaylistEntries(ownerId: string, playlistId: string) {
  return db
    .select({ entry: playlistEntryChoice, position: playlistEntries.position })
    .from(playlistEntries)
    .innerJoin(playlists, eq(playlistEntries.playlistId, playlists.id))
    .innerJoin(videoEntries, eq(playlistEntries.entryId, videoEntries.id))
    .where(
      and(
        eq(playlistEntries.playlistId, playlistId),
        eq(playlists.ownerId, ownerId),
        eq(videoEntries.ownerId, ownerId)
      )
    )
    .orderBy(playlistEntries.position, playlistEntries.addedAt)
    .then(rows => rows.map(row => row.entry));
}

async function validateOwnedEntries(ownerId: string, entryIds: string[]) {
  const uniqueIds = [...new Set(entryIds)];
  if (!uniqueIds.length) return uniqueIds;
  const owned = await db
    .select({ id: videoEntries.id })
    .from(videoEntries)
    .where(
      and(
        eq(videoEntries.ownerId, ownerId),
        inArray(videoEntries.id, uniqueIds)
      )
    );
  if (owned.length !== uniqueIds.length)
    throw new Error("One or more selected entries were not found.");
  return uniqueIds;
}

export async function createPlaylist(
  ownerId: string,
  input: z.infer<typeof playlistInputSchema>
) {
  const parsed = playlistInputSchema.parse(input);
  const entryIds = await validateOwnedEntries(ownerId, parsed.entryIds);
  const id = randomUUID();
  const create = db.insert(playlists).values({
    id,
    ownerId,
    name: parsed.name,
    description: parsed.description,
  });

  if (!entryIds.length) {
    await create;
  } else {
    await db.batch([
      create,
      db.insert(playlistEntries).values(
        entryIds.map((entryId, position) => ({
          playlistId: id,
          entryId,
          position,
        }))
      ),
    ]);
  }

  return { id, ownerId, name: parsed.name, description: parsed.description };
}

export async function updatePlaylist(
  ownerId: string,
  playlistId: string,
  input: z.infer<typeof playlistInputSchema>
) {
  const parsed = playlistInputSchema.parse(input);
  const [playlist, entryIds] = await Promise.all([
    getPlaylistForOwner(ownerId, playlistId),
    validateOwnedEntries(ownerId, parsed.entryIds),
  ]);
  if (!playlist) throw new Error("That playlist was not found.");

  const updatedAt = new Date();
  const update = db
    .update(playlists)
    .set({ name: parsed.name, description: parsed.description, updatedAt })
    .where(and(eq(playlists.id, playlistId), eq(playlists.ownerId, ownerId)));
  const clearMembership = db
    .delete(playlistEntries)
    .where(eq(playlistEntries.playlistId, playlistId));

  if (entryIds.length) {
    await db.batch([
      update,
      clearMembership,
      db.insert(playlistEntries).values(
        entryIds.map((entryId, position) => ({
          playlistId,
          entryId,
          position,
        }))
      ),
    ]);
  } else {
    await db.batch([update, clearMembership]);
  }

  return {
    ...playlist,
    name: parsed.name,
    description: parsed.description,
    updatedAt,
  };
}

export async function deletePlaylist(ownerId: string, playlistId: string) {
  const rows = await db
    .delete(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.ownerId, ownerId)))
    .returning({ id: playlists.id });
  if (!rows[0]) throw new Error("That playlist was not found.");
}


export const folderNameSchema = z
  .string()
  .trim()
  .min(1, "A folder name is required.")
  .max(80);

export async function renamePlaylist(
  ownerId: string,
  playlistId: string,
  name: string
) {
  const rows = await db
    .update(playlists)
    .set({ name: folderNameSchema.parse(name), updatedAt: new Date() })
    .where(and(eq(playlists.id, playlistId), eq(playlists.ownerId, ownerId)))
    .returning({ id: playlists.id });
  if (!rows[0]) throw new Error("That playlist was not found.");
}

export async function listMemberships(ownerId: string) {
  return db
    .select({
      playlistId: playlistEntries.playlistId,
      entryId: playlistEntries.entryId,
    })
    .from(playlistEntries)
    .innerJoin(playlists, eq(playlistEntries.playlistId, playlists.id))
    .where(eq(playlists.ownerId, ownerId))
    .orderBy(playlistEntries.playlistId, playlistEntries.position);
}

/**
 * One command for Finder drag/drop, copy and "Move to...": remove from
 * `fromId` (if any) and add to `toId` (if any), atomically. Nothing else in
 * either folder changes.
 */
export async function placeEntry(
  ownerId: string,
  input: { entryId: string; fromId: string | null; toId: string | null }
) {
  const { entryId, fromId, toId } = input;
  const [entry, ...folders] = await Promise.all([
    ownsEntry(ownerId, entryId),
    ...[fromId, toId].map(id => (id ? ownsPlaylist(ownerId, id) : true)),
  ]);
  if (!entry) throw new Error("That journal entry was not found.");
  if (folders.some(folder => !folder))
    throw new Error("That playlist was not found.");

  const steps = [];
  if (fromId && fromId !== toId)
    steps.push(
      db
        .delete(playlistEntries)
        .where(
          and(
            eq(playlistEntries.playlistId, fromId),
            eq(playlistEntries.entryId, entryId)
          )
        )
    );
  if (toId)
    steps.push(
      db
        .insert(playlistEntries)
        .values({
          playlistId: toId,
          entryId,
          position: sql`(select coalesce(max(${playlistEntries.position}), -1) + 1 from ${playlistEntries} where ${playlistEntries.playlistId} = ${toId})`,
        })
        .onConflictDoNothing()
    );
  if (steps.length) await db.batch(steps as [(typeof steps)[0], ...typeof steps]);
}
