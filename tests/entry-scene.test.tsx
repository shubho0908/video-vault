// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { JournalEntry } from "@/lib/journal";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  minimize: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    back: mocks.back,
    refresh: mocks.refresh,
  }),
}));
vi.mock("@/app/actions", () => ({
  saveEntryAction: mocks.save,
  deleteEntryAction: vi.fn(),
}));
vi.mock("@/components/finder/entry-window", () => ({
  useEntryWindow: () => ({
    min: false,
    size: null,
    minimize: mocks.minimize,
    commit: vi.fn(),
  }),
}));
vi.mock("@/components/journal/image-panel", () => ({ ImagePanel: () => null }));
vi.mock("@/components/journal/markdown-editor", () => ({
  MarkdownEditor: () => null,
}));
vi.mock("@/components/journal/note-markdown", () => ({
  NoteMarkdown: () => null,
}));

import { EntryScene } from "@/components/finder/entry-scene";
import { bus } from "@/components/finder/lib-bus";

let root: Root;
let container: HTMLDivElement;
const entry: JournalEntry = {
  id: "entry",
  ownerId: "owner",
  title: "Original",
  topic: "React",
  youtubeUrl: "https://youtube.com/shorts/dQw4w9WgXcQ",
  youtubeId: "dQw4w9WgXcQ",
  notesMarkdown: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
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
  bus.unpatch(entry.id);
  vi.unstubAllGlobals();
});
function mount(standalone = true) {
  act(() =>
    root.render(
      createElement(EntryScene, { mode: "edit", entry, images: [], standalone })
    )
  );
}
function button(label: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    b => b.textContent === label || b.getAttribute("aria-label") === label
  )!;
}
function editTitle() {
  const input = container.querySelector<HTMLInputElement>("input")!;
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!.call(input, "Edited");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it("allows saving Shorts and disables minimize without a Dock", () => {
  mount();
  expect(button("Save").disabled).toBe(false);
  expect(button("Minimize").disabled).toBe(true);
  act(() => button("Minimize").click());
  expect(mocks.minimize).not.toHaveBeenCalled();
});

it("keeps failed edits and blocks closing while the save is pending", async () => {
  let resolve!: (value: { ok: false; error: string }) => void;
  mocks.save.mockReturnValue(
    new Promise(r => {
      resolve = r;
    })
  );
  mount(false);
  editTitle();
  act(() => button("Save").click());
  expect(mocks.save).toHaveBeenCalledWith(
    "entry",
    expect.objectContaining({ title: "Edited" })
  );
  expect(container.querySelector("fieldset")!.disabled).toBe(true);
  await act(async () => {
    button("Close").click();
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "w", ctrlKey: true })
    );
  });
  expect(mocks.back).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  await act(async () => resolve({ ok: false, error: "Save failed" }));
  expect(container.querySelector<HTMLInputElement>("input")!.value).toBe(
    "Edited"
  );
  expect(container.querySelector('[role="alert"]')!.textContent).toBe(
    "Save failed"
  );
  expect(button("Save").disabled).toBe(false);
  expect(bus.get().patched.entry).toBeUndefined();
});

it("switches to view mode only after the edit succeeds", async () => {
  let resolve!: (value: { ok: true }) => void;
  mocks.save.mockReturnValue(
    new Promise(r => {
      resolve = r;
    })
  );
  mount();
  editTitle();
  act(() => button("Save").click());
  expect(container.querySelector('[data-mode="edit"]')).not.toBeNull();
  await act(async () => resolve({ ok: true }));
  expect(container.querySelector("h1")!.textContent).toBe("Edited");
  expect(mocks.refresh).toHaveBeenCalledOnce();
});
