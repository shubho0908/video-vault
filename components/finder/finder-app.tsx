"use client";

import { useSyncExternalStore } from "react";

import "./finder.css";
import { IosHome } from "./ios-home";
import { MacDesktop } from "./mac-desktop";
import { useLibrary, type LibraryData } from "./library";

const query = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";
const subscribe = (cb: () => void) => {
  const m = matchMedia(query);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** Desktop gets the macOS Finder workspace; tablet and phone get iOS navigation. */
export function FinderApp({ initial, userName }: { initial: LibraryData; userName: string }) {
  const desktop = useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => null);
  const lib = useLibrary(initial);
  if (desktop === null) return <div className="fx fx-desktop" />;
  return desktop ? <MacDesktop lib={lib} userName={userName} /> : <IosHome lib={lib} userName={userName} />;
}
