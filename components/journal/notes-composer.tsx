"use client";

import { Eye, FileText, LoaderCircle, Save } from "lucide-react";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";

import { saveEntryAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export function NotesComposer({ entryId, title, youtubeUrl, topic, initialNotes }: { entryId: string; title: string; youtubeUrl: string; topic: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = notes !== savedNotes;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveEntryAction(entryId, { title, youtubeUrl, topic, notesMarkdown: notes });
      if (!result.ok) { setError(result.error); return; }
      setSavedNotes(notes);
    });
  }

  return <section className="mt-6 rounded-xl border border-border/80 bg-card/90 px-5 py-6 sm:px-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">Refine in place</p><h2 className="mt-1 font-serif text-2xl tracking-[-0.035em]">Markdown note editor</h2></div><Button type="button" onClick={save} disabled={!dirty || pending} className="rounded-lg">{pending ? <LoaderCircle className="animate-spin" /> : <Save />}{dirty ? "Save notes" : "Saved"}</Button></div><Tabs defaultValue="write" className="mt-5"><TabsList className="h-8 rounded-md"><TabsTrigger value="write" className="gap-1.5 text-xs"><FileText className="size-3.5" /> Write</TabsTrigger><TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye className="size-3.5" /> Preview</TabsTrigger></TabsList><TabsContent value="write" className="mt-3"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="# What I learned\n\nCapture the explanation in your own words..." className="min-h-72 resize-y font-mono text-[13px] leading-6" /></TabsContent><TabsContent value="preview" className="mt-3"><div className="min-h-72 rounded-md border border-input bg-background px-4 py-4 sm:px-6"><article className="markdown-body">{notes ? <ReactMarkdown>{notes}</ReactMarkdown> : <p className="text-muted-foreground">Your Markdown preview will appear here.</p>}</article></div></TabsContent></Tabs>{error ? <p className="mt-4 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}</section>;
}
