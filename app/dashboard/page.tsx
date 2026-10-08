import { FinderApp } from "@/components/finder/finder-app";
import {
  listEntryChoices,
  listFolders,
  listMemberships,
} from "@/lib/journal-cache";
import { requireOwner } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireOwner();
  // The Finder only renders id/title/topic/youtubeId and folder id/name. Fetch and cache exactly that:
  // never notes_markdown (up to 50 KB per row, which would also blow past the 2 MB data-cache item limit).
  const [entries, folders, memberships] = await Promise.all([
    listEntryChoices(session.user.id),
    listFolders(session.user.id),
    listMemberships(session.user.id),
  ]);

  return (
    <FinderApp
      userName={session.user.name ?? "Account"}
      initial={{
        entries,
        folders: [...folders].reverse(),
        memberships,
      }}
    />
  );
}
