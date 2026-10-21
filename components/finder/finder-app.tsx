"use client";

import { useEffect, useSyncExternalStore } from "react";

import { authClient } from "@/lib/auth-client";

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

/**
 * Server pages read the session from a short-lived signed cookie (Better Auth cookieCache) instead of the
 * database. Server components cannot write cookies, so refresh that cookie from the client in the
 * background (when idle, then every 4 minutes while the tab is visible). Opening an entry then never
 * waits on a session query.
 */
function useSessionCacheWarmer() {
  useEffect(() => {
    const refresh = () => void authClient.getSession().catch(() => undefined);
    const idle = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const first = idle ? idle(refresh, { timeout: 5000 }) : window.setTimeout(refresh, 2000);
    const timer = window.setInterval(() => document.visibilityState === "visible" && refresh(), 4 * 60 * 1000);
    return () => {
      if (!idle) window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
}

/** Desktop gets the macOS Finder workspace; tablet and phone get iOS navigation. */
export function FinderApp({ initial, userName }: { initial: LibraryData; userName: string }) {
  const desktop = useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => null);
  const lib = useLibrary(initial);
  useSessionCacheWarmer();
  if (desktop === null) return <div className="fx fx-desktop" />;
  return desktop ? <MacDesktop lib={lib} userName={userName} /> : <IosHome lib={lib} userName={userName} />;
}
