"use client";

import type { KeyboardEvent, ChangeEvent, DragEvent, ClipboardEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Code2,
  FileCode2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  LoaderCircle,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

import { NoteMarkdown } from "@/components/journal/note-markdown";
import { uploadEntryImage } from "@/components/journal/entry-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createNoteImageMarkdown, type NoteImageReference } from "@/lib/markdown";

type Selection = { start: number; end: number };
type HistoryItem = { value: string; selection: Selection };

type MarkdownEditorProps = {
  value: string;
  onChangeAction: (value: string) => void;
  entryId?: string;
  images?: NoteImageReference[];
  placeholder?: string;
  minHeightClassName?: string;
};

type SlashCommand = {
  label: string;
  description: string;
  terms: string;
  icon: typeof Heading1;
  run: () => void;
};

function ToolbarButton({ label, icon: Icon, onClick, disabled = false, spinning = false }: { label: string; icon: typeof Heading1; onClick: () => void; disabled?: boolean; spinning?: boolean }) {
  return <Button type="button" variant="ghost" size="icon-sm" className="rounded-md text-muted-foreground hover:text-foreground" onMouseDown={(event) => event.preventDefault()} onClick={onClick} disabled={disabled} aria-label={label} title={label}><Icon className={`size-4 ${spinning ? "animate-spin" : ""}`} /></Button>;
}

function currentLine(value: string, caret: number) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, caret - 1)) + 1;
  return { start: lineStart, value: value.slice(lineStart, caret) };
}

