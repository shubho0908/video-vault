import { EntrySkeleton } from "@/components/finder/entry-skeleton";

/** Shown the moment an entry is opened from the Finder, while the server renders the real window. */
export default function Loading() {
  return <EntrySkeleton mode="view" />;
}
