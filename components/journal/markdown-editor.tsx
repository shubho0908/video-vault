"use client";

import type {
  KeyboardEvent,
  ChangeEvent,
  DragEvent,
  ClipboardEvent,
  MouseEvent,
} from "react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  createNoteImageMarkdown,
  type NoteImageReference,
} from "@/lib/markdown";

type Selection = { start: number; end: number };
type HistoryItem = { value: string; selection: Selection };
type History = {
  current: string;
  undo: HistoryItem[];
  redo: HistoryItem[];
  typingSince: number;
  typingInserts: boolean;
};

const HISTORY_LIMIT = 100;
// Cap history memory, but retain the newest step so the latest edit remains undoable.
const HISTORY_CHAR_BUDGET = 1_000_000;
const TYPING_STEP_MS = 700;
const EMPTY_IMAGES: NoteImageReference[] = [];
const NO_SLASH_COMMANDS: SlashCommand[] = [];

function trimHistory(history: History) {
  if (history.undo.length > HISTORY_LIMIT) {
    history.undo.splice(0, history.undo.length - HISTORY_LIMIT);
  }
  let retained = history.current.length;
  for (const item of history.undo) retained += item.value.length;
  for (const item of history.redo) retained += item.value.length;
  while (retained > HISTORY_CHAR_BUDGET && history.undo.length > 1) {
    retained -= history.undo.shift()!.value.length;
  }
}

type ToolbarAction =
  | "bold"
  | "italic"
  | "inlineCode"
  | "link"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "numberedList"
  | "todoList"
  | "quote"
  | "codeBlock"
  | "divider"
  | "image"
  | "undo"
  | "redo";

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
  replacement: string;
  caret: number;
  upload?: boolean;
};

const SLASH_COMMANDS: SlashCommand[] = [
  {
    label: "Text",
    description: "Continue with a plain paragraph",
    terms: "text paragraph",
    icon: Heading1,
    replacement: "",
    caret: 0,
  },
  {
    label: "Heading 1",
    description: "Large section heading",
    terms: "heading h1 title",
    icon: Heading1,
    replacement: "# ",
    caret: 2,
  },
  {
    label: "Heading 2",
    description: "Medium section heading",
    terms: "heading h2",
    icon: Heading2,
    replacement: "## ",
    caret: 3,
  },
  {
    label: "Heading 3",
    description: "Small section heading",
    terms: "heading h3",
    icon: Heading3,
    replacement: "### ",
    caret: 4,
  },
  {
    label: "To-do list",
    description: "A Markdown task item",
    terms: "todo task checkbox checklist",
    icon: ListChecks,
    replacement: "- [ ] ",
    caret: 6,
  },
  {
    label: "Bulleted list",
    description: "A simple list item",
    terms: "bullet list unordered",
    icon: List,
    replacement: "- ",
    caret: 2,
  },
  {
    label: "Numbered list",
    description: "An ordered list item",
    terms: "number list ordered",
    icon: ListOrdered,
    replacement: "1. ",
    caret: 3,
  },
  {
    label: "Quote",
    description: "Highlight a supporting thought",
    terms: "quote callout",
    icon: Quote,
    replacement: "> ",
    caret: 2,
  },
  {
    label: "Code block",
    description: "A fenced code sample",
    terms: "code snippet block",
    icon: FileCode2,
    replacement: "```\n\n```",
    caret: 4,
  },
  {
    label: "Divider",
    description: "A visual section break",
    terms: "divider separator line",
    icon: Minus,
    replacement: "---",
    caret: 3,
  },
  {
    label: "Upload image",
    description: "Upload, paste, or drop a private image",
    terms: "image upload photo paste",
    icon: ImagePlus,
    replacement: "",
    caret: 0,
    upload: true,
  },
];

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled = false,
  spinning = false,
}: {
  label: string;
  icon: typeof Heading1;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="rounded-md text-muted-foreground hover:text-foreground"
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon className={`size-4 ${spinning ? "animate-spin" : ""}`} />
    </Button>
  );
}

function currentLine(value: string, caret: number) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, caret - 1)) + 1;
  return { start: lineStart, value: value.slice(lineStart, caret) };
}

