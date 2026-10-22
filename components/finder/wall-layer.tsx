"use client";

import { useEffect, useRef, useState } from "react";

import { paintedWallpaper, paintWallpaper, useWallpaper, wallUrl, type WallKind } from "@/lib/wallpaper";

const FADE = 480;

// Crossfade decoded changes over the CSS wallpaper before updating the underlying image.
export function WallLayer({ kind }: { kind: WallKind }) {
  const id = useWallpaper(kind);
  const [ov, setOv] = useState<{ url: string; shown: boolean } | null>(null);
  const token = useRef(0);
  const latest = useRef(id);
  latest.current = id;

  useEffect(() => {
    const mine = ++token.current;
    const alive = () => token.current === mine;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => void timers.push(setTimeout(() => alive() && fn(), ms));
    const frames = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(() => alive() && fn()));
    const from = paintedWallpaper(kind);

    if (id === from) {
      setOv(o => (o ? { ...o, shown: false } : o));
      later(() => setOv(null), FADE);
      return () => timers.forEach(clearTimeout);
    }

    const dpr = devicePixelRatio || 1;
    if (id === "default") {
      const old = wallUrl(kind, from, innerWidth, dpr)!;
      setOv({ url: old, shown: true });
      frames(() => {
        paintWallpaper(kind, "default");
        setOv({ url: old, shown: false });
        later(() => setOv(null), FADE);
      });
    } else {
      const url = wallUrl(kind, id, innerWidth, dpr)!;
      const img = new Image();
      img.src = url;
      img.decode().catch(() => undefined).then(() => {
        if (!alive()) return;
        setOv({ url, shown: false });
        frames(() => {
          setOv({ url, shown: true });
          later(() => {
            paintWallpaper(kind, id);
            frames(() => setOv(null));
          }, FADE);
        });
      });
    }
    return () => timers.forEach(clearTimeout);
  }, [id, kind]);

  // Persist the CSS wallpaper even if the layout changes mid-crossfade.
  useEffect(() => () => paintWallpaper(kind, latest.current), [kind]);

  if (!ov) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `url(${ov.url}) center / cover no-repeat`,
        opacity: ov.shown ? 1 : 0, transition: "opacity .45s ease",
      }}
    />
  );
}
