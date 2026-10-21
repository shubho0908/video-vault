import {
  Children,
  isValidElement,
  memo,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from "react";
import { Check } from "lucide-react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  resolveNoteImageReferences,
  type NoteImageReference,
} from "@/lib/markdown";
import { rehypeCodeHighlight } from "@/lib/rehype-code-highlight";

type NoteMarkdownProps = {
  markdown: string;
  images?: NoteImageReference[];
  emptyMessage?: string;
  className?: string;
};

// Module-level so ReactMarkdown sees the same plugin/component identities on every render.
const REMARK_PLUGINS: Options["remarkPlugins"] = [remarkGfm];
const REHYPE_PLUGINS: Options["rehypePlugins"] = [rehypeCodeHighlight];
const EMPTY_IMAGES: NoteImageReference[] = [];

function MarkdownListItem({
  children,
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"li"> & { node?: unknown }) {
  const childNodes = Children.toArray(children);
  const firstChild = childNodes[0];
  // Literal “[x] item” text (pre-GFM notes) or a remark-gfm task-list checkbox input.
  const task =
    typeof firstChild === "string"
      ? /^\[([ xX])\]\s+(.*)$/.exec(firstChild)
      : null;
  const gfmCheckbox =
    isValidElement<{ type?: string; checked?: boolean }>(firstChild) &&
    (firstChild as ReactElement<{ type?: string; checked?: boolean }>).props
      .type === "checkbox"
      ? (firstChild as ReactElement<{ checked?: boolean }>)
      : null;
  if (!task && !gfmCheckbox) return <li {...props}>{children}</li>;

  const complete = task
    ? task[1].toLowerCase() === "x"
    : Boolean(gfmCheckbox?.props.checked);
  const content = task ? (
    <>
      {task[2]}
      {childNodes.slice(1)}
    </>
  ) : (
    <>{childNodes.slice(1)}</>
  );
  return (
    <li {...props} className="-ml-5 flex list-none items-start gap-2">
      <span
        className={`mt-1 grid size-4 shrink-0 place-items-center rounded border text-[10px] ${complete ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"}`}
        role="img"
        aria-label={complete ? "Completed task" : "Incomplete task"}
      >
        {complete ? <Check className="size-2.5" strokeWidth={3} /> : null}
      </span>
      <span>{content}</span>
    </li>
  );
}

const MARKDOWN_COMPONENTS: Components = { li: MarkdownListItem };

/**
 * Memoized: parents (the entry window, the editor) re-render on every keystroke and state change, but the
 * Markdown → React pipeline (parse, GFM, syntax highlighting) only needs to rerun when the text or the
 * image set actually changes.
 */
export const NoteMarkdown = memo(function NoteMarkdown({
  markdown,
  images = EMPTY_IMAGES,
  emptyMessage = "No notes added yet.",
  className = "markdown-body",
}: NoteMarkdownProps) {
  const resolved = useMemo(
    () => (markdown ? resolveNoteImageReferences(markdown, images) : ""),
    [markdown, images]
  );

  if (!markdown) return <p className="text-muted-foreground">{emptyMessage}</p>;

  return (
    <article className={className}>
      <ReactMarkdown
        components={MARKDOWN_COMPONENTS}
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
      >
        {resolved}
      </ReactMarkdown>
    </article>
  );
});
