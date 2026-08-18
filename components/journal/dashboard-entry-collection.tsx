"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, PlayCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { DeleteEntryButton } from "@/components/journal/delete-entry-button";
import { DashboardViewSwitch, type DashboardView } from "@/components/journal/dashboard-view-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DashboardEntry = { id: string; title: string; topic: string; youtubeId: string; createdAt: Date; notesMarkdown: string };
const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

export function DashboardEntryCollection({ entries }: { entries: DashboardEntry[] }) {
  const [view, setView] = useState<DashboardView>("grid");
  const changeView = useCallback((nextView: DashboardView) => setView(nextView), []);

  return (
    <section className="mt-7">
      <div className="mb-4 flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"} ready to revisit</p><DashboardViewSwitch value={view} onChange={changeView} /></div>
      {view === "grid" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{entries.map((entry) => <GridCard key={entry.id} entry={entry} />)}</div> : <div className="space-y-3">{entries.map((entry) => <ListRow key={entry.id} entry={entry} />)}</div>}
    </section>
  );
}

function GridCard({ entry }: { entry: DashboardEntry }) {
  return <Card className="group overflow-hidden border-border/80 bg-card/95 py-0 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"><div className="relative overflow-hidden bg-muted"><img src={`https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]" /><span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-background/92 text-primary shadow-sm"><PlayCircle className="size-4" /></span></div><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><Badge variant="secondary" className="max-w-[160px] truncate rounded-md px-2 py-0.5 font-normal">{entry.topic}</Badge><DeleteEntryButton entryId={entry.id} /></div><Link href={`/entries/${entry.id}`} className="mt-4 block"><h2 className="line-clamp-2 font-serif text-2xl leading-6 tracking-[-0.035em] group-hover:text-primary">{entry.title}</h2></Link><div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{dateFormat.format(entry.createdAt)}</span><Button asChild variant="ghost" size="sm" className="-mr-2 h-7 px-2 text-primary"><Link href={`/entries/${entry.id}`}>Open <ArrowUpRight className="size-3.5" /></Link></Button></div></CardContent></Card>;
}

function ListRow({ entry }: { entry: DashboardEntry }) {
  return <Card className="group border-border/80 bg-card/95 py-0 shadow-sm transition-shadow hover:shadow-md"><CardContent className="flex items-center gap-4 p-3 sm:gap-5 sm:p-4"><Link href={`/entries/${entry.id}`} className="relative shrink-0 overflow-hidden rounded-md bg-muted"><img src={`https://i.ytimg.com/vi/${entry.youtubeId}/default.jpg`} alt="" className="aspect-video w-28 object-cover sm:w-36" /><PlayCircle className="absolute inset-0 m-auto size-7 text-white drop-shadow" /></Link><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="rounded-md px-2 py-0.5 font-normal">{entry.topic}</Badge><span className="text-xs text-muted-foreground">{dateFormat.format(entry.createdAt)}</span></div><Link href={`/entries/${entry.id}`} className="mt-2 block"><h2 className="truncate font-serif text-xl tracking-[-0.03em] group-hover:text-primary sm:text-2xl">{entry.title}</h2></Link><p className="mt-1 hidden line-clamp-1 text-sm text-muted-foreground sm:block">{entry.notesMarkdown || "No learning notes added yet."}</p></div><div className="flex shrink-0 items-center gap-1"><Button asChild variant="ghost" size="icon-sm" className="hidden text-primary sm:inline-flex" aria-label={`Open ${entry.title}`}><Link href={`/entries/${entry.id}`}><ArrowUpRight /></Link></Button><DeleteEntryButton entryId={entry.id} /></div></CardContent></Card>;
}
