import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../components/journal/playlist-dialog.tsx", import.meta.url),
  "utf8"
);

describe("playlist editor ordering controls", () => {
  it("shows explicit, accessible reorder and removal controls", () => {
    expect(source).toContain("Playlist order");
    expect(source).toContain("Move ${entry.title} up");
    expect(source).toContain("Move ${entry.title} down");
    expect(source).toContain("Remove ${entry.title} from playlist");
    expect(source).toContain("function move(id: string, direction: -1 | 1)");
  });
});
