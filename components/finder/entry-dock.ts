"use client";

import { useSyncExternalStore } from "react";

export type EntryMin = {
  title: string;
  thumb: HTMLElement | null;
  slot: HTMLElement | null;
  slotRect: DOMRect | null;
  restoreRect: DOMRect | null;
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
  requestRestore: (rect: DOMRect) => state && emit({ ...state, restoreRect: rect }),
  leave: () => state && emit({ ...state, thumb: null, leaving: true }),
  clear: () => state && emit(null),
  setWarm: (f: typeof warmHook) => void (warmHook = f),
  warm: (on: boolean) => warmHook?.("out", on),
};
export const useEntryDock = () => useSyncExternalStore(f => (subs.add(f), () => void subs.delete(f)), () => state, () => null);
