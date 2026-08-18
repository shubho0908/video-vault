import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NoteMarkdown } from "@/components/journal/note-markdown";

describe("note Markdown rendering", () => {
  it("renders Markdown task syntax as an accessible task row", () => {
    const markup = renderToStaticMarkup(createElement(NoteMarkdown, { markdown: "- [x] Publish the learning notes" }));

    expect(markup).toContain('aria-label="Completed task"');
    expect(markup).toContain("Publish the learning notes");
    expect(markup).toContain("✓");
  });

  it("renders a deleted private image as text instead of an image with an empty source", () => {
    const markup = renderToStaticMarkup(createElement(NoteMarkdown, { markdown: "![Old diagram](imagekit://deleted-image)" }));

    expect(markup).toContain("Image unavailable: Old diagram");
    expect(markup).not.toContain("<img");
  });
});
