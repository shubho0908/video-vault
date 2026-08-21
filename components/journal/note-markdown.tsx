import { Children, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

import { resolveNoteImageReferences, type NoteImageReference } from "@/lib/markdown";

type NoteMarkdownProps = {
  markdown: string;
  images?: NoteImageReference[];
  emptyMessage?: string;
  className?: string;
};

function MarkdownListItem({ children, node: _node, ...props }: ComponentPropsWithoutRef<"li"> & { node?: unknown }) {
  const childNodes = Children.toArray(children);
  const firstChild = childNodes[0];
  const task = typeof firstChild === "string" ? /^\[([ xX])\]\s+(.*)$/.exec(firstChild) : null;
  if (!task) return <li {...props}>{children}</li>;

  const complete = task[1].toLowerCase() === "x";
  return <li {...props} className="-ml-5 flex list-none items-start gap-2"><span className={`mt-1 grid size-4 shrink-0 place-items-center rounded border text-[10px] ${complete ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"}`} role="img" aria-label={complete ? "Completed task" : "Incomplete task"}>{complete ? "✓" : ""}</span><span>{task[2]}{childNodes.slice(1)}</span></li>;
}

export function NoteMarkdown({ markdown, images = [], emptyMessage = "No notes added yet.", className = "markdown-body" }: NoteMarkdownProps) {
  if (!markdown) return <p className="text-muted-foreground">{emptyMessage}</p>;

  return <article className={className}><ReactMarkdown components={{ li: MarkdownListItem }} rehypePlugins={[rehypeHighlight]}>{resolveNoteImageReferences(markdown, images)}</ReactMarkdown></article>;
}
