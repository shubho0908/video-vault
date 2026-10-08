"use client";

import { useSyncExternalStore } from "react";

/** The entry window is a route, not a dock app, so its minimized state lives in a tiny store shared with the Dock. */
export type EntryMin = { title: string; thumb: HTMLElement | null; slot: HTMLElement | null; restoreRect: DOMRect | null };
let state: EntryMin | null = null;
const subs = new Set<() => void>();
const emit = (n: EntryMin | null) => { state = n; subs.forEach(f => f()); };

export const entryDock = {
  get: () => state,
  show: (title: string) => emit({ title, thumb: null, slot: null, restoreRect: null }),
  setThumb: (thumb: HTMLElement) => state && emit({ ...state, thumb }),
  setSlot: (slot: HTMLElement | null) => { if (state) state.slot = slot; },
  /** user clicked the dock thumb: the scene animates back from this rect */
  requestRestore: (rect: DOMRect) => state && emit({ ...state, restoreRect: rect }),
  clear: () => state && emit(null),
};
export const useEntryDock = () => useSyncExternalStore(f => (subs.add(f), () => void subs.delete(f)), () => state, () => null);
