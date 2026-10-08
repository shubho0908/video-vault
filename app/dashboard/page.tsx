import { FinderApp } from "@/components/finder/finder-app";
import {
  listEntries,
  listMemberships,
  listPlaylists,
} from "@/lib/journal-cache";
import { requireOwner } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireOwner();
  const [entries, playlists, memberships] = await Promise.all([
    listEntries(session.user.id),
    listPlaylists(session.user.id),
    listMemberships(session.user.id),
  ]);

  return (
    <FinderApp
      userName={session.user.name ?? "Account"}
      initial={{
        entries: entries.map(({ id, title, topic, youtubeId }) => ({ id, title, topic, youtubeId })),
        folders: [...playlists].reverse().map(({ id, name }) => ({ id, name })),
        memberships,
      }}
    />
  );
}
