"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Layers3,
  LoaderCircle,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { savePlaylistAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Playlist membership is many-to-many, so the same entry may appear in several playlists.
type PlaylistEntryChoice = {
  id: string;
  title: string;
  topic: string;
  youtubeId: string;
};
type PlaylistDraft = {
  id?: string;
  name?: string;
  description?: string;
  entryIds?: string[];
};

export function PlaylistDialog({
  entries,
  playlist,
  triggerLabel = "New playlist",
}: {
  entries: PlaylistEntryChoice[];
  playlist?: PlaylistDraft;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(playlist?.name ?? "");
  const [description, setDescription] = useState(playlist?.description ?? "");
  const [selected, setSelected] = useState(
    () => new Set(playlist?.entryIds ?? [])
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? entries.filter(entry =>
          `${entry.title} ${entry.topic}`.toLowerCase().includes(needle)
        )
      : entries;
  }, [entries, query]);

  function toggle(id: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function move(id: string, direction: -1 | 1) {
    setSelected(current => {
      const ordered = [...current];
      const from = ordered.indexOf(id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= ordered.length) return current;
      [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
      return new Set(ordered);
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await savePlaylistAction(playlist?.id ?? null, {
        name,
        description,
        entryIds: [...selected],
      });
      if (!result.ok) return setError(result.error);
      setOpen(false);
      router.push(`/playlists/${result.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={playlist ? "outline" : "default"} size="sm">
          {playlist ? <Save /> : <Plus />}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-xl border border-border/70 bg-secondary/60 text-primary">
            <Layers3 className="size-4" />
          </div>
          <DialogTitle>
            {playlist ? "Edit playlist" : "Build a playlist"}
          </DialogTitle>
          <DialogDescription>
            Group related explanations into one focused path. An entry can live
            in more than one playlist.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="playlist-name">Name</Label>
            <Input
              id="playlist-name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="System design fundamentals"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="playlist-description">Description</Label>
            <Textarea
              id="playlist-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="What connects these videos?"
              className="min-h-20 resize-none"
            />
          </div>
        </div>
        <div className="rounded-xl bg-card/60">
          <div className="flex flex-col gap-3 px-4 pt-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Choose entries</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selected.size} selected · reorder explicitly below
              </p>
            </div>
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Find a video or topic"
              className="h-9 sm:w-60"
            />
          </div>
          {selected.size ? (
            <div className="mx-3 mt-2 rounded-lg bg-background/55 p-2">
              <p className="px-2 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Playlist order
              </p>
              <ol className="grid gap-1">
                {[...selected].map((id, index) => {
                  const entry = entries.find(candidate => candidate.id === id);
                  if (!entry) return null;
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                    >
                      <span className="tnum w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {entry.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move ${entry.title} up`}
                        disabled={index === 0}
                        onClick={() => move(id, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move ${entry.title} down`}
                        disabled={index === selected.size - 1}
                        onClick={() => move(id, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${entry.title} from playlist`}
                        onClick={() => toggle(id)}
                      >
                        <X />
                      </Button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
          <div className="grid max-h-64 gap-2.5 overflow-y-auto p-3">
            {filtered.map(entry => {
              const active = selected.has(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => toggle(entry.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px",
                    active
                      ? "bg-primary/12 shadow-[0_6px_20px_-14px_oklch(0.62_0.15_265_/_0.65)] ring-1 ring-primary/35"
                      : "bg-background/50 hover:bg-accent/60"
                  )}
                >
                  <img
                    src={`https://i.ytimg.com/vi/${entry.youtubeId}/default.jpg`}
                    alt=""
                    className="aspect-video w-20 shrink-0 rounded-lg object-cover min-[430px]:w-24 sm:w-28"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-sm font-semibold leading-snug tracking-tight">
                      {entry.title}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                      {entry.topic}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "grid size-7 min-h-7 min-w-7 shrink-0 basis-7 place-items-center rounded-full border transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_-6px_oklch(0.62_0.15_265)]"
                        : "border-border bg-background"
                    )}
                  >
                    <Check
                      className={cn(
                        "size-3.5",
                        active ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </span>
                </button>
              );
            })}
            {!filtered.length ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No matching entries.
              </p>
            ) : null}
          </div>
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !name.trim()}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
            {playlist ? "Save playlist" : "Create playlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

