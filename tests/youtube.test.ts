import { describe, expect, it } from "vitest";

import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getYouTubeVideoId,
} from "@/lib/youtube";

describe("YouTube URL utilities", () => {
  it("accepts supported watch, short, embed, and short-link formats", () => {
    expect(
      getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=4")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(getYouTubeVideoId("https://youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(getYouTubeVideoId("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("rejects malformed and unsupported URLs", () => {
    expect(getYouTubeVideoId("not a URL")).toBeNull();
    expect(
      getYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")
    ).toBeNull();
    expect(
      getYouTubeVideoId("https://youtube.com/watch?v=too-short")
    ).toBeNull();
  });

  it("uses privacy-enhanced embeds and standard YouTube thumbnails", () => {
    expect(getYouTubeEmbedUrl("dQw4w9WgXcQ")).toContain(
      "youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
    expect(getYouTubeThumbnail("dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
  });
});

