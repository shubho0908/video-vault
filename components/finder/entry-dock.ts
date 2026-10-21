"use client";

import { useSyncExternalStore } from "react";

/** The entry window is a route, not a dock app, so its minimized state lives in a tiny store shared with the Dock. */
export type EntryMin = {
  title: string;
  thumb: HTMLElement | null;
  slot: HTMLElement | null;
  /** final slot box, measured when the slot mounts (before it grows in): the genie aims here */
  slotRect: DOMRect | null;
  restoreRect: DOMRect | null;
  /** the window is back out: the empty slot shrinks away, then the store clears */
  leaving: boolean;
};
let state: EntryMin | null = null;
let warmHook: ((dir: "in" | "out", on: boolean) => void) | null = null;
const subs = new Set<() => void>();
const emit = (n: EntryMin | null) => { state = n; subs.forEach(f => f()); };

export const entryDock = {
  get: () => state,
  show: (title: string) => emit({ title, thumb: null, slot: null, slotRect: null, restoreRect: null, leaving: false }),
  setThumb: (thumb: HTMLElement | null) => state && emit({ ...state, thumb }),
  setSlot: (slot: HTMLElement | null) => { if (state) state.slot = slot; },
  setSlotRect: (rect: DOMRect) => { if (state) state.slotRect = rect; },
  /** user clicked the dock thumb: the scene animates back from this rect */
  requestRestore: (rect: DOMRect) => state && emit({ ...state, restoreRect: rect }),
  leave: () => state && emit({ ...state, thumb: null, leaving: true }),
  clear: () => state && emit(null),
  /** the entry window's speculative genie build, used when the pointer rests on its Dock thumbnail */
  setWarm: (f: typeof warmHook) => void (warmHook = f),
  warm: (on: boolean) => warmHook?.("out", on),
};
export const useEntryDock = () => useSyncExternalStore(f => (subs.add(f), () => void subs.delete(f)), () => state, () => null);
