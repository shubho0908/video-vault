import { useSyncExternalStore } from "react";

import {
  WALLPAPERS,
  isWallId,
  wallAttr,
  wallCss,
  wallStorageKey,
  wallTintKey,
  wallUrl,
  type WallKind,
} from "@/lib/wallpaper-data";

export * from "@/lib/wallpaper-data";

/*
 * Source of truth: localStorage (read synchronously). The *painted* wallpaper is owned by CSS:
 * the head boot script (lib/wallpaper-boot.ts) publishes the saved choice on <html> before first paint
 * and finder.css maps it onto --fx-wall. React never has to "apply" the saved choice on load, so there is
 * nothing to flash. WallLayer only animates *changes* made while the page is open.
 */
const cache: Partial<Record<WallKind, string>> = {};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const tintOf = (k: WallKind, id: string) => WALLPAPERS[k].find(w => w.id === id)?.tint;

function persistTint(k: WallKind, id: string) {
  try {
    const t = tintOf(k, id);
    if (t) localStorage.setItem(wallTintKey(k), t.join(","));
    else localStorage.removeItem(wallTintKey(k));
  } catch {}
}

function read(k: WallKind): string {
  if (cache[k] === undefined) {
    let v = "default";
    try {
      const s = localStorage.getItem(wallStorageKey(k));
      if (isWallId(k, s)) v = s;
      else if (s) {
        // a wallpaper that no longer exists: heal the store so the boot script stops painting it
        localStorage.removeItem(wallStorageKey(k));
        localStorage.removeItem(wallTintKey(k));
      }
      // choices saved before tints existed: add the tint once so later loads paint instantly
      if (v !== "default" && !localStorage.getItem(wallTintKey(k))) persistTint(k, v);
    } catch {}
    cache[k] = v;
  }
  return cache[k]!;
}

export function setWallpaper(k: WallKind, id: string) {
  if (!isWallId(k, id)) return;
  cache[k] = id;
  try { localStorage.setItem(wallStorageKey(k), id); } catch {}
  persistTint(k, id);
  notify();
}

/** What <html> (and therefore the CSS) is painting right now. */
export function paintedWallpaper(k: WallKind): string {
  const v = document.documentElement.getAttribute(wallAttr(k));
  return isWallId(k, v) ? v : "default";
}

/** Flip the CSS-painted wallpaper. WallLayer calls this once its crossfade has fully covered the old one. */
export function paintWallpaper(k: WallKind, id: string) {
  const el = document.documentElement;
  const url = wallUrl(k, id, innerWidth, devicePixelRatio || 1);
  if (!url) {
    el.removeAttribute(wallAttr(k));
    el.style.removeProperty(`--fx-wall-${k}`);
    return;
  }
  el.setAttribute(wallAttr(k), id);
  el.style.setProperty(`--fx-wall-${k}`, wallCss(url, tintOf(k, id)));
}

let wired = false;
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  // pick up a choice made in another tab
  if (!wired && typeof window !== "undefined") {
    wired = true;
    addEventListener("storage", e => {
      for (const k of ["mac", "ios"] as const) {
        if (e.key === wallStorageKey(k)) {
          delete cache[k];
          notify();
        }
      }
    });
  }
  return () => void listeners.delete(cb);
};

/**
 * The server snapshot only matters for markup comparison during hydration. Nothing rendered from this
 * value in the initial HTML depends on it, so on the client we answer with the real stored value
 * immediately: there is no "default, then the real choice" render pass.
 */
export function useWallpaper(k: WallKind): string {
  return useSyncExternalStore(
    subscribe,
    () => read(k),
    () => (typeof document === "undefined" ? "default" : read(k))
  );
}
