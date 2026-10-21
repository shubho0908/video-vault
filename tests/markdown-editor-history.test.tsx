// @vitest-environment jsdom
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/journal/entry-image-upload", () => ({
  uploadEntryImage: vi.fn(),
}));

import { MarkdownEditor } from "@/components/journal/markdown-editor";

let now = 0;
let container: HTMLDivElement;
let root: Root;
let rafCallbacks: FrameRequestCallback[] = [];

function Harness() {
  const [value, setValue] = useState("");
  return createElement(MarkdownEditor, {
    value,
    onChangeAction: setValue,
    entryId: "entry",
  });
}

function textarea() {
  return container.querySelector("textarea") as HTMLTextAreaElement;
}

const setNativeValue = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  "value"
)!.set!;

/** Simulate the browser applying one keystroke: DOM value + caret change, then an input event. */
function type(text: string, at = now) {
  now = at;
  const element = textarea();
  const next = element.value + text;
  act(() => {
    setNativeValue.call(element, next);
    element.setSelectionRange(next.length, next.length);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function click(title: string) {
  const button = container.querySelector(
    `button[title="${title}"]`
  ) as HTMLButtonElement;
  act(() => button.click());
}

function flushFrames() {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  act(() => callbacks.forEach(callback => callback(0)));
}

beforeEach(() => {
  now = 1000;
  rafCallbacks = [];
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(createElement(Harness)));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("markdown editor history", () => {
  it("groups a quick burst of typing into one undo step", () => {
    for (const char of "hello") type(char, now + 50);
    expect(textarea().value).toBe("hello");

    click("Undo (⌘Z)");
    expect(textarea().value).toBe("");
    click("Redo (⌘⇧Z)");
    expect(textarea().value).toBe("hello");
  });

  it("starts a new step after the typing window and on a new line", () => {
    type("a", 1000);
    type("b", 1100);
    type("c", 2000); // ≥ 700 ms after the step began
    type("\n", 2050); // line break always starts a step
    type("d", 2100);

    click("Undo (⌘Z)");
    expect(textarea().value).toBe("abc");
    click("Undo (⌘Z)");
    expect(textarea().value).toBe("ab");
    click("Undo (⌘Z)");
    expect(textarea().value).toBe("");
  });

  it("keeps toolbar edits as their own undo steps", () => {
    type("x", 1000);
    click("Bold (⌘B)"); // caret at the end: inserts the placeholder
    expect(textarea().value).toBe("x**bold text**");

    click("Undo (⌘Z)");
    expect(textarea().value).toBe("x");
    click("Undo (⌘Z)");
    expect(textarea().value).toBe("");
    click("Redo (⌘⇧Z)");
    click("Redo (⌘⇧Z)");
    expect(textarea().value).toBe("x**bold text**");
  });

  it("never schedules a focus/selection restore for plain typing", () => {
    type("a");
    type("b", now + 10);
    expect(rafCallbacks).toHaveLength(0);

    click("Heading 1");
    expect(rafCallbacks).toHaveLength(1);
    const setSelectionRange = vi.spyOn(textarea(), "setSelectionRange");
    flushFrames();
    expect(setSelectionRange).toHaveBeenCalled();
  });

  it("skips the selection restore while an IME composition is active", () => {
    type("a");
    click("Heading 1");
    const setSelectionRange = vi.spyOn(textarea(), "setSelectionRange");
    act(() => {
      textarea().dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true })
      );
    });
    flushFrames();
    expect(setSelectionRange).not.toHaveBeenCalled();
  });

  it("keeps an IME composition in its own undo step, apart from typing before a pause", () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    type("abc");
    // pause longer than a typing step, then compose for a long time
    act(() => {
      textarea().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    });
    type("k", now + 5000);
    type("a", now + 2000);
    act(() => {
      textarea().dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    });
    act(() => vi.runAllTimers());
    type("d", now + 10);
    vi.useRealTimers();

    click("Undo (⌘Z)");
    expect(textarea().value).toBe("abcka");
    click("Undo (⌘Z)");
    expect(textarea().value).toBe("abc");
  });

  it("caps retained history by characters, dropping the oldest steps", () => {
    const chunk = "x".repeat(10_000);
    for (let step = 1; step <= 20; step += 1) type(chunk, step * 1000);
    expect(textarea().value).toHaveLength(200_000);

    // 10k + 20k + … + 200k = 2.1M characters would exceed the ~1M budget, so the oldest snapshots
    // (including the empty note) are gone, but recent steps are still undoable one at a time.
    click("Undo (⌘Z)");
    expect(textarea().value).toHaveLength(190_000);
    for (let step = 0; step < 25; step += 1) click("Undo (⌘Z)");
    expect(textarea().value.length).toBeGreaterThan(0);
  });

  it("runs slash commands from the keyboard as one undoable step", () => {
    type("/");
    type("h", now + 10);
    type("2", now + 10);
    act(() => {
      textarea().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });
    expect(textarea().value).toBe("## ");

    click("Undo (⌘Z)");
    expect(textarea().value).toBe("/h2");
  });
});
