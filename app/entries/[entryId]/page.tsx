import { EntryScreen } from "@/components/finder/entry-screen";

export default async function EntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  return <EntryScreen mode="view" entryId={entryId} standalone />;
}
