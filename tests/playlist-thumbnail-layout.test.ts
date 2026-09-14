import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../components/journal/playlist-shelf.tsx", import.meta.url),
  "utf8"
);

describe("playlist thumbnail collage", () => {
  it("matches the grid columns to the available preview count", () => {
    expect(source).toContain(
      'playlist.previewEntries.length <= 1 && "grid-cols-1"'
    );
    expect(source).toContain(
      'playlist.previewEntries.length === 2 && "grid-cols-2"'
    );
    expect(source).toContain(
      'playlist.previewEntries.length >= 3 && "grid-cols-3"'
    );
  });

  it("forces every thumbnail to fill its grid cell", () => {
    expect(source).toContain('className="h-full min-w-0 w-full object-cover"');
  });
});
