import { JournalShell } from "@/components/journal/journal-shell";
import { EntryForm } from "@/components/journal/entry-form";
import { requireOwner } from "@/lib/session";

export default async function NewEntryPage() {
  const session = await requireOwner();
  return <JournalShell userName={session.user.name}><main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12"><p className="text-sm font-medium tracking-[0.14em] text-primary uppercase">New learning entry</p><h1 className="mt-3 font-serif text-4xl tracking-[-0.045em] sm:text-5xl">Capture the explanation.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Pair the video with the details you want future-you to find in seconds.</p><div className="mt-8"><EntryForm /></div></main></JournalShell>;
}
