import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("navigation performance boundaries", () => {
  it.each(["app/dashboard/loading.tsx", "app/entries/[entryId]/loading.tsx"])(
    "keeps %s synchronous and free of auth/database work",
    path => {
      const source = read(path);
      expect(source).not.toContain("getOwnerSession");
      expect(source).not.toMatch(/export default async function/);
    }
  );

  it.each([
    "app/playlists/[playlistId]/loading.tsx",
    "app/entries/[entryId]/edit/loading.tsx",
    "app/entries/new/loading.tsx",
  ])("provides an immediate loading boundary at %s", path => {
    expect(read(path)).toBeTruthy();
  });

  it("prefetches card destinations on mouse intent and keyboard focus", () => {
    const source = read("components/journal/performance-link.tsx");
    expect(source).toContain("router.prefetch");
    expect(source).toContain("onMouseEnter");
    expect(source).toContain("onFocus");
  });
});
