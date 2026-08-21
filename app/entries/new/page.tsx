import { JournalShell } from "@/components/journal/journal-shell";
import { EntryForm } from "@/components/journal/entry-form";
import { requireOwner } from "@/lib/session";

export default async function NewEntryPage() {
  const session = await requireOwner();
  return (
    <JournalShell userName={session.user.name}>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="reveal max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">New learning entry</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Capture the explanation.</h1>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground">
            Pair the video with the details you want future-you to find in seconds.
          </p>
        </div>
        <div className="reveal reveal-d1 mt-9"><EntryForm /></div>
      </main>
    </JournalShell>
  );
}
