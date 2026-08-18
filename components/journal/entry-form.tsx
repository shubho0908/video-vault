"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, Video } from "lucide-react";
import { useState, useTransition } from "react";

import { saveEntryAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/journal/markdown-editor";
import type { JournalEntry } from "@/lib/journal";
import type { NoteImageReference } from "@/lib/markdown";
import { getYouTubeThumbnail } from "@/lib/youtube";

type FormState = {
  title: string;
  youtubeUrl: string;
  topic: string;
  notesMarkdown: string;
};

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    const candidate = host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.searchParams.get("v") ?? (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : "");
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function EntryForm({ entry, imageRefs = [] }: { entry?: JournalEntry; imageRefs?: NoteImageReference[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<FormState>({
    title: entry?.title ?? "",
    youtubeUrl: entry?.youtubeUrl ?? "",
    topic: entry?.topic ?? "",
    notesMarkdown: entry?.notesMarkdown ?? "",
  });
  const id = youtubeId(values.youtubeUrl);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveEntryAction(entry?.id ?? null, values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/entries/${result.id ?? entry?.id}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="border-border/80 bg-card/95 py-0 shadow-sm">
        <CardContent className="p-5 sm:p-7">
          <div className="grid gap-5">
            <div className="grid gap-2"><Label htmlFor="title">Title</Label><Input id="title" value={values.title} onChange={(event) => update("title", event.target.value)} placeholder="What did you explain?" autoFocus /></div>
            <div className="grid gap-2"><Label htmlFor="url">Unlisted YouTube URL</Label><Input id="url" type="url" value={values.youtubeUrl} onChange={(event) => update("youtubeUrl", event.target.value)} placeholder="https://youtu.be/..." /></div>
            <div className="grid gap-2"><Label htmlFor="topic">Topic</Label><Input id="topic" value={values.topic} onChange={(event) => update("topic", event.target.value)} placeholder="React, JavaScript, Computer networks..." /></div>
            <div className="mt-1 grid gap-3"><div className="flex items-center justify-between gap-4"><Label>Learning notes</Label><span className="text-xs text-muted-foreground">Markdown · blocks · private images</span></div><MarkdownEditor value={values.notesMarkdown} onChangeAction={(notesMarkdown) => update("notesMarkdown", notesMarkdown)} entryId={entry?.id} images={imageRefs} minHeightClassName="min-h-[430px]" /></div>
          </div>
          {error ? <p className="mt-5 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button asChild variant="ghost" disabled={pending}><Link href={entry ? `/entries/${entry.id}` : "/dashboard"}>Cancel</Link></Button><Button onClick={submit} disabled={pending} className="rounded-lg">{pending ? <LoaderCircle className="animate-spin" /> : <Save />}{entry ? "Save changes" : "Create entry"}</Button></div>
        </CardContent>
      </Card>
      <aside className="space-y-5">
        <div className="rounded-xl border border-border/75 bg-card/75 p-5"><div className="mb-3 flex items-center gap-2 text-sm font-medium"><Video className="size-4 text-primary" /> Video preview</div>{id ? <div className="overflow-hidden rounded-lg border border-border bg-muted"><img src={getYouTubeThumbnail(id)} alt="YouTube thumbnail preview" className="aspect-video w-full object-cover" /></div> : <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-muted/40 px-5 text-center text-sm leading-5 text-muted-foreground">Paste a valid YouTube URL to preview its thumbnail.</div>}</div>
        <div className="rounded-xl border border-border/75 bg-card/75 p-5 text-sm leading-6 text-muted-foreground"><p className="font-medium text-foreground">A note on reference images</p><p className="mt-2">{entry ? "Save your changes, then add private reference images from the edit page." : "Create this entry first. You can then attach private reference images from its edit page."}</p></div>
      </aside>
    </div>
  );
}
