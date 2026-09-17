import { describe, expect, it, vi } from "vitest";

import { entryInputSchema, imageInputSchema } from "@/lib/journal";

vi.mock("@/lib/db", () => ({ db: {} }));

describe("journal input validation", () => {
  it("accepts a complete video-entry payload", () => {
    const result = entryInputSchema.safeParse({
      title: "React fundamentals — components",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      topic: "React",
      notesMarkdown: "# What clicked\n\nComposition is about...",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL and oversize constrained fields", () => {
    expect(
      entryInputSchema.safeParse({
        title: "",
        youtubeUrl: "not-a-url",
        topic: "",
        notesMarkdown: "",
      }).success
    ).toBe(false);
    expect(
      entryInputSchema.safeParse({
        title: "t".repeat(161),
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        topic: "Topic",
        notesMarkdown: "",
      }).success
    ).toBe(false);
  });

  it("accepts only metadata for an image that belongs to a valid entry UUID", () => {
    expect(
      imageInputSchema.safeParse({
        entryId: "f4f681ca-eaeb-4e9a-b606-b9338ffdbb94",
        fileId: "file_1",
        filePath: "/journal/file.png",
        url: "https://ik.imagekit.io/demo/journal/file.png",
        width: 640,
        height: 480,
      }).success
    ).toBe(true);
    expect(
      imageInputSchema.safeParse({
        entryId: "not-a-uuid",
        fileId: "",
        filePath: "",
        url: "nope",
      }).success
    ).toBe(false);
  });
});