const EditorToolbar = memo(function EditorToolbar({
  entryId,
  uploading,
  mode,
  onAction,
  onModeChange,
}: {
  entryId?: string;
  uploading: boolean;
  mode: "write" | "preview";
  onAction: (action: ToolbarAction) => void;
  onModeChange: (mode: "write" | "preview") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
      <ToolbarButton
        label="Bold (⌘B)"
        icon={Bold}
        onClick={() => onAction("bold")}
      />
      <ToolbarButton
        label="Italic (⌘I)"
        icon={Italic}
        onClick={() => onAction("italic")}
      />
      <ToolbarButton
        label="Inline code"
        icon={Code2}
        onClick={() => onAction("inlineCode")}
      />
      <ToolbarButton
        label="Add link"
        icon={Link2}
        onClick={() => onAction("link")}
      />
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="Heading 1"
        icon={Heading1}
        onClick={() => onAction("heading1")}
      />
      <ToolbarButton
        label="Heading 2"
        icon={Heading2}
        onClick={() => onAction("heading2")}
      />
      <ToolbarButton
        label="Heading 3"
        icon={Heading3}
        onClick={() => onAction("heading3")}
      />
      <ToolbarButton
        label="Bulleted list (⌘⇧8)"
        icon={List}
        onClick={() => onAction("bulletList")}
      />
      <ToolbarButton
        label="Numbered list (⌘⇧7)"
        icon={ListOrdered}
        onClick={() => onAction("numberedList")}
      />
      <ToolbarButton
        label="To-do list"
        icon={ListChecks}
        onClick={() => onAction("todoList")}
      />
      <ToolbarButton
        label="Quote"
        icon={Quote}
        onClick={() => onAction("quote")}
      />
      <ToolbarButton
        label="Code block"
        icon={FileCode2}
        onClick={() => onAction("codeBlock")}
      />
      <ToolbarButton
        label="Divider"
        icon={Minus}
        onClick={() => onAction("divider")}
      />
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label={entryId ? "Upload image" : "Create entry to upload images"}
        icon={uploading ? LoaderCircle : ImagePlus}
        onClick={() => onAction("image")}
        disabled={uploading}
        spinning={uploading}
      />
      <span className="flex-1" />
      <ToolbarButton
        label="Undo (⌘Z)"
        icon={Undo2}
        onClick={() => onAction("undo")}
      />
      <ToolbarButton
        label="Redo (⌘⇧Z)"
        icon={Redo2}
        onClick={() => onAction("redo")}
      />
      <div className="ml-1 flex rounded-md border border-border bg-background p-0.5 text-xs">
        <button
          type="button"
          className={`rounded px-2 py-1 ${mode === "write" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
          onClick={() => onModeChange("write")}
        >
          Write
        </button>
        <button
          type="button"
          className={`rounded px-2 py-1 ${mode === "preview" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
          onClick={() => onModeChange("preview")}
        >
          Preview
        </button>
      </div>
    </div>
  );
});

function imageFilesFromClipboard(event: ClipboardEvent<HTMLTextAreaElement>) {
  const files = Array.from(event.clipboardData.files).filter(file =>
    file.type.startsWith("image/")
  );
  if (files.length) return files;
  return Array.from(event.clipboardData.items)
    .filter(item => item.type.startsWith("image/"))
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null);
}

export function MarkdownEditor({
  value,
  onChangeAction,
  entryId,
  images = EMPTY_IMAGES,
  placeholder = "Write the ideas, steps, and questions worth revisiting…",
  minHeightClassName = "min-h-80",
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Selection>({
    start: value.length,
    end: value.length,
  });
  const historyRef = useRef<History>({
    current: value,
    undo: [],
    redo: [],
    typingSince: 0,
    typingInserts: true,
  });
  const composingRef = useRef(false);
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
    setAvailableImages(current => {
      const byId = new Map(current.map(image => [image.id, image]));
      for (const image of images) byId.set(image.id, image);
      return Array.from(byId.values());
    });
  }, [images]);

  useEffect(() => {
    if (historyRef.current.current !== value) {
      historyRef.current = {
        current: value,
        undo: [],
        redo: [],
        typingSince: 0,
        typingInserts: true,
      };
      selectionRef.current = { start: value.length, end: value.length };
    }
  }, [value]);

  // Only restore the caret after programmatic edits; plain typing belongs to the browser and IME.
  function setTextareaSelection(selection: Selection) {
    selectionRef.current = selection;
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea || composingRef.current) return;
      textarea.focus();
      textarea.setSelectionRange(selection.start, selection.end);
    });
  }

  function commit(
    nextValue: string,
    nextSelection: Selection = selectionRef.current,
    typing = false
  ) {
    const history = historyRef.current;
    if (nextValue === history.current) return;
    const now = performance.now();
    const inserts = nextValue.length >= history.current.length;
    const extendsTypingStep =
      typing &&
      history.typingSince > 0 &&
      (composingRef.current ||
        (now - history.typingSince < TYPING_STEP_MS &&
          inserts === history.typingInserts &&
          !(inserts && nextValue.charCodeAt(nextSelection.start - 1) === 10)));
    if (!extendsTypingStep) {
      history.undo.push({
        value: history.current,
        selection: selectionRef.current,
      });
      history.typingSince = typing ? now : 0;
      history.typingInserts = inserts;
    }
    history.redo = [];
    history.current = nextValue;
    if (!extendsTypingStep) trimHistory(history);
    onChangeAction(nextValue);
    if (typing) selectionRef.current = nextSelection;
    else setTextareaSelection(nextSelection);
  }

  function updateSelection(target: HTMLTextAreaElement) {
    selectionRef.current = {
      start: target.selectionStart,
      end: target.selectionEnd,
    };
  }

  function onTextareaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextSelection = {
      start: event.target.selectionStart,
      end: event.target.selectionEnd,
    };
    const inputType = (event.nativeEvent as InputEvent).inputType ?? "";
    const pasted = inputType === "insertFromPaste" || inputType === "insertFromDrop";
    if (pasted) historyRef.current.typingSince = 0;
    commit(event.target.value, nextSelection, true);
    if (pasted) historyRef.current.typingSince = 0;

    const line = currentLine(event.target.value, nextSelection.start).value;
    const match = /^\/([^\n]*)$/.exec(line);
    setSlashQuery(match ? match[1].toLowerCase() : null);
    setSlashIndex(0);
  }

  function replaceSelection(
    replacement: string,
    selectionStart = replacement.length,
    selectionEnd = selectionStart
  ) {
    const { start, end } = selectionRef.current;
    const source = historyRef.current.current;
    const nextValue = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
    const nextStart = start + selectionStart;
    commit(nextValue, { start: nextStart, end: start + selectionEnd });
  }

  function wrapSelection(
    prefix: string,
    suffix: string,
    placeholderText: string
  ) {
    const { start, end } = selectionRef.current;
    const source = historyRef.current.current;
    const selected = source.slice(start, end);
    if (selected && selected.startsWith(prefix) && selected.endsWith(suffix)) {
      const replacement = selected.slice(
        prefix.length,
        selected.length - suffix.length
      );
      replaceSelection(replacement, 0, replacement.length);
      return;
    }
    const content = selected || placeholderText;
    replaceSelection(
      `${prefix}${content}${suffix}`,
      prefix.length,
      prefix.length + content.length
    );
  }

  function transformSelectedLines(transform: (lines: string[]) => string[]) {
    const source = historyRef.current.current;
    const selection = selectionRef.current;
    const start =
      source.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
    const newlineAfterSelection = source.indexOf("\n", selection.end);
    const end =
      newlineAfterSelection === -1 ? source.length : newlineAfterSelection;
    const lines = source.slice(start, end).split("\n");
    const replacement = transform(lines).join("\n");
    const nextValue = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
    const delta = replacement.length - (end - start);
    commit(nextValue, {
      start: Math.min(start + replacement.length, selection.start + delta),
      end: Math.max(start, selection.end + delta),
    });
  }

  function togglePrefix(
    prefix: string,
    matcher = (line: string) => line.startsWith(prefix),
    remove = (line: string) => line.slice(prefix.length)
  ) {
    transformSelectedLines(lines => {
      const nonEmptyLines = lines.filter(Boolean);
      const removePrefix =
        nonEmptyLines.length > 0 && nonEmptyLines.every(matcher);
      return lines.map(line => {
        if (!line) return line;
        return removePrefix ? remove(line) : `${prefix}${line}`;
      });
    });
  }

  function toggleNumberedList() {
    const numberPrefix = /^\d+\.\s/;
    transformSelectedLines(lines => {
      const nonEmptyLines = lines.filter(Boolean);
      const removePrefix =
        nonEmptyLines.length > 0 &&
        nonEmptyLines.every(line => numberPrefix.test(line));
      let position = 1;
      return lines.map(line => {
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
    const before =
      source.slice(0, start).endsWith("\n") || start === 0 ? "" : "\n";
    const after =
      source.slice(start).startsWith("\n") || start === source.length
        ? ""
        : "\n";
    const divider = `${before}---${after}`;
    replaceSelection(divider, divider.length, divider.length);
  }

  function replaceSlashCommand(
    replacement: string,
    caretOffset = replacement.length
  ) {
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
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol))
        throw new Error();
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
      setError(
        "Create this entry first, then paste, drop, or upload images into the note."
      );
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

        setAvailableImages(current => [
          ...current.filter(image => image.id !== result.image.id),
          result.image,
        ]);
        const source = historyRef.current.current;
        const position = Math.min(insertionPoint, source.length);
        const leadingNewlines =
          position > 0 && !source.slice(0, position).endsWith("\n\n")
            ? "\n\n"
            : "";
        const trailingNewlines =
          source.slice(position).startsWith("\n\n") ||
          position === source.length
            ? ""
            : "\n\n";
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

  const visibleSlashCommands = useMemo(
    () =>
      slashQuery === null
        ? NO_SLASH_COMMANDS
        : SLASH_COMMANDS.filter(command =>
            `${command.label} ${command.terms}`
              .toLowerCase()
              .includes(slashQuery)
          )
            .slice(0, 7)
            .map(command =>
              command.upload && !entryId
                ? {
                    ...command,
                    description: "Create the entry before adding images",
                  }
                : command
            ),
    [slashQuery, entryId]
  );

  function runSlashCommand(command: SlashCommand) {
    replaceSlashCommand(command.replacement, command.caret);
    if (!command.upload) return;
    if (entryId) fileInputRef.current?.click();
    else setError("Create this entry first, then add images.");
  }

  function undo() {
    const history = historyRef.current;
    const previous = history.undo.pop();
    if (!previous) return;
    history.typingSince = 0;
    history.redo.push({
      value: history.current,
      selection: selectionRef.current,
    });
    history.current = previous.value;
    onChangeAction(previous.value);
    setTextareaSelection(previous.selection);
  }

  function redo() {
    const history = historyRef.current;
    const next = history.redo.pop();
    if (!next) return;
    history.typingSince = 0;
    history.undo.push({
      value: history.current,
      selection: selectionRef.current,
    });
    history.current = next.value;
    onChangeAction(next.value);
    setTextareaSelection(next.selection);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const modifier = event.metaKey || event.ctrlKey;
    if (slashQuery !== null && visibleSlashCommands.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashIndex(current => (current + 1) % visibleSlashCommands.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashIndex(
          current =>
            (current - 1 + visibleSlashCommands.length) %
            visibleSlashCommands.length
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const command = visibleSlashCommands[slashIndex];
        if (command) runSlashCommand(command);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashQuery(null);
        return;
      }
    }
    if (!modifier) return;

    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrapSelection("**", "**", "bold text");
    }
    if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      wrapSelection("_", "_", "italic text");
    }
    if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    }
    if (event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    }
    if (event.shiftKey && event.key === "7") {
      event.preventDefault();
      toggleNumberedList();
    }
    if (event.shiftKey && event.key === "8") {
      event.preventDefault();
      togglePrefix("- ");
    }
  }

  function runToolbarAction(action: ToolbarAction) {
    switch (action) {
      case "bold":
        return wrapSelection("**", "**", "bold text");
      case "italic":
        return wrapSelection("_", "_", "italic text");
      case "inlineCode":
        return wrapSelection("`", "`", "code");
      case "link":
        return showLinkInput();
      case "heading1":
        return togglePrefix("# ");
      case "heading2":
        return togglePrefix("## ");
      case "heading3":
        return togglePrefix("### ");
      case "bulletList":
        return togglePrefix("- ");
      case "numberedList":
        return toggleNumberedList();
      case "todoList":
        return togglePrefix(
          "- [ ] ",
          line => /^- \[[ xX]\] /.test(line),
          line => line.replace(/^- \[[ xX]\] /, "")
        );
      case "quote":
        return togglePrefix("> ");
      case "codeBlock":
        return insertCodeBlock();
      case "divider":
        return insertDivider();
      case "image":
        if (entryId) fileInputRef.current?.click();
        else setError("Create this entry first, then add images.");
        return;
      case "undo":
        return undo();
      case "redo":
        return redo();
    }
  }

  const toolbarActionRef = useRef(runToolbarAction);
  useLayoutEffect(() => {
    toolbarActionRef.current = runToolbarAction;
  });
  const onToolbarAction = useCallback(
    (action: ToolbarAction) => toolbarActionRef.current(action),
    []
  );

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = imageFilesFromClipboard(event);
    if (!files.length) return;
    event.preventDefault();
    void attachFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files).filter(file =>
      file.type.startsWith("image/")
    );
    void attachFiles(files);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background shadow-xs">
      <EditorToolbar
        entryId={entryId}
        uploading={uploading}
        mode={mode}
        onAction={onToolbarAction}
        onModeChange={setMode}
      />
      {linkOpen ? (
        <div className="flex flex-col gap-2 border-b border-border bg-muted/20 px-3 py-2 sm:flex-row">
          <Input
            value={linkUrl}
            onChange={event => setLinkUrl(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                insertLink();
              }
              if (event.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://example.com"
            type="url"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={insertLink}>
              Add link
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setLinkOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {mode === "write" ? (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={event =>
              void attachFiles(Array.from(event.target.files ?? []))
            }
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onTextareaChange}
            onSelect={event => updateSelection(event.currentTarget)}
            onCompositionStart={() => {
              composingRef.current = true;
              historyRef.current.typingSince = 0;
            }}
            onCompositionEnd={() => {
              // Safari emits the final composition input after compositionend; close the undo step next tick.
              setTimeout(() => {
                composingRef.current = false;
                historyRef.current.typingSince = 0;
              }, 0);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDragOver={event => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            placeholder={placeholder}
            className={`block w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-[13px] leading-6 outline-none placeholder:text-muted-foreground/75 sm:px-5 ${minHeightClassName} ${dragging ? "bg-primary/5 ring-2 ring-inset ring-primary/40" : ""}`}
          />
          {dragging ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center border-2 border-dashed border-primary bg-primary/5 text-sm font-medium text-primary">
              Drop image to upload and insert
            </div>
          ) : null}
          {slashQuery !== null && visibleSlashCommands.length ? (
            <div className="absolute left-3 top-3 z-10 w-72 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg">
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Add a block
              </p>
              {visibleSlashCommands.map((command, index) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.label}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${index === slashIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                    onMouseDown={(event: MouseEvent<HTMLButtonElement>) =>
                      event.preventDefault()
                    }
                    onClick={() => runSlashCommand(command)}
                  >
                    <span className="grid size-8 place-items-center rounded border border-border bg-background">
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">
                        {command.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {command.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={`${minHeightClassName} px-4 py-4 sm:px-5`}>
          <NoteMarkdown
            markdown={value}
            images={availableImages}
            emptyMessage="Your Markdown preview will appear here."
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <span>
          {uploading
            ? "Uploading image securely…"
            : "Type / for blocks · Paste or drop an image anywhere in the editor"}
        </span>
        <span>{value.length.toLocaleString()} / 50,000</span>
      </div>
      {error ? (
        <p className="border-t border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
