import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NoteMarkdown } from "@/components/journal/note-markdown";

describe("note Markdown rendering", () => {
  it("renders Markdown task syntax as an accessible task row", () => {
    const markup = renderToStaticMarkup(createElement(NoteMarkdown, { markdown: "- [x] Publish the learning notes" }));

    expect(markup).toContain('aria-label="Completed task"');
    expect(markup).toContain("Publish the learning notes");
    expect(markup).toContain("lucide-check");
  });

  it("renders remark-gfm task lists as an accessible task row without a raw checkbox input", () => {
    const markup = renderToStaticMarkup(createElement(NoteMarkdown, { markdown: "- [ ] Watch the talk\n- [x] Take notes" }));

    expect(markup).toContain('aria-label="Incomplete task"');
    expect(markup).toContain('aria-label="Completed task"');
    expect(markup).not.toContain("<input");
  });

  it("renders GFM pipe tables as a real table with headers", () => {
    const markdown = "| Concept | Status |\n| --- | --- |\n| Sharding | learning |";
    const markup = renderToStaticMarkup(createElement(NoteMarkdown, { markdown }));

    expect(markup).toContain("<table");
    expect(markup).toContain("<th>Concept</th>");
    expect(markup).toContain("<td>Sharding</td>");
  });

  it("renders GFM strikethrough as a del element", () => {
    const markup = renderToStaticMarkup(createElement(NoteMarkdown, { markdown: "~~outdated plan~~ new plan" }));

    expect(markup).toContain("<del>outdated plan</del>");
  });

  it("renders a deleted private image as text instead of an image with an empty source", () => {
    const markup = renderToStaticMarkup(createElement(NoteMarkdown, { markdown: "![Old diagram](imagekit://deleted-image)" }));

    expect(markup).toContain("Image unavailable: Old diagram");
    expect(markup).not.toContain("<img");
  });

  it("syntax-highlights fenced code blocks", () => {
    const markdown = "```ts\nconst retries = 3; // attempt\n```";
    const markup = renderToStaticMarkup(createElement(NoteMarkdown, { markdown }));

    expect(markup).toContain("hljs language-ts");
    expect(markup).toContain("hljs-keyword");
    expect(markup).toContain("hljs-comment");
  });
});
