"use client";

import { useTheme } from "next-themes";
import { setWallpaper, useWallpaper, WALLPAPERS, wallUrl, type WallKind } from "@/lib/wallpaper";

export function WallPicker({ kind }: { kind: WallKind }) {
  const cur = useWallpaper(kind);
  const { resolvedTheme } = useTheme();
  const w = kind === "mac" ? 160 : 90, h = kind === "mac" ? 100 : 160;
  const thumb = (id: string) => {
    if (id !== "default") return wallUrl(kind, id, 0, 1)!;
    // the default follows the theme: show the one that is active
    return `/wp/${kind}-${resolvedTheme === "light" ? "light" : "dark"}-${kind === "mac" ? 1280 : 645}.webp`;
  };
  return (
    <div role="radiogroup" aria-label="Wallpaper" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {WALLPAPERS[kind].map(x => (
        <button key={x.id} role="radio" aria-checked={cur === x.id} className="fx-tile-pick" onClick={() => setWallpaper(kind, x.id)}>
          <span
            className="fx-tile-prev"
            style={{ width: w, height: h, background: `url(${thumb(x.id)}) center / cover no-repeat`, boxShadow: cur === x.id ? "0 0 0 3px var(--fx-accent)" : undefined }}
          />
          <span>{x.name}</span>
        </button>
      ))}
    </div>
  );
}
