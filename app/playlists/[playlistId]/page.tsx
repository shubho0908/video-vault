import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/finder/page-shell";
import { PlaylistDialog } from "@/components/journal/playlist-dialog";
import {
  getPlaylistEntries,
  getPlaylistForOwner,
  listEntryChoices,
} from "@/lib/journal-cache";
import { requireOwner } from "@/lib/session";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const session = await requireOwner();
  const { playlistId } = await params;
  const [playlist, entries, allEntries] = await Promise.all([
    getPlaylistForOwner(session.user.id, playlistId),
    getPlaylistEntries(session.user.id, playlistId),
    listEntryChoices(session.user.id),
  ]);
  if (!playlist) notFound();
  return (
    <PageShell title={playlist.name} back="/dashboard" backLabel="Library">
      <div className="pg-doc">
        <h2 className="pg-h1">{playlist.name}</h2>
        <div className="pg-lede">
          <p>{playlist.description || "A focused collection from your private learning journal."}</p>
        </div>
        <p className="pg-meta">
          {entries.length} {entries.length === 1 ? "video" : "videos"}
        </p>
        <div className="pg-actions" style={{ justifyContent: "flex-start" }}>
          <PlaylistDialog
            entries={allEntries}
            playlist={{ ...playlist, entryIds: entries.map(entry => entry.id) }}
            triggerLabel="Edit playlist"
          />
        </div>
        {entries.length ? (
          <ul className="pg-list">
            {entries.map(entry => (
              <li key={entry.id}>
                <Link href={`/entries/${entry.id}`} className="pg-row">
                  <img src={`https://i.ytimg.com/vi/${entry.youtubeId}/mqdefault.jpg`} alt="" />
                  <span>
                    <b>{entry.title}</b>
                    <small>{entry.topic}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pg-p">This playlist has no videos yet.</p>
        )}
      </div>
    </PageShell>
  );
}
