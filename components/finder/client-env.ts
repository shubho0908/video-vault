"use client";

import { useSyncExternalStore } from "react";

import { DESKTOP_QUERY } from "@/lib/wallpaper-data";

const subscribe = (cb: () => void) => {
  const m = matchMedia(DESKTOP_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** null before hydration; true for desktop pointer devices, false for touch layouts. */
export const useIsDesktop = () => useSyncExternalStore(subscribe, () => matchMedia(DESKTOP_QUERY).matches, () => null);

export function whenIdle(fn: () => void, timeout = 2000, fallbackMs = 800): () => void {
  const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = setTimeout(fn, fallbackMs);
  return () => clearTimeout(t);
}
