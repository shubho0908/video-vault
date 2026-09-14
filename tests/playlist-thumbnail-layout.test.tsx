import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({ savePlaylistAction: vi.fn() }));

import { PlaylistShelf } from "@/components/journal/playlist-shelf";

const entries = [
  { id: "1", title: "One", topic: "React", youtubeId: "video-one" },
  { id: "2", title: "Two", topic: "React", youtubeId: "video-two" },
  { id: "3", title: "Three", topic: "React", youtubeId: "video-three" },
];

function renderPreview(count: number) {
  return renderToStaticMarkup(
    <PlaylistShelf
      entries={entries}
      playlists={[
        {
          id: `playlist-${count}`,
          name: `${count} videos`,
          description: "Test playlist",
          entryCount: count,
          previewEntries: entries.slice(0, count),
        },
      ]}
    />
  );
}

describe("playlist thumbnail collage", () => {
  it.each([
    [1, "grid-cols-1"],
    [2, "grid-cols-2"],
    [3, "grid-cols-3"],
  ])("renders %i preview(s) in the matching grid", (count, gridClass) => {
    const markup = renderPreview(count as number);
    expect(markup).toContain(gridClass);
    expect(markup.match(/i\.ytimg\.com/g)).toHaveLength(count);
    expect(markup.match(/h-full min-w-0 w-full object-cover/g)).toHaveLength(
      count
    );
  });

  it("uses YouTube's 16:9 thumbnail source instead of the letterboxed 4:3 source", () => {
    const markup = renderPreview(1);
    expect(markup).toContain("/mqdefault.jpg");
    expect(markup).not.toContain("/hqdefault.jpg");
  });
});
