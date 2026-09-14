import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));
  const updateReturning = vi.fn();
  const where = vi.fn(() => ({ returning: updateReturning }));
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const entryLimit = vi.fn();
  const entryWhere = vi.fn(() => ({ limit: entryLimit }));
  const entryFrom = vi.fn(() => ({ where: entryWhere }));
  const imageOrderBy = vi.fn();
  const imageWhere = vi.fn(() => ({ orderBy: imageOrderBy }));
  const imageJoin = vi.fn(() => ({ where: imageWhere }));
  const imageFrom = vi.fn(() => ({ innerJoin: imageJoin }));
  const select = vi.fn();
  const deleteReturning = vi.fn();
  const deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
  const remove = vi.fn(() => ({ where: deleteWhere }));
  return {
    returning,
    values,
    insert,
    updateReturning,
    where,
    set,
    update,
    entryLimit,
    entryWhere,
    entryFrom,
    imageOrderBy,
    imageWhere,
    imageJoin,
    imageFrom,
    select,
    deleteReturning,
    deleteWhere,
    remove,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    insert: mocks.insert,
    update: mocks.update,
    select: mocks.select,
    delete: mocks.remove,
  },
}));

import { createEntry, deleteEntry, updateEntry } from "@/lib/journal";

const input = {
  title: "JavaScript fundamentals — scope",
  youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
  topic: "JavaScript",
  notesMarkdown: "# Scope\n\nWhat I need to remember.",
};

describe("owner-scoped journal writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an entry attached to the current owner and stores the normalized YouTube ID", async () => {
    mocks.returning.mockResolvedValueOnce([
      { id: "entry-1", ownerId: "owner-1", ...input, youtubeId: "dQw4w9WgXcQ" },
    ]);
    const created = await createEntry("owner-1", input);
    expect(created.id).toBe("entry-1");
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "owner-1",
        youtubeId: "dQw4w9WgXcQ",
        title: input.title,
      })
    );
  });

  it("updates only through the owner-constrained branch and returns the updated entry", async () => {
    mocks.updateReturning.mockResolvedValueOnce([
      { id: "entry-1", ownerId: "owner-1", ...input, youtubeId: "dQw4w9WgXcQ" },
    ]);
    const updated = await updateEntry("owner-1", "entry-1", input);
    expect(updated.ownerId).toBe("owner-1");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        youtubeId: "dQw4w9WgXcQ",
        updatedAt: expect.any(Date),
      })
    );
    expect(mocks.where).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed video URLs before issuing a database write", async () => {
    await expect(
      createEntry("owner-1", {
        ...input,
        youtubeUrl: "https://example.com/video",
      })
    ).rejects.toThrow("valid YouTube");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("deletes only an owner-scoped entry and returns its image metadata for downstream cleanup", async () => {
    mocks.select.mockReturnValueOnce({ from: mocks.imageFrom });
    mocks.imageOrderBy.mockResolvedValueOnce([
      {
        image: {
          id: "image-1",
          fileId: "file-1",
          filePath: "/journal/image.png",
        },
      },
    ]);
    mocks.deleteReturning.mockResolvedValueOnce([{ id: "entry-1" }]);

    const images = await deleteEntry("owner-1", "entry-1");

    expect(images).toEqual([
      { id: "image-1", fileId: "file-1", filePath: "/journal/image.png" },
    ]);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.deleteWhere).toHaveBeenCalledTimes(1);
  });
});
