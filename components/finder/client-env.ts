"use client";

import { useSyncExternalStore } from "react";

import { DESKTOP_QUERY } from "@/lib/wallpaper-data";

const subscribe = (cb: () => void) => {
  const m = matchMedia(DESKTOP_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** true: macOS desktop UI, false: iOS UI, null: not known yet (server render / before hydration). */
export const useIsDesktop = () => useSyncExternalStore(subscribe, () => matchMedia(DESKTOP_QUERY).matches, () => null);

/** Run `fn` when the browser is idle (Safari has no requestIdleCallback: fall back to a timer). Returns a cancel function. */
export function whenIdle(fn: () => void, timeout = 2000, fallbackMs = 800): () => void {
  const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = setTimeout(fn, fallbackMs);
  return () => clearTimeout(t);
}