function imageFilesFromClipboard(event: ClipboardEvent<HTMLTextAreaElement>) {
  const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
  if (files.length) return files;
  return Array.from(event.clipboardData.items)
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

export function MarkdownEditor({ value, onChangeAction, entryId, images = [], placeholder = "Write the ideas, steps, and questions worth revisiting…", minHeightClassName = "min-h-80" }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Selection>({ start: value.length, end: value.length });
  const historyRef = useRef({ current: value, undo: [] as HistoryItem[], redo: [] as HistoryItem[] });
  const linkSelectionRef = useRef<Selection | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [availableImages, setAvailableImages] = useState(images);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvailableImages((current) => {
      const byId = new Map(current.map((image) => [image.id, image]));
      for (const image of images) byId.set(image.id, image);
      return Array.from(byId.values());
    });
  }, [images]);

  useEffect(() => {
    if (historyRef.current.current !== value) {
      historyRef.current = { current: value, undo: [], redo: [] };
      selectionRef.current = { start: value.length, end: value.length };
    }
  }, [value]);

  function setTextareaSelection(selection: Selection) {
    selectionRef.current = selection;
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selection.start, selection.end);
    });
  }

  function commit(nextValue: string, nextSelection: Selection = selectionRef.current) {
    const history = historyRef.current;
    if (nextValue === history.current) return;
    history.undo.push({ value: history.current, selection: selectionRef.current });
    if (history.undo.length > 100) history.undo.shift();
    history.redo = [];
    history.current = nextValue;
    onChangeAction(nextValue);
    setTextareaSelection(nextSelection);
  }

  function updateSelection(target: HTMLTextAreaElement) {
    selectionRef.current = { start: target.selectionStart, end: target.selectionEnd };
  }

  function onTextareaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextSelection = { start: event.target.selectionStart, end: event.target.selectionEnd };
    commit(event.target.value, nextSelection);

    const line = currentLine(event.target.value, nextSelection.start).value;
    const match = /^\/([^\n]*)$/.exec(line);
    setSlashQuery(match ? match[1].toLowerCase() : null);
    setSlashIndex(0);
  }

  function replaceSelection(replacement: string, selectionStart = replacement.length, selectionEnd = selectionStart) {
    const { start, end } = selectionRef.current;
    const source = historyRef.current.current;
    const nextValue = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
    const nextStart = start + selectionStart;
    commit(nextValue, { start: nextStart, end: start + selectionEnd });
  }

  function wrapSelection(prefix: string, suffix: string, placeholderText: string) {
    const { start, end } = selectionRef.current;
    const source = historyRef.current.current;
    const selected = source.slice(start, end);
    if (selected && selected.startsWith(prefix) && selected.endsWith(suffix)) {
      const replacement = selected.slice(prefix.length, selected.length - suffix.length);
      replaceSelection(replacement, 0, replacement.length);
      return;
    }
    const content = selected || placeholderText;
    replaceSelection(`${prefix}${content}${suffix}`, prefix.length, prefix.length + content.length);
  }

  function transformSelectedLines(transform: (lines: string[]) => string[]) {
    const source = historyRef.current.current;
    const selection = selectionRef.current;
    const start = source.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
    const newlineAfterSelection = source.indexOf("\n", selection.end);
    const end = newlineAfterSelection === -1 ? source.length : newlineAfterSelection;
    const lines = source.slice(start, end).split("\n");
    const replacement = transform(lines).join("\n");
    const nextValue = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
    const delta = replacement.length - (end - start);
    commit(nextValue, { start: Math.min(start + replacement.length, selection.start + delta), end: Math.max(start, selection.end + delta) });
  }

  function togglePrefix(prefix: string, matcher = (line: string) => line.startsWith(prefix), remove = (line: string) => line.slice(prefix.length)) {
    transformSelectedLines((lines) => {
      const nonEmptyLines = lines.filter(Boolean);
      const removePrefix = nonEmptyLines.length > 0 && nonEmptyLines.every(matcher);
      return lines.map((line) => {
        if (!line) return line;
        return removePrefix ? remove(line) : `${prefix}${line}`;
      });
    });
  }

  function toggleNumberedList() {
    const numberPrefix = /^\d+\.\s/;
    transformSelectedLines((lines) => {
      const nonEmptyLines = lines.filter(Boolean);
      const removePrefix = nonEmptyLines.length > 0 && nonEmptyLines.every((line) => numberPrefix.test(line));
      let position = 1;
      return lines.map((line) => {
        if (!line) return line;
        if (removePrefix) return line.replace(numberPrefix, "");
        const numbered = `${position}. ${line}`;
        position += 1;
        return numbered;
      });
    });
  }

  function insertCodeBlock() {
    const source = historyRef.current.current;
    const { start, end } = selectionRef.current;
    const selected = source.slice(start, end) || "code";
    replaceSelection(`\`\`\`\n${selected}\n\`\`\``, 4, 4 + selected.length);
  }

  function insertDivider() {
    const source = historyRef.current.current;
    const { start } = selectionRef.current;
    const before = source.slice(0, start).endsWith("\n") || start === 0 ? "" : "\n";
    const after = source.slice(start).startsWith("\n") || start === source.length ? "" : "\n";
    const divider = `${before}---${after}`;
    replaceSelection(divider, divider.length, divider.length);
  }

  function replaceSlashCommand(replacement: string, caretOffset = replacement.length) {
    const source = historyRef.current.current;
    const { start } = selectionRef.current;
    const line = currentLine(source, start);
    const nextValue = `${source.slice(0, line.start)}${replacement}${source.slice(start)}`;
    const nextCaret = line.start + caretOffset;
    commit(nextValue, { start: nextCaret, end: nextCaret });
    setSlashQuery(null);
  }

  function showLinkInput() {
    linkSelectionRef.current = selectionRef.current;
    setLinkUrl("");
    setLinkOpen(true);
  }

  function insertLink() {
    const url = linkUrl.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setError("Enter a complete http(s) or mailto link.");
      return;
    }

    const selection = linkSelectionRef.current ?? selectionRef.current;
    const source = historyRef.current.current;
    const label = source.slice(selection.start, selection.end) || "Link text";
    const replacement = `[${label}](${url})`;
    const nextValue = `${source.slice(0, selection.start)}${replacement}${source.slice(selection.end)}`;
    const caret = selection.start + replacement.length;
    commit(nextValue, { start: caret, end: caret });
    setLinkOpen(false);
    setError(null);
  }

  async function attachFiles(files: File[]) {
    if (!files.length) return;
    if (!entryId) {
      setError("Create this entry first, then paste, drop, or upload images into the note.");
      return;
    }

    setError(null);
    setUploading(true);
    let insertionPoint = selectionRef.current.start;
    try {
      for (const file of files) {
        const result = await uploadEntryImage(entryId, file);
        if (!result.ok) {
          setError(result.error);
          continue;
        }

        setAvailableImages((current) => [...current.filter((image) => image.id !== result.image.id), result.image]);
        const source = historyRef.current.current;
        const position = Math.min(insertionPoint, source.length);
        const leadingNewlines = position > 0 && !source.slice(0, position).endsWith("\n\n") ? "\n\n" : "";
        const trailingNewlines = source.slice(position).startsWith("\n\n") || position === source.length ? "" : "\n\n";
        const markdown = `${leadingNewlines}${createNoteImageMarkdown(result.image.id, result.image.altText)}${trailingNewlines}`;
        const nextValue = `${source.slice(0, position)}${markdown}${source.slice(position)}`;
        insertionPoint = position + markdown.length;
        commit(nextValue, { start: insertionPoint, end: insertionPoint });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const slashCommands: SlashCommand[] = useMemo(() => [
    { label: "Text", description: "Continue with a plain paragraph", terms: "text paragraph", icon: Heading1, run: () => replaceSlashCommand("") },
    { label: "Heading 1", description: "Large section heading", terms: "heading h1 title", icon: Heading1, run: () => replaceSlashCommand("# ", 2) },
    { label: "Heading 2", description: "Medium section heading", terms: "heading h2", icon: Heading2, run: () => replaceSlashCommand("## ", 3) },
    { label: "Heading 3", description: "Small section heading", terms: "heading h3", icon: Heading3, run: () => replaceSlashCommand("### ", 4) },
    { label: "To-do list", description: "A Markdown task item", terms: "todo task checkbox checklist", icon: ListChecks, run: () => replaceSlashCommand("- [ ] ", 6) },
    { label: "Bulleted list", description: "A simple list item", terms: "bullet list unordered", icon: List, run: () => replaceSlashCommand("- ", 2) },
    { label: "Numbered list", description: "An ordered list item", terms: "number list ordered", icon: ListOrdered, run: () => replaceSlashCommand("1. ", 3) },
    { label: "Quote", description: "Highlight a supporting thought", terms: "quote callout", icon: Quote, run: () => replaceSlashCommand("> ", 2) },
    { label: "Code block", description: "A fenced code sample", terms: "code snippet block", icon: FileCode2, run: () => replaceSlashCommand("```\n\n```", 4) },
    { label: "Divider", description: "A visual section break", terms: "divider separator line", icon: Minus, run: () => replaceSlashCommand("---", 3) },
    { label: "Upload image", description: entryId ? "Upload, paste, or drop a private image" : "Create the entry before adding images", terms: "image upload photo paste", icon: ImagePlus, run: () => { replaceSlashCommand(""); if (entryId) fileInputRef.current?.click(); else setError("Create this entry first, then add images."); } },
  ], [entryId, value]);

  const visibleSlashCommands = slashQuery === null
    ? []
    : slashCommands.filter((command) => `${command.label} ${command.terms}`.toLowerCase().includes(slashQuery)).slice(0, 7);

  function undo() {
    const history = historyRef.current;
    const previous = history.undo.pop();
    if (!previous) return;
    history.redo.push({ value: history.current, selection: selectionRef.current });
    history.current = previous.value;
    onChangeAction(previous.value);
    setTextareaSelection(previous.selection);
  }

  function redo() {
    const history = historyRef.current;
    const next = history.redo.pop();
    if (!next) return;
    history.undo.push({ value: history.current, selection: selectionRef.current });
    history.current = next.value;
    onChangeAction(next.value);
    setTextareaSelection(next.selection);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const modifier = event.metaKey || event.ctrlKey;
    if (slashQuery !== null && visibleSlashCommands.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashIndex((current) => (current + 1) % visibleSlashCommands.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashIndex((current) => (current - 1 + visibleSlashCommands.length) % visibleSlashCommands.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        visibleSlashCommands[slashIndex]?.run();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashQuery(null);
        return;
      }
    }
    if (!modifier) return;

    if (event.key.toLowerCase() === "b") { event.preventDefault(); wrapSelection("**", "**", "bold text"); }
    if (event.key.toLowerCase() === "i") { event.preventDefault(); wrapSelection("_", "_", "italic text"); }
    if (event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    if (event.shiftKey && event.key === "7") { event.preventDefault(); toggleNumberedList(); }
    if (event.shiftKey && event.key === "8") { event.preventDefault(); togglePrefix("- "); }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = imageFilesFromClipboard(event);
    if (!files.length) return;
    event.preventDefault();
    void attachFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    void attachFiles(files);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background shadow-xs">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
        <ToolbarButton label="Bold (⌘B)" icon={Bold} onClick={() => wrapSelection("**", "**", "bold text")} />
        <ToolbarButton label="Italic (⌘I)" icon={Italic} onClick={() => wrapSelection("_", "_", "italic text")} />
        <ToolbarButton label="Inline code" icon={Code2} onClick={() => wrapSelection("`", "`", "code")} />
        <ToolbarButton label="Add link" icon={Link2} onClick={showLinkInput} />
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label="Heading 1" icon={Heading1} onClick={() => togglePrefix("# ")} />
        <ToolbarButton label="Heading 2" icon={Heading2} onClick={() => togglePrefix("## ")} />
        <ToolbarButton label="Heading 3" icon={Heading3} onClick={() => togglePrefix("### ")} />
        <ToolbarButton label="Bulleted list (⌘⇧8)" icon={List} onClick={() => togglePrefix("- ")} />
        <ToolbarButton label="Numbered list (⌘⇧7)" icon={ListOrdered} onClick={toggleNumberedList} />
        <ToolbarButton label="To-do list" icon={ListChecks} onClick={() => togglePrefix("- [ ] ", (line) => /^- \[[ xX]\] /.test(line), (line) => line.replace(/^- \[[ xX]\] /, ""))} />
        <ToolbarButton label="Quote" icon={Quote} onClick={() => togglePrefix("> ")} />
        <ToolbarButton label="Code block" icon={FileCode2} onClick={insertCodeBlock} />
        <ToolbarButton label="Divider" icon={Minus} onClick={insertDivider} />
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label={entryId ? "Upload image" : "Create entry to upload images"} icon={uploading ? LoaderCircle : ImagePlus} onClick={() => entryId ? fileInputRef.current?.click() : setError("Create this entry first, then add images.")} disabled={uploading} spinning={uploading} />
        <span className="flex-1" />
        <ToolbarButton label="Undo (⌘Z)" icon={Undo2} onClick={undo} />
        <ToolbarButton label="Redo (⌘⇧Z)" icon={Redo2} onClick={redo} />
        <div className="ml-1 flex rounded-md border border-border bg-background p-0.5 text-xs">
          <button type="button" className={`rounded px-2 py-1 ${mode === "write" ? "bg-secondary text-foreground" : "text-muted-foreground"}`} onClick={() => setMode("write")}>Write</button>
          <button type="button" className={`rounded px-2 py-1 ${mode === "preview" ? "bg-secondary text-foreground" : "text-muted-foreground"}`} onClick={() => setMode("preview")}>Preview</button>
        </div>
      </div>
      {linkOpen ? <div className="flex flex-col gap-2 border-b border-border bg-muted/20 px-3 py-2 sm:flex-row"><Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); insertLink(); } if (event.key === "Escape") setLinkOpen(false); }} placeholder="https://example.com" type="url" autoFocus /><div className="flex gap-2"><Button type="button" size="sm" onClick={insertLink}>Add link</Button><Button type="button" size="sm" variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button></div></div> : null}
      {mode === "write" ? <div className="relative">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void attachFiles(Array.from(event.target.files ?? []))} />
        <textarea ref={textareaRef} value={value} onChange={onTextareaChange} onSelect={(event) => updateSelection(event.currentTarget)} onKeyDown={handleKeyDown} onPaste={handlePaste} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} placeholder={placeholder} className={`block w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-[13px] leading-6 outline-none placeholder:text-muted-foreground/75 sm:px-5 ${minHeightClassName} ${dragging ? "bg-primary/5 ring-2 ring-inset ring-primary/40" : ""}`} />
        {dragging ? <div className="pointer-events-none absolute inset-0 grid place-items-center border-2 border-dashed border-primary bg-primary/5 text-sm font-medium text-primary">Drop image to upload and insert</div> : null}
        {slashQuery !== null && visibleSlashCommands.length ? <div className="absolute left-3 top-3 z-10 w-72 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"><p className="px-2 py-1.5 text-xs text-muted-foreground">Add a block</p>{visibleSlashCommands.map((command, index) => { const Icon = command.icon; return <button key={command.label} type="button" className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${index === slashIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`} onMouseDown={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()} onClick={command.run}><span className="grid size-8 place-items-center rounded border border-border bg-background"><Icon className="size-4" /></span><span><span className="block text-sm font-medium">{command.label}</span><span className="block text-xs text-muted-foreground">{command.description}</span></span></button>; })}</div> : null}
      </div> : <div className={`${minHeightClassName} px-4 py-4 sm:px-5`}><NoteMarkdown markdown={value} images={availableImages} emptyMessage="Your Markdown preview will appear here." /></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"><span>{uploading ? "Uploading image securely…" : "Type / for blocks · Paste or drop an image anywhere in the editor"}</span><span>{value.length.toLocaleString()} / 50,000</span></div>
      {error ? <p className="border-t border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
