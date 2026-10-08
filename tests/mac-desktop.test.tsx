// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
vi.mock("@/app/actions", () => ({
  createFolderAction: vi.fn(),
  deletePlaylistAction: vi.fn(),
  placeEntryAction: vi.fn(),
  renameFolderAction: vi.fn(),
}));
vi.mock("@/components/finder/wall-layer", () => ({ WallLayer: () => null }));

import { MacDesktop } from "@/components/finder/mac-desktop";
import { Dock, useWindowManager } from "@/components/finder/windows";
import type { useLibrary } from "@/components/finder/library";

let root: Root;
let container: HTMLDivElement;
let frames: Map<number, FrameRequestCallback>;
let frameId: number;
const renameFolder = vi.fn();
const data = {
  entries: [
    { id: "entry", title: "Video", topic: "React", youtubeId: "dQw4w9WgXcQ" },
  ],
  folders: [{ id: "folder", name: "One" }],
  memberships: [],
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  frames = new Map();
  frameId = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(++frameId, cb);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  Element.prototype.animate = vi.fn(() => ({
    finished: Promise.resolve(),
  })) as unknown as typeof Element.prototype.animate;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
function button(label: string) {
  return container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`
  )!;
}
function key(target: HTMLElement, key: string, ctrlKey = false) {
  act(() =>
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, ctrlKey, bubbles: true })
    )
  );
}
function mountDesktop() {
  const lib = {
    data,
    entriesIn: () => data.entries,
    renameFolder,
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    place: vi.fn(),
    error: null,
    clearError: vi.fn(),
  } as unknown as ReturnType<typeof useLibrary>;
  act(() => root.render(createElement(MacDesktop, { lib, userName: "Owner" })));
  act(() => button("Finder").click());
}

it.each(["icons", "list"])(
  "opens focused entries with the keyboard in %s view",
  view => {
    mountDesktop();
    if (view === "list") act(() => button("as List").click());
    const items = container.querySelectorAll<HTMLElement>(
      view === "list" ? ".fx-list tbody tr" : ".fx-grid [role=option]"
    );
    const entry = items[1];
    act(() => entry.focus());
    expect(entry.getAttribute("aria-selected")).toBe("true");
    key(entry, "ArrowDown", true);
    key(entry, "Enter");
    expect(push.mock.calls).toEqual([["/entries/entry"], ["/entries/entry"]]);
    expect(
      container
        .querySelector('a[href="/entries/new"]')!
        .getAttribute("aria-label")
    ).toBe("New Entry");
  }
);

it("renames a folder from its focused list row", () => {
  mountDesktop();
  act(() => button("as List").click());
  const folder = container.querySelector<HTMLElement>(".fx-list tbody tr")!;
  act(() => folder.focus());
  key(folder, "Enter");
  const input = container.querySelector<HTMLInputElement>(
    '[aria-label="Rename folder"]'
  )!;
  expect(document.activeElement).toBe(input);
  input.value = "Renamed";
  key(input, "Enter");
  expect(renameFolder).toHaveBeenCalledWith("folder", "Renamed");
});

it("stops Dock frames when settled and resumes on pointer movement", () => {
  function Probe() {
    return createElement(Dock, { wm: useWindowManager() });
  }
  act(() => root.render(createElement(Probe)));
  const dock = container.querySelector<HTMLElement>(".fx-dock")!;
  const pointer = (type: string, clientX: number) =>
    act(() =>
      dock.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }))
    );
  const settle = () => {
    for (let i = 1; i <= 120 && frames.size; i++)
      act(() => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach(cb => cb(i * 16));
      });
    expect(frames.size).toBe(0);
  };
  pointer("pointerover", 40);
  expect(frames.size).toBe(1);
  settle();
  pointer("pointermove", 120);
  expect(frames.size).toBe(1);
  settle();
  pointer("pointerout", 120);
  settle();
  expect(container.querySelector<HTMLElement>("[data-di]")!.style.width).toBe(
    "54px"
  );
});
