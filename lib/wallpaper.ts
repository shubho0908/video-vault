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

// CSS paints the saved wallpaper before hydration; React only animates later changes.
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
        localStorage.removeItem(wallStorageKey(k));
        localStorage.removeItem(wallTintKey(k));
      }
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

export function paintedWallpaper(k: WallKind): string {
  const v = document.documentElement.getAttribute(wallAttr(k));
  return isWallId(k, v) ? v : "default";
}

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

// The snapshot does not affect server markup; read stored values immediately to avoid a default-image flash.
export function useWallpaper(k: WallKind): string {
  return useSyncExternalStore(
    subscribe,
    () => read(k),
    () => (typeof document === "undefined" ? "default" : read(k))
  );
}
