import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const ownedWhere = vi.fn();
  const playlistLimit = vi.fn();
  const playlistWhere = vi.fn(() => ({ limit: playlistLimit }));
  const selectFrom = vi.fn(() => ({ where: ownedWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  const playlistValues = vi.fn(() => "create-playlist-query");
  const membershipValues = vi.fn(() => "insert-memberships-query");
  const insert = vi.fn();

  const updateWhere = vi.fn(() => "update-playlist-query");
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const deleteWhere = vi.fn(() => "clear-memberships-query");
  const remove = vi.fn(() => ({ where: deleteWhere }));
  const batch = vi.fn();

  return {
    ownedWhere,
    playlistLimit,
    playlistWhere,
    selectFrom,
    select,
    playlistValues,
    membershipValues,
    insert,
    updateWhere,
    updateSet,
    update,
    deleteWhere,
    remove,
    batch,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.remove,
    batch: mocks.batch,
  },
}));

import { createPlaylist, updatePlaylist } from "@/lib/journal";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const PLAYLIST = "33333333-3333-4333-8333-333333333333";

function queueOwned(ids: string[]) {
  mocks.ownedWhere.mockResolvedValueOnce(ids.map(id => ({ id })));
}

function queuePlaylist(ownerId = "owner-1") {
  mocks.selectFrom.mockImplementationOnce(() => ({
    where: mocks.playlistWhere,
  }));
  mocks.playlistLimit.mockResolvedValueOnce([
    {
      id: PLAYLIST,
      ownerId,
      name: "Old name",
      description: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
}

describe("owner-scoped playlist persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectFrom.mockImplementation(() => ({ where: mocks.ownedWhere }));
    mocks.batch.mockResolvedValue([]);
    mocks.insert
      .mockReturnValueOnce({ values: mocks.playlistValues })
      .mockReturnValueOnce({ values: mocks.membershipValues });
  });

  it("rejects a selected entry that is not owned before any write", async () => {
    queueOwned([A]);
    await expect(
      createPlaylist("owner-1", {
        name: "Path",
        description: "",
        entryIds: [A, B],
      })
    ).rejects.toThrow("selected entries were not found");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  it("deduplicates IDs without changing first-selection order and saves atomically", async () => {
    queueOwned([A, B]);
    await createPlaylist("owner-1", {
      name: "Path",
      description: "",
      entryIds: [B, A, B],
    });
    expect(mocks.membershipValues).toHaveBeenCalledWith([
      expect.objectContaining({ entryId: B, position: 0 }),
      expect.objectContaining({ entryId: A, position: 1 }),
    ]);
    expect(mocks.batch).toHaveBeenCalledWith([
      "create-playlist-query",
      "insert-memberships-query",
    ]);
  });

  it("rejects a foreign or missing playlist before replacing membership", async () => {
    queueOwned([A]);
    mocks.selectFrom.mockImplementationOnce(() => ({
      where: mocks.playlistWhere,
    }));
    mocks.playlistLimit.mockResolvedValueOnce([]);
    await expect(
      updatePlaylist("owner-1", PLAYLIST, {
        name: "Path",
        description: "",
        entryIds: [A],
      })
    ).rejects.toThrow("playlist was not found");
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  it("replaces membership with an empty list in the same atomic batch as the playlist update", async () => {
    queuePlaylist();
    await updatePlaylist("owner-1", PLAYLIST, {
      name: "Empty path",
      description: "",
      entryIds: [],
    });
    expect(mocks.batch).toHaveBeenCalledWith([
      "update-playlist-query",
      "clear-memberships-query",
    ]);
    expect(mocks.membershipValues).not.toHaveBeenCalled();
  });

  it("surfaces a failed atomic replacement instead of reporting a partial save", async () => {
    queueOwned([A]);
    queuePlaylist();
    mocks.batch.mockRejectedValueOnce(new Error("replacement failed"));
    await expect(
      updatePlaylist("owner-1", PLAYLIST, {
        name: "Path",
        description: "",
        entryIds: [A],
      })
    ).rejects.toThrow("replacement failed");
  });
});
