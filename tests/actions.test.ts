import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  addEntryImage: vi.fn(),
  deleteEntryImage: vi.fn(),
  removeImageKitAsset: vi.fn(),
  createSignedImageKitUrl: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/session", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/imagekit", () => ({ removeImageKitAsset: mocks.removeImageKitAsset, createSignedImageKitUrl: mocks.createSignedImageKitUrl }));
vi.mock("@/lib/journal", () => ({
  entryInputSchema: { parse: (input: unknown) => input },
  imageInputSchema: { parse: (input: unknown) => input },
  createEntry: mocks.createEntry,
  updateEntry: mocks.updateEntry,
  deleteEntry: mocks.deleteEntry,
  addEntryImage: mocks.addEntryImage,
  deleteEntryImage: mocks.deleteEntryImage,
}));

import { attachImageAction, deleteEntryAction, deleteEntryImageAction, saveEntryAction } from "@/app/actions";

const entryInput = {
  title: "Computer networks — TCP",
  youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
  topic: "Computer networks",
  notesMarkdown: "# TCP\n\nReliable delivery.",
};

describe("protected journal server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.removeImageKitAsset.mockResolvedValue(undefined);
    mocks.createSignedImageKitUrl.mockReturnValue("https://ik.example/private-image.png?ik-s=signature");
  });

  it("blocks an unauthenticated save before any entry mutation", async () => {
    mocks.requireOwner.mockRejectedValueOnce(new Error("restricted"));

    const result = await saveEntryAction(null, entryInput);

    expect(result).toEqual({ ok: false, error: "restricted" });
    expect(mocks.createEntry).not.toHaveBeenCalled();
    expect(mocks.updateEntry).not.toHaveBeenCalled();
  });

  it("uses the authenticated owner identity for a new entry", async () => {
    mocks.requireOwner.mockResolvedValueOnce({ user: { id: "owner-1" } });
    mocks.createEntry.mockResolvedValueOnce({ id: "entry-1" });

    const result = await saveEntryAction(null, entryInput);

    expect(result).toEqual({ ok: true, id: "entry-1" });
    expect(mocks.createEntry).toHaveBeenCalledWith("owner-1", entryInput);
  });

  it("blocks a signed-in non-owner before a save mutation runs", async () => {
    mocks.requireOwner.mockRejectedValueOnce(new Error("restricted: owner email mismatch"));

    const result = await saveEntryAction("entry-1", entryInput);

    expect(result).toEqual({ ok: false, error: "restricted: owner email mismatch" });
    expect(mocks.updateEntry).not.toHaveBeenCalled();
  });

  it("blocks an unauthenticated delete before records or remote assets can be removed", async () => {
    mocks.requireOwner.mockRejectedValueOnce(new Error("restricted"));

    const result = await deleteEntryAction("entry-1");

    expect(result).toEqual({ ok: false, error: "restricted" });
    expect(mocks.deleteEntry).not.toHaveBeenCalled();
    expect(mocks.removeImageKitAsset).not.toHaveBeenCalled();
  });

  it("blocks an unauthenticated reference-image attachment before database writes", async () => {
    mocks.requireOwner.mockRejectedValueOnce(new Error("restricted"));

    const result = await attachImageAction({
      entryId: "f4f681ca-eaeb-4e9a-b606-b9338ffdbb94",
      fileId: "file-1",
      filePath: "/journal/file.png",
      url: "https://ik.imagekit.io/demo/journal/file.png",
    });

    expect(result).toEqual({ ok: false, error: "restricted" });
    expect(mocks.addEntryImage).not.toHaveBeenCalled();
  });

  it("returns a private signed URL after attaching an entry-owned image", async () => {
    mocks.requireOwner.mockResolvedValueOnce({ user: { id: "owner-1" } });
    mocks.addEntryImage.mockResolvedValueOnce({ id: "image-1", entryId: "f4f681ca-eaeb-4e9a-b606-b9338ffdbb94", filePath: "/journal/image.png" });

    const result = await attachImageAction({
      entryId: "f4f681ca-eaeb-4e9a-b606-b9338ffdbb94",
      fileId: "file-1",
      filePath: "/journal/image.png",
      url: "https://ik.imagekit.io/demo/journal/image.png",
    });

    expect(result).toEqual({ ok: true, id: "image-1", signedUrl: "https://ik.example/private-image.png?ik-s=signature" });
    expect(mocks.createSignedImageKitUrl).toHaveBeenCalledWith("/journal/image.png");
  });

  it("blocks an unauthenticated reference-image deletion before database or ImageKit cleanup", async () => {
    mocks.requireOwner.mockRejectedValueOnce(new Error("restricted"));

    const result = await deleteEntryImageAction("image-1", "entry-1");

    expect(result).toEqual({ ok: false, error: "restricted" });
    expect(mocks.deleteEntryImage).not.toHaveBeenCalled();
    expect(mocks.removeImageKitAsset).not.toHaveBeenCalled();
  });
});
