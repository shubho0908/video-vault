import { randomUUID } from "crypto";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { entryImages, videoEntries } from "@/lib/schema";
import { getYouTubeVideoId } from "@/lib/youtube";

export type JournalEntry = typeof videoEntries.$inferSelect;
export type EntryImage = typeof entryImages.$inferSelect;

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
    conditions.push(or(ilike(videoEntries.title, term), ilike(videoEntries.topic, term))!);
  }
  if (topic.trim()) conditions.push(eq(videoEntries.topic, topic.trim()));

  return db.select().from(videoEntries).where(and(...conditions)).orderBy(desc(videoEntries.updatedAt));
}

export async function listTopics(ownerId: string) {
  const rows = await db
    .selectDistinct({ topic: videoEntries.topic })
    .from(videoEntries)
    .where(eq(videoEntries.ownerId, ownerId))
    .orderBy(videoEntries.topic);
  return rows.map((row) => row.topic);
}

export async function getEntryForOwner(ownerId: string, entryId: string) {
  const rows = await db
    .select()
    .from(videoEntries)
    .where(and(eq(videoEntries.id, entryId), eq(videoEntries.ownerId, ownerId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getImagesForEntry(ownerId: string, entryId: string) {
  const entry = await getEntryForOwner(ownerId, entryId);
  if (!entry) return [];
  return db.select().from(entryImages).where(eq(entryImages.entryId, entryId)).orderBy(entryImages.createdAt);
}

export async function createEntry(ownerId: string, input: z.infer<typeof entryInputSchema>) {
  const parsed = entryInputSchema.parse(input);
  const youtubeId = ensureYouTubeUrl(parsed.youtubeUrl);
  const id = randomUUID();
  const rows = await db
    .insert(videoEntries)
    .values({ id, ownerId, ...parsed, youtubeId })
    .returning();
  return rows[0];
}

export async function updateEntry(ownerId: string, entryId: string, input: z.infer<typeof entryInputSchema>) {
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

export async function addEntryImage(ownerId: string, input: z.infer<typeof imageInputSchema>) {
  const parsed = imageInputSchema.parse(input);
  const entry = await getEntryForOwner(ownerId, parsed.entryId);
  if (!entry) throw new Error("That journal entry was not found.");
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
