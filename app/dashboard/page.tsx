import { FinderApp } from "@/components/finder/finder-app";
import {
  listEntryChoices,
  listFolders,
  listMemberships,
} from "@/lib/journal-cache";
import { requireOwner } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireOwner();
  // Keep large notes out of library queries and cached dashboard payloads.
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
