import { BookOpenText } from "lucide-react";
import Link from "next/link";

import { DashboardEntryCollection } from "@/components/journal/dashboard-entry-collection";
import { DashboardFilter } from "@/components/journal/dashboard-filter";
import { JournalShell } from "@/components/journal/journal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listEntries, listTopics } from "@/lib/journal";
import { requireOwner } from "@/lib/session";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ q?: string; topic?: string }> }) {
  const session = await requireOwner();
  const { q = "", topic = "" } = await searchParams;
  const [entries, topics] = await Promise.all([listEntries(session.user.id, q, topic), listTopics(session.user.id)]);

  return <JournalShell userName={session.user.name}><main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14"><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end"><div><p className="text-sm font-medium tracking-[0.14em] text-primary uppercase">Private learning journal</p><h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[0.95] tracking-[-0.045em] sm:text-5xl sm:leading-[0.92] sm:tracking-[-0.055em] lg:text-6xl">Make your learning <em className="font-normal text-primary">revisitable.</em></h1><p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">A growing archive of your explanations, supporting notes, and the visual references that help ideas settle in.</p></div><Card className="border-border/80 bg-card/85 py-0 shadow-sm"><CardContent className="grid grid-cols-2 divide-x divide-border p-0"><div className="p-5"><p className="font-serif text-3xl tracking-[-0.04em]">{entries.length}</p><p className="mt-1 text-sm text-muted-foreground">Entries in view</p></div><div className="p-5"><p className="font-serif text-3xl tracking-[-0.04em]">{topics.length}</p><p className="mt-1 text-sm text-muted-foreground">Topics explored</p></div></CardContent></Card></div><div className="mt-10"><DashboardFilter topics={topics} /></div>{entries.length ? <DashboardEntryCollection entries={entries} /> : <Card className="mt-7 border-dashed border-border bg-card/55 py-0"><CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center"><span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><BookOpenText className="size-5" /></span><h2 className="mt-5 font-serif text-3xl tracking-[-0.035em]">Your next explanation belongs here.</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{q || topic ? "No entries match this search. Try another term or clear the current filter." : "Add your first unlisted video, write what you learned, and keep the important references alongside it."}</p>{!q && !topic ? <Button asChild className="mt-6 rounded-lg"><Link href="/entries/new">Create first entry</Link></Button> : null}</CardContent></Card>}</main></JournalShell>;
}
