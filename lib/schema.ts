import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  table => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    uniqueIndex("account_issuer_accountId_uidx").on(
      table.issuer,
      table.accountId
    ),
    index("account_userId_idx").on(table.userId),
  ]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [index("verification_identifier_idx").on(table.identifier)]
);

export const videoEntries = pgTable(
  "video_entries",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    youtubeUrl: text("youtube_url").notNull(),
    youtubeId: text("youtube_id").notNull(),
    topic: text("topic").notNull(),
    notesMarkdown: text("notes_markdown").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index("video_entries_owner_updated_idx").on(table.ownerId, table.updatedAt),
    index("video_entries_owner_topic_idx").on(table.ownerId, table.topic),
  ]
);

export const playlists = pgTable(
  "playlists",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index("playlists_owner_updated_idx").on(table.ownerId, table.updatedAt),
    uniqueIndex("playlists_owner_name_uidx").on(table.ownerId, table.name),
  ]
);

export const playlistEntries = pgTable(
  "playlist_entries",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    entryId: text("entry_id")
      .notNull()
      .references(() => videoEntries.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("playlist_entries_playlist_entry_uidx").on(
      table.playlistId,
      table.entryId
    ),
    index("playlist_entries_playlist_position_idx").on(
      table.playlistId,
      table.position
    ),
    index("playlist_entries_entry_idx").on(table.entryId),
  ]
);

export const entryImages = pgTable(
  "entry_images",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => videoEntries.id, { onDelete: "cascade" }),
    fileId: text("file_id").notNull(),
    filePath: text("file_path").notNull(),
    url: text("url").notNull(),
    altText: text("alt_text"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    index("entry_images_entry_created_idx").on(table.entryId, table.createdAt),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  videoEntries: many(videoEntries),
  playlists: many(playlists),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const videoEntryRelations = relations(videoEntries, ({ one, many }) => ({
  owner: one(user, { fields: [videoEntries.ownerId], references: [user.id] }),
  images: many(entryImages),
  playlistEntries: many(playlistEntries),
}));

export const entryImageRelations = relations(entryImages, ({ one }) => ({
  entry: one(videoEntries, {
    fields: [entryImages.entryId],
    references: [videoEntries.id],
  }),
}));

export const playlistRelations = relations(playlists, ({ one, many }) => ({
  owner: one(user, { fields: [playlists.ownerId], references: [user.id] }),
  entries: many(playlistEntries),
}));

export const playlistEntryRelations = relations(playlistEntries, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistEntries.playlistId],
    references: [playlists.id],
  }),
  entry: one(videoEntries, {
    fields: [playlistEntries.entryId],
    references: [videoEntries.id],
  }),
}));
