import { EntryScreen } from "@/components/finder/entry-screen";

export default async function Page({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  return <EntryScreen mode="edit" entryId={entryId} standalone={false} />;
}
