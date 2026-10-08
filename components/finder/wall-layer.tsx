"use client";

import { useEffect, useRef, useState } from "react";
import { useWallpaper, wallUrl, type WallKind } from "@/lib/wallpaper";

/**
 * Paints the chosen wallpaper over the CSS default. A new image is decoded off-screen first and only
 * then crossfaded in, so the old wallpaper stays up until the new one can paint (no blackout, no pop-in).
 */
export function WallLayer({ kind }: { kind: WallKind }) {
  const id = useWallpaper(kind);
  const [cur, setCur] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [fade, setFade] = useState(false);
  const token = useRef(0);

  useEffect(() => {
    const big = kind === "mac" ? innerWidth >= 1500 || devicePixelRatio >= 1.5 : devicePixelRatio >= 1.5 || innerWidth >= 500;
    const url = wallUrl(kind, id, big);
    const mine = ++token.current;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!url) {
      // back to the theme default: fade the image out, keep nothing behind it
      setNext(null);
      setFade(false);
      t = setTimeout(() => token.current === mine && setCur(null), 450);
      return () => t && clearTimeout(t);
    }
    const img = new Image();
    img.src = url;
    img.decode().catch(() => undefined).then(() => {
      if (token.current !== mine) return;
      setNext(url);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token.current !== mine) return;
        setFade(true);
        t = setTimeout(() => {
          if (token.current !== mine) return;
          setCur(url);
          setNext(null);
          setFade(false);
        }, 480);
      }));
    });
    return () => t && clearTimeout(t);
  }, [id, kind]);

  const style = (u: string | null, o: number): React.CSSProperties => ({
    position: "absolute", inset: kind === "ios" ? "-4%" : 0, pointerEvents: "none", zIndex: 0,
    background: u ? `url(${u}) center / cover no-repeat` : "none", opacity: o, transition: "opacity .45s ease",
  });
  return (
    <>
      <div aria-hidden style={style(cur, id === "default" ? 0 : 1)} />
      <div aria-hidden style={style(next, fade ? 1 : 0)} />
    </>
  );
}
