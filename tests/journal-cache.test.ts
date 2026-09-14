import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  unstableCache: vi.fn(),
  readEntry: vi.fn(),
  readImages: vi.fn(),
  readEntries: vi.fn(),
  readChoices: vi.fn(),
  readTopics: vi.fn(),
  readPlaylists: vi.fn(),
  readPlaylist: vi.fn(),
  readPlaylistEntries: vi.fn(),
}));

vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));
vi.mock("@/lib/journal", () => ({
  getEntryForOwner: mocks.readEntry,
  getImagesForEntry: mocks.readImages,
  listEntries: mocks.readEntries,
  listEntryChoices: mocks.readChoices,
  listTopics: mocks.readTopics,
  listPlaylists: mocks.readPlaylists,
  getPlaylistForOwner: mocks.readPlaylist,
  getPlaylistEntries: mocks.readPlaylistEntries,
}));

import {
  getEntryForOwner,
  getPlaylistForOwner,
  listEntries,
} from "@/lib/journal-cache";

describe("private journal cache isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unstableCache.mockImplementation(read => read);
  });

  it("keys and tags the same entry separately for every verified owner", async () => {
    mocks.readEntry.mockImplementation(async (ownerId: string) => ({
      ownerId,
    }));

    await expect(getEntryForOwner("owner-a", "entry-1")).resolves.toEqual({
      ownerId: "owner-a",
    });
    await expect(getEntryForOwner("owner-b", "entry-1")).resolves.toEqual({
      ownerId: "owner-b",
    });

    expect(mocks.unstableCache.mock.calls[0][1]).toEqual([
      "entry",
      "owner-a",
      "entry-1",
    ]);
    expect(mocks.unstableCache.mock.calls[1][1]).toEqual([
      "entry",
      "owner-b",
      "entry-1",
    ]);
    expect(mocks.unstableCache.mock.calls[0][2].tags).toEqual([
      "journal:owner-a:entry:entry-1",
    ]);
    expect(mocks.unstableCache.mock.calls[1][2].tags).toEqual([
      "journal:owner-b:entry:entry-1",
    ]);
  });

  it("includes filters in list cache keys so query results cannot collide", async () => {
    mocks.readEntries.mockResolvedValue([]);
    await listEntries("owner-a", "react", "web");
    await listEntries("owner-a", "sql", "db");
    expect(mocks.unstableCache.mock.calls[0][1]).toEqual([
      "entries",
      "owner-a",
      "react",
      "web",
    ]);
    expect(mocks.unstableCache.mock.calls[1][1]).toEqual([
      "entries",
      "owner-a",
      "sql",
      "db",
    ]);
  });

  it("keys playlist details by both owner and playlist", async () => {
    mocks.readPlaylist.mockResolvedValue(null);
    await getPlaylistForOwner("owner-a", "playlist-1");
    expect(mocks.unstableCache.mock.calls[0][1]).toEqual([
      "playlist",
      "owner-a",
      "playlist-1",
    ]);
    expect(mocks.unstableCache.mock.calls[0][2].tags).toContain(
      "journal:owner-a:playlist:playlist-1"
    );
  });
});
