// @vitest-environment jsdom
// Static imports required: vi.mock hoisting must intercept app actions before module load.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions", () => ({ savePlaylistAction: vi.fn() }));
vi.mock("next/navigation", () => {
  const push = vi.fn();
  const refresh = vi.fn();
  return { useRouter: () => ({ push, refresh }) };
});

import { PlaylistDialog } from "@/components/journal/playlist-dialog";

const entries = [
  { id: "entry-a", title: "Alpha", topic: "React", youtubeId: "aaa" },
  { id: "entry-b", title: "Beta", topic: "JavaScript", youtubeId: "bbb" },
];

// Dialog content renders into a document.body portal, not the mounted container.
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
});
