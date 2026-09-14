CREATE TABLE "playlist_entries" (
	"playlist_id" text NOT NULL,
	"entry_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playlist_entries" ADD CONSTRAINT "playlist_entries_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_entries" ADD CONSTRAINT "playlist_entries_entry_id_video_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."video_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "playlist_entries_playlist_entry_uidx" ON "playlist_entries" USING btree ("playlist_id","entry_id");--> statement-breakpoint
CREATE INDEX "playlist_entries_playlist_position_idx" ON "playlist_entries" USING btree ("playlist_id","position");--> statement-breakpoint
CREATE INDEX "playlist_entries_entry_idx" ON "playlist_entries" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "playlists_owner_updated_idx" ON "playlists" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "playlists_owner_name_uidx" ON "playlists" USING btree ("owner_id","name");