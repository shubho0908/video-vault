import { describe, expect, it } from "vitest";

import {
  createNoteImageMarkdown,
  resolveNoteImageReferences,
} from "@/lib/markdown";

describe("private Markdown image references", () => {
  it("stores an image ID instead of a time-limited signed URL", () => {
    expect(createNoteImageMarkdown("image-1", "architecture [draft].png")).toBe(
      "![architecture draft.png](imagekit://image-1)"
    );
  });

  it("resolves only images supplied by the entry owner", () => {
    const markdown =
      "Before\n\n![Diagram](imagekit://image-1)\n\n![Unknown](imagekit://image-2)";
    const resolved = resolveNoteImageReferences(markdown, [
      {
        id: "image-1",
        signedUrl: "https://ik.example/diagram.png?ik-s=signature",
      },
    ]);

    expect(resolved).toContain(
      "![Diagram](https://ik.example/diagram.png?ik-s=signature)"
    );
    expect(resolved).toContain("*[Image unavailable: Unknown]*");
    expect(resolved).not.toContain("imagekit://image-2");
  });
});
