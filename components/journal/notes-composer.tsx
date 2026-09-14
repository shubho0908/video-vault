"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useState, useTransition } from "react";

import { saveEntryAction } from "@/app/actions";
import { MarkdownEditor } from "@/components/journal/markdown-editor";
import { Button } from "@/components/ui/button";
import type { NoteImageReference } from "@/lib/markdown";

export function NotesComposer({
  entryId,
  title,
  youtubeUrl,
  topic,
  initialNotes,
  imageRefs = [],
}: {
  entryId: string;
  title: string;
  youtubeUrl: string;
  topic: string;
  initialNotes: string;
  imageRefs?: NoteImageReference[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = notes !== savedNotes;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveEntryAction(entryId, {
        title,
        youtubeUrl,
        topic,
        notesMarkdown: notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedNotes(notes);
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-border/80 bg-card/80 px-5 py-6 hairline-top sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Refine in place
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
            Markdown note editor
          </h2>
        </div>
        <Button type="button" onClick={save} disabled={!dirty || pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
          {dirty ? "Save notes" : "Saved"}
        </Button>
      </div>
      <div className="mt-5">
        <MarkdownEditor
          value={notes}
          onChangeAction={setNotes}
          entryId={entryId}
          images={imageRefs}
          placeholder="# What I learned\n\nCapture the explanation in your own words..."
          minHeightClassName="min-h-72"
        />
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
