// @vitest-environment jsdom
// Static imports let vi.mock intercept app actions before module evaluation.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions", () => ({ savePlaylistAction: vi.fn() }));
vi.mock("@/lib/journal-cache", () => ({
  getPlaylistForOwner: vi.fn(),
  getPlaylistEntries: vi.fn(),
  listEntryChoices: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  requireOwner: async () => ({ user: { id: "owner" } }),
}));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => {
  const push = vi.fn();
  const refresh = vi.fn();
  return { useRouter: () => ({ push, refresh }) };
});

import { PlaylistDialog } from "@/components/journal/playlist-dialog";
import PlaylistPage from "@/app/playlists/[playlistId]/page";
import {
  getPlaylistForOwner,
  getPlaylistEntries,
  listEntryChoices,
} from "@/lib/journal-cache";
import { savePlaylistAction } from "@/app/actions";

const entries = [
  { id: "entry-a", title: "Alpha", topic: "React", youtubeId: "aaa" },
  { id: "entry-b", title: "Beta", topic: "JavaScript", youtubeId: "bbb" },
];

function findButton(title: string) {
  return [...document.querySelectorAll("button")].find(button =>
    button.textContent?.includes(title)
  );
}

function toggle(title: string) {
  act(() => (findButton(title) as HTMLButtonElement).click());
}

function openDialog() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      createElement(PlaylistDialog, { entries, triggerLabel: "New playlist" })
    )
  );
  act(() => (findButton("New playlist") as HTMLButtonElement).click());
}

describe("playlist editor ordering controls", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("selects entries and reorders them through explicit controls", () => {
    openDialog();
    toggle("Alpha");
    toggle("Beta");

    expect(document.body.textContent).toContain("Playlist order");
    expect(document.querySelector("ol li:first-child")!.textContent).toContain(
      "Alpha"
    );

    const moveUp = document.querySelector(
      'button[aria-label="Move Beta up"]'
    ) as HTMLButtonElement;
    act(() => moveUp.click());
    expect(document.querySelector("ol li:first-child")!.textContent).toContain(
      "Beta"
    );
    expect(moveUp.disabled).toBe(true);
  });

  it("removes a selected entry through its accessible control", () => {
    openDialog();
    toggle("Alpha");
    toggle("Beta");

    act(() =>
      (
        document.querySelector(
          'button[aria-label="Remove Alpha from playlist"]'
        ) as HTMLButtonElement
      ).click()
    );
    expect(document.querySelector("ol")!.textContent).not.toContain("Alpha");
    expect(document.querySelector("ol")!.textContent).toContain("Beta");
  });

  it("opens the playlist page's editor with saved description and order and saves changes", async () => {
    vi.mocked(getPlaylistForOwner).mockResolvedValue({
      id: "playlist",
      ownerId: "owner",
      name: "Learning",
      description: "Original",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getPlaylistEntries).mockResolvedValue([entries[1], entries[0]]);
    vi.mocked(listEntryChoices).mockResolvedValue(entries);
    vi.mocked(savePlaylistAction).mockResolvedValue({
      ok: true,
      id: "playlist",
    });
    const page = await PlaylistPage({
      params: Promise.resolve({ playlistId: "playlist" }),
    });
    expect(listEntryChoices).toHaveBeenCalledWith("owner");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(page));
    toggle("Edit playlist");
    const description = document.querySelector<HTMLTextAreaElement>(
      "#playlist-description"
    )!;
    expect(description.value).toBe("Original");
    expect(document.querySelector("ol li:first-child")!.textContent).toContain(
      "Beta"
    );
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )!.set!.call(description, "Updated");
      description.dispatchEvent(new Event("input", { bubbles: true }));
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Move Beta down"]'
        )!
        .click();
    });
    await act(async () => findButton("Save playlist")!.click());
    expect(savePlaylistAction).toHaveBeenCalledWith("playlist", {
      name: "Learning",
      description: "Updated",
      entryIds: ["entry-a", "entry-b"],
    });
    act(() => root.unmount());
    container.remove();
  });
});
