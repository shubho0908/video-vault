// @vitest-environment jsdom
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions", () => ({
  createFolderAction: vi.fn(),
  deletePlaylistAction: vi.fn(),
  placeEntryAction: vi.fn(),
  renameFolderAction: vi.fn(),
}));

import { useLibrary, type LibraryData } from "@/components/finder/library";

const initial: LibraryData = {
  entries: [
    { id: "a", title: "A", topic: "t", youtubeId: "ya" },
    { id: "b", title: "B", topic: "t", youtubeId: "yb" },
  ],
  folders: [
    { id: "f1", name: "One" },
    { id: "f2", name: "Two" },
  ],
  memberships: [{ playlistId: "f1", entryId: "a" }],
};

function mount(commands: Parameters<typeof useLibrary>[1]) {
  let lib!: ReturnType<typeof useLibrary>;
  const Probe = () => ((lib = useLibrary(initial, commands)), null);
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(Probe)));
  return () => lib;
}
const ok = async () => ({ ok: true });

describe("finder library", () => {
  it("moves an entry between folders and keeps unfiled in sync", async () => {
    const place = vi.fn(ok);
    const get = mount({ create: vi.fn(), rename: vi.fn(), remove: vi.fn(), place });
    await act(async () => get().place("a", "f1", "f2"));
    expect(place).toHaveBeenCalledWith({ entryId: "a", fromId: "f1", toId: "f2" });
    expect(get().data.memberships).toEqual([{ playlistId: "f2", entryId: "a" }]);
    expect(get().entriesIn("unfiled").map(e => e.id)).toEqual(["b"]);
  });

  it("copy (no from) keeps the source membership", async () => {
    const get = mount({ create: vi.fn(), rename: vi.fn(), remove: vi.fn(), place: vi.fn(ok) });
    await act(async () => get().place("a", null, "f2"));
    expect(get().data.memberships).toHaveLength(2);
  });

  it("rolls back and surfaces the error when the server rejects", async () => {
    const place = vi.fn(async () => ({ ok: false, error: "nope" }));
    const get = mount({ create: vi.fn(), rename: vi.fn(), remove: vi.fn(), place });
    await act(async () => get().place("b", null, "f1"));
    expect(get().data.memberships).toEqual(initial.memberships);
    expect(get().error).toBe("nope");
  });

  it("rename changes only the name; deleting a folder drops its memberships", async () => {
    const rename = vi.fn(ok);
    const get = mount({ create: vi.fn(), rename, remove: vi.fn(ok), place: vi.fn() });
    await act(async () => get().renameFolder("f1", "Uno"));
    expect(rename).toHaveBeenCalledWith("f1", "Uno");
    expect(get().data.memberships).toEqual(initial.memberships);
    await act(async () => get().deleteFolder("f1"));
    expect(get().data.memberships).toEqual([]);
    expect(get().entriesIn("unfiled")).toHaveLength(2);
  });
  it("shows a new folder instantly and waits for the real id before renaming it", async () => {
    let resolve!: (v: { ok: boolean; id: string }) => void;
    const create = vi.fn(() => new Promise<{ ok: boolean; id: string }>(r => (resolve = r)));
    const rename = vi.fn(ok);
    const get = mount({ create, rename, remove: vi.fn(), place: vi.fn() });
    let id = "";
    await act(async () => { id = await get().createFolder("New"); });
    expect(get().data.folders.map(f => f.name)).toContain("New");
    await act(async () => get().renameFolder(id, "Renamed"));
    expect(rename).not.toHaveBeenCalled();
    expect(get().data.folders.find(f => f.id === id)?.name).toBe("Renamed");
    await act(async () => resolve({ ok: true, id: "real-1" }));
    expect(rename).toHaveBeenCalledWith("real-1", "Renamed");
    expect(get().data.folders.find(f => f.id === id)?.name).toBe("Renamed");
  });

  it("drops a folder whose create failed and fails dependent ops", async () => {
    const rename = vi.fn(ok);
    const get = mount({ create: vi.fn(async () => ({ ok: false, error: "no" })), rename, remove: vi.fn(), place: vi.fn() });
    let id = "";
    await act(async () => { id = await get().createFolder("Nope"); });
    expect(get().data.folders.map(f => f.id)).not.toContain(id);
    expect(get().error).toBe("no");
  });

  it("a failed op does not undo a different in-flight op", async () => {
    let failIt!: (v: { ok: boolean; error: string }) => void;
    const place = vi.fn(() => new Promise<{ ok: boolean; error: string }>(r => (failIt = r)));
    const rename = vi.fn(ok);
    const get = mount({ create: vi.fn(), rename, remove: vi.fn(), place: place as never });
    await act(async () => get().place("b", null, "f1"));
    await act(async () => get().renameFolder("f2", "Dos"));
    await act(async () => failIt({ ok: false, error: "x" }));
    expect(get().data.folders.find(f => f.id === "f2")?.name).toBe("Dos");
    expect(get().data.memberships).toEqual(initial.memberships);
  });
});
