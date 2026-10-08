import { useSyncExternalStore } from "react";

export type WallKind = "mac" | "ios";
export type Wall = { id: string; name: string };

/** "default" follows the light/dark theme through CSS (Tahoe on macOS, iOS 26 on iOS); the rest are fixed images in /public/wp. */
export const WALLPAPERS: Record<WallKind, Wall[]> = {
  mac: [
    { id: "default", name: "Tahoe" },
    { id: "sequoia-light", name: "Sequoia Light" },
    { id: "sequoia-dark", name: "Sequoia Dark" },
    { id: "sonoma-light", name: "Sonoma Light" },
    { id: "sonoma-dark", name: "Sonoma Dark" },
  ],
  ios: [
    { id: "default", name: "iOS 26" },
    { id: "rose", name: "Rose" },
    { id: "ember", name: "Ember" },
    { id: "gold", name: "Gold" },
    { id: "sky", name: "Sky" },
    { id: "orchid", name: "Orchid" },
  ],
};

const key = (k: WallKind) => `shubhojeets-videos:wallpaper:${k}`;
const cache: Partial<Record<WallKind, string>> = {};
const listeners = new Set<() => void>();

function read(k: WallKind): string {
  if (cache[k] === undefined) {
    let v = "default";
    try {
      const s = localStorage.getItem(key(k));
      if (s && WALLPAPERS[k].some(w => w.id === s)) v = s;
    } catch {}
    cache[k] = v;
  }
  return cache[k]!;
}

export function setWallpaper(k: WallKind, id: string) {
  cache[k] = id;
  try { localStorage.setItem(key(k), id); } catch {}
  listeners.forEach(l => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/** SSR renders "default"; the stored choice applies after hydration */
export function useWallpaper(k: WallKind): string {
  return useSyncExternalStore(subscribe, () => read(k), () => "default");
}

export function wallUrl(k: WallKind, id: string, big: boolean): string | null {
  if (id === "default") return null;
  const w = k === "mac" ? (big ? 2048 : 1280) : big ? 1290 : 645;
  return `/wp/${k}-${id}-${w}.webp`;
}
